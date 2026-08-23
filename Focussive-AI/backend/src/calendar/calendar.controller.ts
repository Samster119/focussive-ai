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
import { CalendarService, CreateEventDto, UpdateEventDto } from './calendar.service';

@Controller('calendar')
@UseGuards(JwtAuthGuard)
export class CalendarController {
  constructor(private readonly calendar: CalendarService) {}

  @Get()
  list(
    @Req() req: Request & { user: { sub: string } },
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    return this.calendar.list(req.user.sub, start, end);
  }

  @Post()
  create(
    @Req() req: Request & { user: { sub: string } },
    @Body() dto: CreateEventDto,
  ) {
    return this.calendar.create(req.user.sub, dto);
  }

  @Patch(':id')
  update(
    @Req() req: Request & { user: { sub: string } },
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
  ) {
    return this.calendar.update(req.user.sub, id, dto);
  }

  @Delete(':id')
  remove(
    @Req() req: Request & { user: { sub: string } },
    @Param('id') id: string,
  ) {
    return this.calendar.remove(req.user.sub, id);
  }

  @Post('auto-schedule')
  autoSchedule(@Req() req: Request & { user: { sub: string } }) {
    return this.calendar.autoSchedule(req.user.sub);
  }

  @Post('block')
  block(
    @Req() req: Request & { user: { sub: string } },
    @Body() dto: CreateEventDto,
  ) {
    return this.calendar.create(req.user.sub, { ...dto, type: 'MANUAL' });
  }
}
