import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { hasGroqKey, callGroq, streamGroq } from '../shared/groq.helper';

interface ToolArgs {
  title?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  estimatedMinutes?: string;
  dueDate?: string;
  startTime?: string;
  endTime?: string;
  type?: 'TASK' | 'FOCUS' | 'BREAK' | 'MANUAL';
  rationale?: string;
}

const TOOLS = [
  { type: 'function', function: { name: 'create_task', description: 'Create a new task.', parameters: { type: 'object', properties: { title: { type: 'string' }, priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] }, estimatedMinutes: { type: 'string' }, dueDate: { type: 'string', description: 'YYYY-MM-DD' } }, required: ['title'] } } },
  { type: 'function', function: { name: 'list_tasks', description: 'List open tasks.', parameters: { type: 'object', properties: {}, required: [] } } },
  { type: 'function', function: { name: 'schedule_calendar_event', description: 'Schedule a calendar event.', parameters: { type: 'object', properties: { startTime: { type: 'string' }, endTime: { type: 'string' }, type: { type: 'string', enum: ['TASK', 'FOCUS', 'BREAK', 'MANUAL'] }, rationale: { type: 'string' } }, required: ['startTime', 'endTime'] } } },
];

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);
  constructor(private readonly prisma: PrismaService) {}

  async history(userId: string) {
    const conv = await this.prisma.conversation.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' }, include: { messages: { orderBy: { createdAt: 'asc' }, take: 50 } } });
    return conv?.messages ?? [];
  }

  async buildPrompt(userId: string) {
    const [settings, openTasks] = await Promise.all([
      this.prisma.userSettings.findUnique({ where: { userId } }),
      this.prisma.task.findMany({ where: { userId, status: { in: ['PENDING', 'IN_PROGRESS'] } }, orderBy: { createdAt: 'desc' }, take: 10 }),
    ]);
    const system = `You are Focussive, a friendly AI productivity assistant. Be concise and actionable.\nYou have tools to create tasks, list tasks, and schedule calendar events.\nIMPORTANT: When the user asks you to add/create a task, you MUST call the create_task tool. Do NOT just say you added it.\nWhen the user asks about their tasks or to-do list, you MUST call the list_tasks tool to get fresh data.\nWhen the user wants to schedule something, use schedule_calendar_event.\nAlways use tools for actions — never pretend to have done something without calling the tool.\nAssistant personality: ${settings?.assistantPersonality ?? 'balanced'}.\nWork hours: ${settings?.workStartHour ?? 9}:00 to ${settings?.workEndHour ?? 18}:00.\nCurrent open tasks: ${openTasks.map(t => `"${t.title}" (${t.priority.toLowerCase()}, ${t.status.toLowerCase()})`).join(', ') || 'none'}.\nCurrent date/time: ${new Date().toISOString()}.`;
    return [{ role: 'system', content: system }];
  }

  async converse(userId: string, content: string, conversationId: string | undefined, res: any): Promise<void> {
    // Phase 1: DB operations BEFORE starting SSE stream
    let conv;
    try {
      conv = await this.getOrCreateConversation(userId, conversationId);
      await this.prisma.message.create({ data: { conversationId: conv.id, sender: 'USER', content } });
    } catch (err) {
      this.logger.error(`Failed to create conversation/message: ${(err as Error).message}`);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Failed to start conversation' });
      }
      return;
    }

    // Phase 2: Start SSE stream
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Send conversationId so frontend can track it
    res.write(`data: ${JSON.stringify({ conversationId: conv.id })}\n\n`);

    const dbHistory = await this.prisma.message.findMany({ where: { conversationId: conv.id }, orderBy: { createdAt: 'asc' } });
    const prompt = await this.buildPrompt(userId);
    const messages: any[] = [...prompt, ...dbHistory.map(m => ({ role: m.sender === 'USER' ? 'user' : 'assistant', content: m.content }))];
    let reply = '';
    try {
      if (hasGroqKey()) {
        const initial = await callGroq({ messages, tools: TOOLS });
        const msg = initial.choices?.[0]?.message;
        if (msg?.tool_calls?.length) {
          messages.push({ role: 'assistant', content: msg.content, tool_calls: msg.tool_calls });
          for (const tc of msg.tool_calls) {
            messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(await this.executeTool(userId, tc)) });
          }
          reply = await streamGroq({ messages, onToken: t => res.write(`data: ${JSON.stringify({ token: t })}\n\n`) });
        } else {
          reply = msg?.content ?? '';
          if (reply) res.write(`data: ${JSON.stringify({ token: reply })}\n\n`);
        }
      } else {
        reply = this.fallbackReply(content);
        res.write(`data: ${JSON.stringify({ token: reply })}\n\n`);
      }
    } catch (err) {
      this.logger.warn(`Groq failed: ${(err as Error).message}`);
      reply = this.fallbackReply(content);
      res.write(`data: ${JSON.stringify({ token: reply })}\n\n`);
    } finally {
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    }

    // Save AI reply to DB (fire-and-forget, don't block response)
    try {
      await this.prisma.message.create({ data: { conversationId: conv.id, sender: 'AI', content: reply } });
    } catch (err) {
      this.logger.warn(`Failed to save AI reply: ${(err as Error).message}`);
    }
  }

  private async executeTool(userId: string, toolCall: any) {
    const name = toolCall.function.name;
    let args: any = {}; try { args = JSON.parse(toolCall.function.arguments); } catch { return { error: 'Invalid tool arguments' }; }
    this.logger.log(`Executing tool: ${name} with args: ${JSON.stringify(args)}`);
    switch (name) {
      case 'create_task': {
        const estMin = args.estimatedMinutes ? Number(args.estimatedMinutes) : undefined;
        const task = await this.prisma.task.create({ data: { userId, title: args.title?.trim() ?? 'Untitled task', priority: args.priority ?? 'MEDIUM', estimatedMinutes: estMin && !isNaN(estMin) ? estMin : undefined, dueDate: args.dueDate ? new Date(args.dueDate) : undefined } });
        return { success: true, task: { id: task.id, title: task.title, priority: task.priority, status: task.status } };
      }
      case 'list_tasks': {
        const tasks = await this.prisma.task.findMany({ where: { userId, status: { in: ['PENDING', 'IN_PROGRESS'] } }, orderBy: { createdAt: 'desc' }, take: 20 });
        return { count: tasks.length, tasks: tasks.map(t => ({ title: t.title, priority: t.priority, status: t.status, dueDate: t.dueDate?.toISOString(), estimatedMinutes: t.estimatedMinutes })) };
      }
      case 'schedule_calendar_event': {
        const start = new Date(args.startTime ?? ''), end = new Date(args.endTime ?? '');
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return { error: 'Invalid start/end time' };
        const event = await this.prisma.calendarEvent.create({ data: { userId, startTime: start, endTime: end, type: args.type ?? 'MANUAL', rationale: args.rationale ?? 'Scheduled via AI assistant' } });
        return { success: true, event: { id: event.id, type: event.type, startTime: event.startTime, endTime: event.endTime } };
      }
      default: return { error: `Unknown tool: ${name}` };
    }
  }

  private async getOrCreateConversation(userId: string, cid?: string) {
    if (cid) { const e = await this.prisma.conversation.findFirst({ where: { id: cid, userId } }); if (e) return e; }
    return this.prisma.conversation.create({ data: { userId } });
  }

  private fallbackReply(c: string): string {
    const l = c.toLowerCase();

    // Check if attachments are included in the prompt payload
    if (c.includes('--- ATTACHMENTS ---') || c.includes('Extracted Content:') || c.includes('[Attached File:')) {
      const match = c.match(/📄 \[Attached File: "(.*?)"\][\s\S]*?Extracted Content:\s*([\s\S]*)/i);
      const fileName = match ? match[1] : 'Attached Document';
      let docText = match ? match[2].trim() : c;

      // Clean prompt header if leftover
      docText = docText.replace(/Please inspect and analyze the following attachments:[\s\S]*/, '').trim();

      if (docText.length > 0) {
        const words = docText.split(/\s+/).filter(Boolean);
        const lines = docText.split('\n').map(line => line.trim()).filter(Boolean);
        const keyLines = lines.slice(0, 8).join('\n• ');

        return `📄 **Summary & Document Overview for "${fileName}"**\n\n` +
          `• **Total Words:** ${words.length}\n` +
          `• **Preview / Key Excerpts:**\n• ${keyLines}\n\n` +
          `*(Note: Full LLM reasoning is available when a GROQ_API_KEY is configured in backend/.env)*`;
      }
      return `I received "${fileName}", but could not extract readable text from it. Please ensure it's a valid document.`;
    }

    if (/(add|create|new) (a )?task/.test(l)) return `I'll add that task. Add GROQ_API_KEY to enable AI.`;
    if (/(break down|micro.?step|decompose)/.test(l)) return `Micro-stepping: tasks over 120 min auto-decompose into 15-min steps.`;
    return `I am your AI assistant. Type a message or upload a document (PDF, Word, PPT) to get started! (Add GROQ_API_KEY to backend/.env for full LLM responses)`;
  }
}