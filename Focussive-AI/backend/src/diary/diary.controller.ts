import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { DiaryService } from './diary.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('diary')
@UseGuards(JwtAuthGuard)
export class DiaryController {
  constructor(private readonly diaryService: DiaryService) {}

  @Get()
  async getEntries(@Request() req: any) {
    const userId = req.user.sub || req.user.userId;
    return this.diaryService.getDiaryEntries(userId);
  }

  @Post('generate')
  async generateEntry(@Request() req: any, @Body() body: { date: string }) {
    const userId = req.user.sub || req.user.userId;
    return this.diaryService.generateDiary(userId, body.date);
  }
}
