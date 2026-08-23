import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TimetableService, RegenerateDto, UpdateBlockDto, ReorderBlocksDto } from './timetable.service';

@Controller('timetable')
@UseGuards(JwtAuthGuard)
export class TimetableController {
  constructor(private readonly timetable: TimetableService) {}

  @Get()
  getForDate(
    @Req() req: Request & { user: { sub: string } },
    @Query('date') date: string,
  ) {
    try {
      const d = date ? new Date(date) : new Date();
      return this.timetable.getForDate(req.user.sub, d.toISOString());
    } catch (e) {
      console.error('GetForDate error:', e);
      return { error: e.message };
    }
  }

  @Post('regenerate')
  regenerate(
    @Req() req: Request & { user: { sub: string } },
    @Body() dto: RegenerateDto,
  ) {
    try {
      return this.timetable.regenerate(req.user.sub, dto);
    } catch (e) {
      console.error('Regenerate error:', e);
      return { error: e.message };
    }
  }

  @Post('reorder')
  reorder(
    @Req() req: Request & { user: { sub: string } },
    @Body() dto: ReorderBlocksDto,
  ) {
    return this.timetable.reorderBlocks(req.user.sub, dto);
  }

  @Patch('block/:id')
  updateBlock(
    @Req() req: Request & { user: { sub: string } },
    @Param('id') id: string,
    @Body() dto: UpdateBlockDto,
  ) {
    return this.timetable.updateBlock(req.user.sub, id, dto);
  }

  @Post('block')
  createBlock(
    @Req() req: Request & { user: { sub: string } },
    @Body() body: { dayOfWeek: number; startTime: string; endTime: string; activityType: string },
  ) {
    return this.timetable.createBlock(req.user.sub, body);
  }

  @Delete('block/:id')
  deleteBlock(
    @Req() req: Request & { user: { sub: string } },
    @Param('id') id: string,
  ) {
    return this.timetable.deleteBlock(req.user.sub, id);
  }
}
