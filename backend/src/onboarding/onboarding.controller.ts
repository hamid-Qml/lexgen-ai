// src/onboarding/onboarding.controller.ts
import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OnboardingService } from './onboarding.service';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';

@Controller('onboarding')
@UseGuards(AuthGuard('jwt'))
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  @Get('me')
  async getStatus(@Req() req: any) {
    const userId = req.user.userId;
    return this.onboarding.getStatus(userId);
  }

  @Post('complete')
  async complete(@Req() req: any, @Body() dto: CompleteOnboardingDto) {
    const userId = req.user.userId;
    return this.onboarding.complete(userId, dto);
  }
}
