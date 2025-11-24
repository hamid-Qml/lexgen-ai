// src/onboarding/onboarding.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OnboardingService } from './onboarding.service';
import { OnboardingController } from './onboarding.controller';
import { User } from 'src/users/entities/user.entity';
import { Subscription } from 'src/billing/entities/subscription.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Subscription])],
  providers: [OnboardingService],
  controllers: [OnboardingController],
})
export class OnboardingModule {}
