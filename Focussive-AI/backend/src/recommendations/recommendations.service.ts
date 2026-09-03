import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { hasGeminiKey, callGemini } from '../shared/gemini.helper';

export interface RecommendationItem { title: string; description: string; icon: string; }

@Injectable()
export class RecommendationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getRecommendations(userId: string): Promise<RecommendationItem[]> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayOfWeek = now.getDay();

    const [allTasks, calendarEvents, timetableBlocks, burnoutLog, settings] = await Promise.all([
      this.prisma.task.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      this.prisma.calendarEvent.findMany({ where: { userId, startTime: { gte: startOfDay } }, include: { task: true }, orderBy: { startTime: 'asc' } }),
      this.prisma.timetableBlock.findMany({ where: { userId, dayOfWeek } }),
      this.prisma.burnoutLog.findFirst({ where: { userId }, orderBy: { loggedAt: 'desc' } }),
      this.prisma.userSettings.findUnique({ where: { userId } }),
    ]);

    const pendingTasks = allTasks.filter(t => t.status === 'PENDING' || t.status === 'IN_PROGRESS');
    const overdueTasks = pendingTasks.filter(t => t.dueDate && new Date(t.dueDate) < now);
    const urgentTasks = pendingTasks.filter(t => t.priority === 'URGENT' || t.priority === 'HIGH');
    const postponedTasks = pendingTasks.filter(t => t.postponementCount >= 2 || (t.estimatedMinutes && t.estimatedMinutes >= 60));
    const burnoutScore = burnoutLog?.calculatedScore ?? 0;
    const burnoutThreshold = settings?.burnoutThresholdScore ?? 75.0;

    const fallback = this.buildDataDrivenRecommendations({ pendingTasks, overdueTasks, urgentTasks, postponedTasks, calendarEvents, timetableBlocks, burnoutScore, burnoutThreshold });
    if (!hasGeminiKey()) return fallback;

    const systemPrompt = `You are an AI productivity coach for Focussive AI.\nGenerate exactly 3 personalized, actionable recommendations based on REAL-TIME DATA.\nFormat: JSON object with key 'recommendations' array of objects with 'title' (max 6 words), 'description' (1-2 sentences), 'icon' (Material Symbols name).\n\nUser Data:\n- Overdue (${overdueTasks.length}): ${overdueTasks.slice(0, 3).map(t => `"${t.title}"`).join('; ') || 'None'}\n- Urgent (${urgentTasks.length}): ${urgentTasks.slice(0, 3).map(t => `"${t.title}"`).join('; ') || 'None'}\n- Pending: ${pendingTasks.length}\n- Events Today: ${calendarEvents.length}\n- Burnout: ${burnoutScore.toFixed(1)}/${burnoutThreshold}`;

    try {
      const data = await callGemini({ messages: [{ role: 'system', content: systemPrompt }], temperature: 0.5 });
      const parsed = JSON.parse(data.choices[0]?.message?.content);
      if (Array.isArray(parsed)) return parsed.slice(0, 3);
      if (parsed.recommendations && Array.isArray(parsed.recommendations)) return parsed.recommendations.slice(0, 3);
      return fallback;
    } catch {
      return fallback;
    }
  }

  private buildDataDrivenRecommendations(data: any): RecommendationItem[] {
    const list: RecommendationItem[] = [];
    if (data.overdueTasks.length > 0) list.push({ title: `Overdue: ${data.overdueTasks[0].title}`, description: `This ${data.overdueTasks[0].priority.toLowerCase()} priority task needs attention.`, icon: 'warning' });
    if (data.burnoutScore >= data.burnoutThreshold) list.push({ title: `High Burnout (${data.burnoutScore.toFixed(0)})`, description: 'Workload density is high. Take a break.', icon: 'local_fire_department' });
    if (data.urgentTasks.length > 0) list.push({ title: `Focus: ${data.urgentTasks[0].title}`, description: `Marked ${data.urgentTasks[0].priority} priority.`, icon: 'bolt' });
    if (data.postponedTasks.length > 0) list.push({ title: `Micro-step: ${data.postponedTasks[0].title}`, description: `Postponed ${data.postponedTasks[0].postponementCount || 1}x.`, icon: 'auto_awesome' });
    if (data.calendarEvents.length > 0) list.push({ title: `Upcoming: ${data.calendarEvents[0].task?.title || data.calendarEvents[0].type}`, description: 'Scheduled today.', icon: 'calendar_today' });
    if (data.timetableBlocks.length > 0) list.push({ title: `Timetable: ${data.timetableBlocks[0].activityType}`, description: `${data.timetableBlocks[0].startTime}-${data.timetableBlocks[0].endTime}.`, icon: 'schedule' });
    if (list.length < 3) {
      if (data.pendingTasks.length === 0) list.push({ title: 'All Tasks Completed!', description: 'Queue cleared.', icon: 'task_alt' });
      else list.push({ title: `Next: ${data.pendingTasks[0].title}`, description: 'Open Tasks to track progress.', icon: 'checklist' });
    }
    return list.slice(0, 3);
  }
}