import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TaskStatus } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getWeeklyReport(userId: string) {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const [tasks, focusSessions] = await Promise.all([
      this.prisma.task.findMany({
        where: {
          userId,
          status: TaskStatus.COMPLETED,
          createdAt: { gte: start, lte: end },
        },
      }),
      this.prisma.focusSession.findMany({
        where: {
          userId,
          completedAt: { gte: start, lte: end },
        },
      }),
    ]);

    const dailyDataMap = new Map<string, { date: string; tasksCompleted: number; focusMinutes: number }>();
    
    for (let i = 0; i <= 6; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      dailyDataMap.set(dateStr, {
        date: dateStr,
        tasksCompleted: 0,
        focusMinutes: 0,
      });
    }

    let totalTasks = 0;
    let totalFocusMinutes = 0;

    tasks.forEach(t => {
      // Use dueDate if available, otherwise createdAt as a proxy for completedAt
      const refDate = t.dueDate ? t.dueDate : t.createdAt;
      const dateStr = refDate.toISOString().split('T')[0];
      if (dailyDataMap.has(dateStr)) {
        dailyDataMap.get(dateStr)!.tasksCompleted++;
      } else {
        // If it falls outside the exact boundaries due to timezone differences, map it to the closest day or ignore.
        // For simplicity, we just add it to the total if it's not in the map.
      }
      totalTasks++;
    });

    focusSessions.forEach(f => {
      const dateStr = f.completedAt.toISOString().split('T')[0];
      if (dailyDataMap.has(dateStr)) {
        dailyDataMap.get(dateStr)!.focusMinutes += f.durationMinutes;
      }
      totalFocusMinutes += f.durationMinutes;
    });

    return {
      dateRange: { start: start.toISOString(), end: end.toISOString() },
      dailyData: Array.from(dailyDataMap.values()),
      totalTasks,
      totalFocusMinutes,
    };
  }
}
