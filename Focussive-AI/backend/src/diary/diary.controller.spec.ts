import { Test, TestingModule } from '@nestjs/testing';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DiaryController } from './diary.controller';
import { DiaryService } from './diary.service';

describe('DiaryController', () => {
  let controller: DiaryController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [JwtModule.registerAsync({ useFactory: () => ({ secret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret', signOptions: { expiresIn: '7d' } }) })],
      controllers: [DiaryController],
      providers: [DiaryService, PrismaService, AuthService, JwtAuthGuard],
    }).compile();

    controller = module.get<DiaryController>(DiaryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});