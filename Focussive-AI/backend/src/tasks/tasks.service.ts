import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { decomposeTask, shouldDecompose } from '../algorithms/microstep';

export class CreateTaskDto {
  title!: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  estimatedMinutes?: number;
  dueDate?: string;
  parentTaskId?: string;
}

export class UpdateTaskDto {
  title?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';
  estimatedMinutes?: number;
  dueDate?: string;
  schedulingRationale?: string;
}

const VALID_STATUS = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED'];
const VALID_PRIORITY = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, filter?: string) {
    const where: Record<string, unknown> = { userId };
    const now = new Date();
    if (filter === 'done') where.status = 'COMPLETED';
    if (filter === 'pending') where.status = { in: ['PENDING', 'IN_PROGRESS'] };
    if (filter === 'overdue') {
      where.status = { notIn: ['COMPLETED', 'ARCHIVED'] };
      where.dueDate = { lt: now };
    }
    if (filter === 'archived') {
      where.status = 'ARCHIVED';
    } else {
      where.status = where.status ?? { not: 'ARCHIVED' };
    }

    return this.prisma.task.findMany({
      where,
      include: { subTasks: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(userId: string, dto: CreateTaskDto) {
    if (!dto.title?.trim()) throw new BadRequestException('Title is required');
    if (!dto.dueDate) throw new BadRequestException('Due date & time is required');
    if (!dto.estimatedMinutes || dto.estimatedMinutes <= 0) {
      throw new BadRequestException('Estimated duration (minutes) is required');
    }
    return this.prisma.task.create({
      data: {
        userId,
        title: dto.title.trim(),
        priority: dto.priority ?? 'MEDIUM',
        estimatedMinutes: dto.estimatedMinutes,
        dueDate: new Date(dto.dueDate),
        parentTaskId: dto.parentTaskId,
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateTaskDto) {
    const task = await this.prisma.task.findFirst({ where: { id, userId } });
    if (!task) throw new NotFoundException('Task not found');
    if (dto.status && !VALID_STATUS.includes(dto.status)) {
      throw new BadRequestException('Invalid status');
    }
    if (dto.priority && !VALID_PRIORITY.includes(dto.priority)) {
      throw new BadRequestException('Invalid priority');
    }
    if (dto.title !== undefined && !dto.title.trim()) {
      throw new BadRequestException('Title cannot be empty');
    }
    if (dto.dueDate !== undefined && !dto.dueDate) {
      throw new BadRequestException('Due date & time cannot be empty');
    }
    if (dto.estimatedMinutes !== undefined && (!dto.estimatedMinutes || dto.estimatedMinutes <= 0)) {
      throw new BadRequestException('Estimated duration must be greater than 0');
    }
    const updated = await this.prisma.task.update({
      where: { id },
      data: {
        title: dto.title?.trim(),
        priority: dto.priority,
        status: dto.status,
        estimatedMinutes: dto.estimatedMinutes,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        schedulingRationale: dto.schedulingRationale,
      },
    });
    if (updated.status === 'COMPLETED') {
      await this.completeChildren(updated.id);
    }
    return updated;
  }

  async remove(userId: string, id: string) {
    const task = await this.prisma.task.findFirst({ where: { id, userId } });
    if (!task) throw new NotFoundException('Task not found');
    await this.prisma.task.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });
    return { archived: true, id };
  }

  async microStep(userId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, userId },
    });
    if (!task) throw new NotFoundException('Task not found');
    if (task.parentTaskId) {
      throw new BadRequestException('Cannot micro-step a sub-task');
    }
    const minutes = task.estimatedMinutes ?? 60;
    const steps = decomposeTask(minutes);
    const subTasks = await this.prisma.$transaction(
      steps.map((step) =>
        this.prisma.task.create({
          data: {
            userId,
            title: `${task.title} — ${step.rationale}`,
            estimatedMinutes: step.minutes,
            parentTaskId: task.id,
            priority: task.priority,
            schedulingRationale: step.rationale,
          },
        }),
      ),
    );
    if (shouldDecompose(minutes, task.postponementCount)) {
      await this.prisma.task.update({
        where: { id: task.id },
        data: { status: 'IN_PROGRESS' },
      });
    }
    return { parentTaskId: task.id, subSteps: subTasks };
  }

  private async completeChildren(parentId: string) {
    await this.prisma.task.updateMany({
      where: { parentTaskId: parentId },
      data: { status: 'COMPLETED' },
    });
  }
}