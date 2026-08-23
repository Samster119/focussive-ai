import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from './prisma/prisma.service';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { TasksController } from './tasks/tasks.controller';
import { TasksService } from './tasks/tasks.service';
import { FocusController } from './focus/focus.controller';
import { FocusService } from './focus/focus.service';
import { CalendarController } from './calendar/calendar.controller';
import { CalendarService } from './calendar/calendar.service';
import { AssistantController } from './assistant/assistant.controller';
import { AssistantService } from './assistant/assistant.service';
import { TimetableController } from './timetable/timetable.controller';
import { TimetableService } from './timetable/timetable.service';
import { RecommendationsController } from './recommendations/recommendations.controller';
import { RecommendationsService } from './recommendations/recommendations.service';
import { DiaryController } from './diary/diary.controller';
import { DiaryService } from './diary/diary.service';
import { ReportsController } from './reports/reports.controller';
import { ReportsService } from './reports/reports.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [
    AuthController,
    TasksController,
    FocusController,
    CalendarController,
    AssistantController,
    TimetableController,
    RecommendationsController,
    DiaryController,
    ReportsController,
  ],
  providers: [
    PrismaService,
    AuthService,
    JwtAuthGuard,
    TasksService,
    FocusService,
    CalendarService,
    AssistantService,
    TimetableService,
    RecommendationsService,
    DiaryService,
    ReportsService,
  ],
})
export class AppModule {}