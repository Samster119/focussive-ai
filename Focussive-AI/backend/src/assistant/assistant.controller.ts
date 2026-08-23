import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AssistantService } from './assistant.service';

export class ConverseDto {
  content!: string;
  conversationId?: string;
}

@Controller('assistant')
@UseGuards(JwtAuthGuard)
export class AssistantController {
  constructor(private readonly assistant: AssistantService) {}

  @Get('history')
  history(@Req() req: Request & { user: { sub: string } }) {
    return this.assistant.history(req.user.sub);
  }

  @Post('converse')
  converse(
    @Req() req: Request & { user: { sub: string } },
    @Body() dto: ConverseDto,
    @Res() res: Response,
  ) {
    return this.assistant.converse(req.user.sub, dto.content, dto.conversationId, res);
  }
}
