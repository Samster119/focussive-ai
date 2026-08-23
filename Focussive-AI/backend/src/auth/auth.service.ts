import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from './jwt-auth.guard';

export class RegisterDto {
  email!: string;
  password!: string;
  fullName!: string;
}

export class LoginDto {
  email!: string;
  password!: string;
}

export class UpdateSettingsDto {
  assistantPersonality?: string;
  burnoutThresholdScore?: number;
  workStartHour?: number;
  workEndHour?: number;
  enablePushNotifications?: boolean;
  breakReminders?: boolean;
  burnoutAlerts?: boolean;
  eventReminders?: boolean;
  pushSubscription?: string;
}

const INITIAL_BADGES = [
  { name: 'First Login', description: 'Signed in for the first time', icon: 'login', criteria: JSON.stringify({ type: 'first_login' }) },
  { name: 'Deep Work Pro', description: '3 focus sessions in one day', icon: 'local_fire_department', criteria: JSON.stringify({ type: '3_sessions_day' }) },
  { name: 'Streak 7', description: '7-day productivity streak', icon: 'local_fire_department', criteria: JSON.stringify({ type: '7_day_streak' }) },
  { name: 'Task Crusher', description: 'Completed 50 tasks', icon: 'task_alt', criteria: JSON.stringify({ type: '50_tasks' }) },
  { name: 'Early Bird', description: 'Started before 7AM', icon: 'wb_sunny', criteria: JSON.stringify({ type: 'early_bird' }) },
  { name: 'Mind Master', description: 'Meditated for 30 days', icon: 'self_improvement', criteria: JSON.stringify({ type: '30_meditations' }) },
  { name: 'Organizer', description: 'Created 20 events', icon: 'calendar_month', criteria: JSON.stringify({ type: '20_events' }) },
  { name: 'Consistency', description: '7-day diary streak', icon: 'book', criteria: JSON.stringify({ type: '7_day_diary' }) },
];

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async onModuleInit() {
    await this.seedBadges();
  }

  private async seedBadges() {
    const count = await this.prisma.badge.count();
    if (count === 0) {
      await this.prisma.badge.createMany({ data: INITIAL_BADGES });
    }
  }

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase().trim();
    const fullName = dto.fullName?.trim() ?? '';
    const password = dto.password ?? '';

    // Email validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException('Please provide a valid email address (e.g. user@gmail.com)');
    }

    // Full Name validation (no numbers allowed)
    const nameRegex = /^[a-zA-Z\s'-]{2,}$/;
    if (!nameRegex.test(fullName)) {
      throw new BadRequestException('Full Name must contain only letters and be at least 2 characters long');
    }

    // Password validation (8+ chars, upper, lower, number, special char)
    if (password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(password)) {
      throw new BadRequestException('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      throw new BadRequestException('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      throw new BadRequestException('Password must contain at least one number');
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      throw new BadRequestException('Password must contain at least one special character (!@#$%^&*)');
    }

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(password, 6);
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName,
      },
    });

    const [settings, gamification] = await Promise.all([
      this.prisma.userSettings.create({ data: { userId: user.id } }),
      this.prisma.gamificationStats.create({ data: { userId: user.id } }),
    ]);

    return this.buildSession({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      settings,
      gamification,
    });
  }

  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { settings: true, gamification: true },
    });
    if (!user) {
      throw new UnauthorizedException('Email not registered');
    }
    if (!(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid password');
    }
    return this.buildSession(user);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { settings: true, gamification: true },
    });
    if (!user) throw new UnauthorizedException('User not found');
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      settings: user.settings,
      gamification: user.gamification,
    };
  }

  async getSettings(userId: string) {
    const settings = await this.prisma.userSettings.findUnique({
      where: { userId },
    });
    if (!settings) throw new UnauthorizedException('Settings not found');
    return settings;
  }

  async updateSettings(userId: string, dto: UpdateSettingsDto) {
    try {
      return await this.prisma.userSettings.upsert({
        where: { userId },
        create: { userId, ...dto },
        update: dto,
      });
    } catch (e: any) {
      if (e?.code === 'P2003') {
        throw new UnauthorizedException('User not found — please log in again');
      }
      throw e;
    }
  }

  async getGamificationStats(userId: string) {
    const [statsResult, allBadges, userBadges] = await Promise.all([
      this.prisma.gamificationStats.findUnique({ where: { userId } }),
      this.prisma.badge.findMany(),
      this.prisma.userBadge.findMany({ where: { userId }, include: { badge: true } }),
    ]);

    let stats = statsResult;

    if (!stats) {
      try {
        stats = await this.prisma.gamificationStats.create({
          data: { userId },
        });
      } catch (e: any) {
        if (e?.code === 'P2003') {
          throw new UnauthorizedException('User not found — please log in again');
        }
        throw e;
      }
    }

    // Check 'First Login' badge
    const firstLoginBadge = allBadges.find(b => {
      const c = typeof b.criteria === 'string' ? JSON.parse(b.criteria) : b.criteria;
      return c?.type === 'first_login';
    });
    if (firstLoginBadge && !userBadges.find(ub => ub.badgeId === firstLoginBadge.id)) {
      const ub = await this.prisma.userBadge.create({
        data: { userId, badgeId: firstLoginBadge.id }
      });
      userBadges.push({ ...ub, badge: firstLoginBadge } as any);
    }

    return {
      stats,
      badges: allBadges.map(badge => ({
        ...badge,
        done: userBadges.some(ub => ub.badgeId === badge.id)
      }))
    };
  }

  // Hook to call when XP is earned (e.g. Focus Session completed)
  async addXP(userId: string, xpEarned: number) {
    let stats;
    try {
      stats = await this.prisma.gamificationStats.upsert({
        where: { userId },
        create: { userId, currentXP: xpEarned },
        update: { currentXP: { increment: xpEarned } }
      });
    } catch (e: any) {
      if (e?.code === 'P2003') {
        throw new UnauthorizedException('User not found — please log in again');
      }
      throw e;
    }

    // Simple level formula: Level 1 (0), Level 2 (500), Level 3 (1200), Level 4 (2500)
    let newLevel = 1;
    if (stats.currentXP >= 2500) newLevel = 4;
    else if (stats.currentXP >= 1200) newLevel = 3;
    else if (stats.currentXP >= 500) newLevel = 2;

    if (newLevel > stats.currentLevel) {
      await this.prisma.gamificationStats.update({
        where: { userId },
        data: { currentLevel: newLevel }
      });
    }
    
    return stats;
  }

  private async buildSession(user: { id: string; email: string; fullName: string; settings: any; gamification: any }) {
    const payload: AuthUser = { sub: user.id, email: user.email };
    const accessToken = await this.jwt.signAsync(payload);
    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        settings: user.settings,
        gamification: user.gamification,
      },
    };
  }
}