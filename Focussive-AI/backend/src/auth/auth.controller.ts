import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService, LoginDto, RegisterDto, UpdateSettingsDto } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: Request & { user: { sub: string } }) {
    return this.auth.me(req.user.sub);
  }

  @Get('settings')
  @UseGuards(JwtAuthGuard)
  getSettings(@Req() req: Request & { user: { sub: string } }) {
    return this.auth.getSettings(req.user.sub);
  }

  @Patch('settings')
  @UseGuards(JwtAuthGuard)
  updateSettings(
    @Req() req: Request & { user: { sub: string } },
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.auth.updateSettings(req.user.sub, dto);
  }

  @Get('gamification')
  @UseGuards(JwtAuthGuard)
  getGamification(@Req() req: Request & { user: { sub: string } }) {
    return this.auth.getGamificationStats(req.user.sub);
  }
}
