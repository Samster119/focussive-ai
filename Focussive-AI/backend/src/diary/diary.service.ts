import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { hasGeminiKey, callGemini } from '../shared/gemini.helper';

@Injectable()
export class DiaryService {
  private readonly logger = new Logger(DiaryService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getDiaryEntries(userId: string) {
    return this.prisma.dailyDiary.findMany({ where: { userId }, orderBy: { date: 'desc' }, take: 10 });
  }

  async generateDiary(userId: string, dateStr: string) {
    const targetDate = new Date(dateStr);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const [tasks, sessions, burnoutLogs] = await Promise.all([
      this.prisma.task.findMany({ where: { userId, createdAt: { gte: startOfDay, lte: endOfDay } } }),
      this.prisma.focusSession.findMany({ where: { userId, completedAt: { gte: startOfDay, lte: endOfDay } } }),
      this.prisma.burnoutLog.findMany({ where: { userId, loggedAt: { gte: startOfDay, lte: endOfDay } }, orderBy: { loggedAt: 'desc' }, take: 1 }),
    ]);

    const completedTasks = tasks.filter(t => t.status === 'COMPLETED');
    const focusTime = sessions.reduce((acc, s) => acc + s.durationMinutes, 0);
    const burnoutLevel = burnoutLogs[0]?.calculatedScore ?? 0;

    let summary = `(Offline Mode) You completed ${completedTasks.length} tasks and focused for ${focusTime} minutes today.`;
    if (hasGeminiKey()) {
      try {
        const prompt = `You are an empathetic AI journaling assistant.\nWrite a short, reflective 3-4 sentence diary entry summarizing the user's day based on these stats:\n- Tasks Completed: ${completedTasks.length} (out of ${tasks.length} touched today)\n- Focus Time: ${focusTime} minutes\n- Burnout Level (0-100): ${burnoutLevel}\n\nTone: Encouraging but realistic. Output ONLY the diary entry text, no markdown.`;
        const data = await callGemini({ messages: [{ role: 'system', content: prompt }], temperature: 0.7 });
        summary = data.choices[0].message.content.trim();
      } catch (e) {
        this.logger.error(e);
      }
    }

    return this.prisma.dailyDiary.upsert({
      where: { userId_date: { userId, date: startOfDay } },
      create: { userId, date: startOfDay, generatedSummary: summary },
      update: { generatedSummary: summary },
    });
  }
}