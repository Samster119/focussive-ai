import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export class CreateEventDto { startTime!: string; endTime!: string; type?: 'TASK' | 'FOCUS' | 'BREAK' | 'MANUAL'; taskId?: string; rationale?: string; isFixed?: boolean; }
export class UpdateEventDto { startTime?: string; endTime?: string; type?: 'TASK' | 'FOCUS' | 'BREAK' | 'MANUAL'; rationale?: string; isFixed?: boolean; }

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, start?: string, end?: string) {
    const where: any = { userId };
    if (start || end) { where.OR = []; if (start) where.OR.push({ endTime: { gte: new Date(start) } }); if (end) where.OR.push({ startTime: { lte: new Date(end) } }); }
    return this.prisma.calendarEvent.findMany({ where, orderBy: { startTime: 'asc' } });
  }

  async create(userId: string, dto: CreateEventDto) {
    const start = new Date(dto.startTime), end = new Date(dto.endTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) throw new BadRequestException('Invalid startTime/endTime');
    if (end <= start) throw new BadRequestException('endTime must be after startTime');
    if (dto.taskId) { const task = await this.prisma.task.findFirst({ where: { id: dto.taskId, userId } }); if (!task) throw new NotFoundException('Task not found'); }
    return this.prisma.calendarEvent.create({ data: { userId, startTime: start, endTime: end, type: dto.type ?? 'MANUAL', taskId: dto.taskId, rationale: dto.rationale, isFixed: dto.isFixed ?? false } });
  }

  async update(userId: string, id: string, dto: UpdateEventDto) {
    const event = await this.prisma.calendarEvent.findFirst({ where: { id, userId } });
    if (!event) throw new NotFoundException('Event not found');
    return this.prisma.calendarEvent.update({ where: { id }, data: { startTime: dto.startTime ? new Date(dto.startTime) : undefined, endTime: dto.endTime ? new Date(dto.endTime) : undefined, type: dto.type, rationale: dto.rationale, isFixed: dto.isFixed } });
  }

  async remove(userId: string, id: string) {
    const event = await this.prisma.calendarEvent.findFirst({ where: { id, userId } });
    if (!event) throw new NotFoundException('Event not found');
    await this.prisma.calendarEvent.delete({ where: { id } });
    return { deleted: true };
  }

  async autoSchedule(userId: string) {
    const settings = await this.prisma.userSettings.findUnique({ where: { userId } });
    const workStart = settings?.workStartHour ?? 9;
    const workEnd = settings?.workEndHour ?? 18;
    const tasks = await this.prisma.task.findMany({ where: { userId, status: { in: ['PENDING', 'IN_PROGRESS'] }, parentTaskId: null, calendarEvent: null }, orderBy: { priority: 'desc' } });
    if (tasks.length === 0) return [];

    const existing = await this.prisma.calendarEvent.findMany({ where: { userId, isFixed: true } });
    const busy = existing.map(e => ({ start: e.startTime, end: e.endTime }));

    const created: Array<{ eventId: string; taskId: string; rationale: string }> = [];
    let cursor = new Date(); cursor.setHours(workStart, 0, 0, 0);

    for (const task of tasks) {
      const minutes = task.estimatedMinutes ?? 30;
      let slot = this.nextFreeSlot(cursor, minutes, workStart, workEnd, busy);
      if (!slot) { cursor.setDate(cursor.getDate() + 1); cursor.setHours(workStart, 0, 0, 0); slot = this.nextFreeSlot(cursor, minutes, workStart, workEnd, busy); }
      if (!slot) continue;
      const rationale = `Task "${task.title}" auto-scheduled (${task.priority.toLowerCase()} priority).`;
      const event = await this.prisma.calendarEvent.create({ data: { userId, taskId: task.id, startTime: slot.start, endTime: slot.end, type: 'TASK', rationale } });
      busy.push({ start: slot.start, end: slot.end });
      created.push({ eventId: event.id, taskId: task.id, rationale });
      cursor = slot.end;
    }
    return created;
  }

  private nextFreeSlot(from: Date, minutes: number, workStart: number, workEnd: number, busy: { start: Date; end: Date }[]) {
    let start = new Date(from);
    for (let day = 0; day < 14; day++) {
      let candidate = new Date(start);
      while (candidate.getHours() < workEnd) {
        if (candidate.getHours() < workStart) { candidate.setHours(workStart, 0, 0, 0); continue; }
        const end = new Date(candidate.getTime() + minutes * 60000);
        if (end > new Date(candidate.setHours(workEnd, 0, 0, 0))) break;
        if (!busy.some(b => candidate < b.end && end > b.start)) return { start: new Date(candidate), end };
        candidate = new Date(end.getTime());
      }
      start.setDate(start.getDate() + 1);
      start.setHours(workStart, 0, 0, 0);
    }
    return null;
  }
}