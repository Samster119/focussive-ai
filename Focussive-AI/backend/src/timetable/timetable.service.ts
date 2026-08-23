import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export class RegenerateDto { date!: string; energyLevel!: 'LOW' | 'MEDIUM' | 'HIGH'; }
export class UpdateBlockDto { startTime?: string; endTime?: string; activityType?: string; }
export class ReorderBlocksDto { date!: string; blockIds!: string[]; }

// Energy-based configuration
const ENERGY_CONFIG = {
  LOW:    { focusMin: 25, focusMax: 25, breakMin: 5,  breakMax: 5,  maxBlocks: 3  },
  MEDIUM: { focusMin: 45, focusMax: 45, breakMin: 10, breakMax: 10, maxBlocks: 6  },
  HIGH:   { focusMin: 60, focusMax: 90, breakMin: 15, breakMax: 15, maxBlocks: 10 },
};

@Injectable()
export class TimetableService {
  constructor(private readonly prisma: PrismaService) {}

  async getForDate(userId: string, date: string) {
    const dayOfWeek = new Date(date).getDay();
    return this.prisma.timetableBlock.findMany({ 
      where: { userId, dayOfWeek }, 
      orderBy: { startTime: 'asc' },
    });
  }

  async regenerate(userId: string, dto: RegenerateDto) {
    const dayOfWeek = new Date(dto.date).getDay();
    await this.prisma.timetableBlock.deleteMany({ where: { userId, dayOfWeek } });

    const settings = await this.prisma.userSettings.findUnique({ where: { userId } });
    const startHour = settings?.workStartHour ?? 9;
    const endHour = settings?.workEndHour ?? 18;
    const config = ENERGY_CONFIG[dto.energyLevel];

    // Fetch pending and overdue tasks for user
    const tasks = await this.prisma.task.findMany({
      where: { userId, status: { in: ['PENDING', 'IN_PROGRESS'] }, parentTaskId: null },
    });

    // Sort by priority and overdue status
    const PRIORITY_SCORE = { URGENT: 400, HIGH: 300, MEDIUM: 200, LOW: 100 };
    const now = new Date();
    const sortedTasks = [...tasks].sort((a, b) => {
      const aOverdue = a.dueDate && new Date(a.dueDate) < now ? 1000 : 0;
      const bOverdue = b.dueDate && new Date(b.dueDate) < now ? 1000 : 0;
      return (bOverdue + (PRIORITY_SCORE[b.priority] || 0)) - (aOverdue + (PRIORITY_SCORE[a.priority] || 0));
    });

    const startMin = startHour * 60;
    const endMin = endHour * 60;
    let currentMin = startMin;
    const blocksData: any[] = [];
    let blockCount = 0;

    for (const task of sortedTasks) {
      if (currentMin >= endMin || blockCount >= config.maxBlocks) break;
      
      // Focus session for this task
      let focusDuration = task.estimatedMinutes && task.estimatedMinutes > 0 
        ? Math.min(Math.max(task.estimatedMinutes, config.focusMin), config.focusMax)
        : config.focusMin;
      
      let eMin = currentMin + focusDuration;
      if (eMin > endMin) eMin = endMin;
      blocksData.push({ 
        userId, 
        dayOfWeek, 
        startTime: this.formatMin(currentMin), 
        endTime: this.formatMin(eMin), 
        activityType: 'FOCUS',
        taskId: task.id,
      });
      currentMin = eMin;
      blockCount++;
      
      if (currentMin >= endMin || blockCount >= config.maxBlocks) break;
      
      // Break after focus session
      const breakDuration = config.breakMin;
      eMin = currentMin + breakDuration;
      if (eMin > endMin) eMin = endMin;
      blocksData.push({ 
        userId, 
        dayOfWeek, 
        startTime: this.formatMin(currentMin), 
        endTime: this.formatMin(eMin), 
        activityType: 'BREAK' 
      });
      currentMin = eMin;
      blockCount++;
    }

    // Fill remaining time if we haven't reached max blocks
    while (currentMin < endMin && blockCount < config.maxBlocks) {
      let eMin = currentMin + config.focusMin;
      if (eMin > endMin) eMin = endMin;
      blocksData.push({ userId, dayOfWeek, startTime: this.formatMin(currentMin), endTime: this.formatMin(eMin), activityType: 'FOCUS' });
      currentMin = eMin;
      blockCount++;
      
      if (currentMin >= endMin || blockCount >= config.maxBlocks) break;
      
      eMin = currentMin + config.breakMin;
      if (eMin > endMin) eMin = endMin;
      blocksData.push({ userId, dayOfWeek, startTime: this.formatMin(currentMin), endTime: this.formatMin(eMin), activityType: 'BREAK' });
      currentMin = eMin;
      blockCount++;
    }

    if (blocksData.length > 0) await this.prisma.timetableBlock.createMany({ data: blocksData });
    return this.getForDate(userId, dto.date);
  }

  async reorderBlocks(userId: string, dto: { date: string; blockIds: string[] }) {
    const dayOfWeek = new Date(dto.date).getDay();
    const existing = await this.prisma.timetableBlock.findMany({ where: { userId, dayOfWeek } });
    const blockMap = new Map(existing.map(b => [b.id, b]));
    let currentMin = 540;
    if (existing.length > 0) { const [h, m] = existing[0].startTime.split(':').map(Number); currentMin = h * 60 + m; }
    for (const id of dto.blockIds) {
      const block = blockMap.get(id); if (!block) continue;
      const [sh, sm] = block.startTime.split(':').map(Number);
      const [eh, em] = block.endTime.split(':').map(Number);
      const duration = Math.max(10, (eh * 60 + em) - (sh * 60 + sm));
      await this.prisma.timetableBlock.update({ where: { id: block.id }, data: { startTime: this.formatMin(currentMin), endTime: this.formatMin(currentMin + duration) } });
      currentMin += duration;
    }
    return this.getForDate(userId, dto.date);
  }

  async updateBlock(userId: string, id: string, dto: { startTime?: string; endTime?: string; activityType?: string }) {
    const block = await this.prisma.timetableBlock.findFirst({ where: { id, userId } });
    if (!block) throw new NotFoundException('Block not found');
    return this.prisma.timetableBlock.update({ where: { id }, data: { startTime: dto.startTime, endTime: dto.endTime, activityType: dto.activityType } });
  }

  async createBlock(userId: string, data: { dayOfWeek: number; startTime: string; endTime: string; activityType: string }) {
    return this.prisma.timetableBlock.create({ data: { userId, dayOfWeek: data.dayOfWeek, startTime: data.startTime, endTime: data.endTime, activityType: data.activityType } });
  }

  async deleteBlock(userId: string, id: string) {
    const block = await this.prisma.timetableBlock.findFirst({ where: { id, userId } });
    if (!block) throw new NotFoundException('Block not found');
    return this.prisma.timetableBlock.delete({ where: { id } });
  }

  private formatMin(m: number): string { const h = Math.floor(m / 60); const min = m % 60; return `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`; }
}