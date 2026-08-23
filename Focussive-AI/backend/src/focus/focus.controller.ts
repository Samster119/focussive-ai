import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FocusService, CompleteFocusDto } from './focus.service';

@Controller('focus')
@UseGuards(JwtAuthGuard)
export class FocusController {
  constructor(private readonly focus: FocusService) {}

  @Post('complete')
  complete(
    @Req() req: Request & { user: { sub: string } },
    @Body() dto: CompleteFocusDto,
  ) {
    return this.focus.complete(req.user.sub, dto);
  }

  @Get('history')
  history(@Req() req: Request & { user: { sub: string } }) {
    return this.focus.history(req.user.sub);
  }
}