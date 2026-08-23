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
import { TasksService, CreateTaskDto, UpdateTaskDto } from './tasks.service';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get()
  list(
    @Req() req: Request & { user: { sub: string } },
    @Query('filter') filter?: string,
  ) {
    return this.tasks.list(req.user.sub, filter);
  }

  @Post()
  create(
    @Req() req: Request & { user: { sub: string } },
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasks.create(req.user.sub, dto);
  }

  @Patch(':id')
  update(
    @Req() req: Request & { user: { sub: string } },
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasks.update(req.user.sub, id, dto);
  }

  @Delete(':id')
  remove(
    @Req() req: Request & { user: { sub: string } },
    @Param('id') id: string,
  ) {
    return this.tasks.remove(req.user.sub, id);
  }

  @Post(':id/micro-step')
  microStep(
    @Req() req: Request & { user: { sub: string } },
    @Param('id') id: string,
  ) {
    return this.tasks.microStep(req.user.sub, id);
  }
}