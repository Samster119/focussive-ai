import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('recommendations')
@UseGuards(JwtAuthGuard)
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Get()
  async getRecommendations(@Request() req: any) {
    const userId = req.user.sub || req.user.userId;
    const items = await this.recommendationsService.getRecommendations(userId);
    return { recommendations: items };
  }
}
