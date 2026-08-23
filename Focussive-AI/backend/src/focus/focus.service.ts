import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';

export class CompleteFocusDto {
  elapsedMs!: number;
  taskId?: string;
}

@Injectable()
export class FocusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService
  ) {}

  async complete(userId: string, dto: CompleteFocusDto) {
    const focusedMinutes = Math.round(dto.elapsedMs / 60000);
    const xpEarned = focusedMinutes >= 1 ? focusedMinutes * 2 : 0;
    const session = await this.prisma.focusSession.create({
      data: {
        userId,
        taskId: dto.taskId,
        durationMinutes: focusedMinutes,
        xpEarned,
      },
    });
    if (xpEarned > 0) {
      await this.auth.addXP(userId, xpEarned);
    }
    if (dto.taskId) {
      await this.prisma.task.updateMany({
        where: { id: dto.taskId, userId },
        data: { status: 'COMPLETED' },
      });
    }
    return { focusedMinutes, xpEarned, session };
  }

  async history(userId: string) {
    return this.prisma.focusSession.findMany({
      where: { userId },
      orderBy: { completedAt: 'desc' },
      take: 20,
    });
  }
}