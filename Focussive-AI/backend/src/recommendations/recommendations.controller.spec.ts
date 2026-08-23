import { Test, TestingModule } from '@nestjs/testing';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';

describe('RecommendationsController', () => {
  let controller: RecommendationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [JwtModule.registerAsync({ useFactory: () => ({ secret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret', signOptions: { expiresIn: '7d' } }) })],
      controllers: [RecommendationsController],
      providers: [RecommendationsService, PrismaService, AuthService, JwtAuthGuard],
    }).compile();

    controller = module.get<RecommendationsController>(RecommendationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});