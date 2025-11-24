// src/onboarding/onboarding.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, SubscriptionTier } from 'src/users/entities/user.entity';
import { Subscription } from 'src/billing/entities/subscription.entity';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';

@Injectable()
export class OnboardingService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Subscription)
    private readonly subsRepo: Repository<Subscription>,
  ) {}

  async getStatus(userId: string) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    return {
      onboarding_completed: user.onboarding_completed,
      primary_jurisdiction: user.primary_jurisdiction,
      contract_categories_of_interest: user.contract_categories_of_interest,
      intended_usage: user.intended_usage,
    };
  }

  async complete(userId: string, dto: CompleteOnboardingDto) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    user.full_name = dto.full_name ?? user.full_name;
    user.company_name = dto.company_name ?? user.company_name;
    user.abn_acn = dto.abn_acn ?? null;
    user.company_address = dto.company_address ?? null;
    user.industry = dto.industry ?? null;
    user.primary_jurisdiction = dto.primary_jurisdiction;
    user.contract_categories_of_interest =
      dto.contract_categories_of_interest ?? [];
    user.intended_usage = dto.intended_usage;
    user.onboarding_completed = true;

    const now = new Date();
    if (dto.accepted_terms) {
      user.terms_accepted_at = now;
    }
    if (dto.accepted_disclaimer) {
      user.disclaimer_ack_at = now;
    }

    // Ensure they are at least FREE tier
    if (!user.subscription_tier) {
      user.subscription_tier = SubscriptionTier.FREE;
    }

    await this.usersRepo.save(user);

    // Ensure there is a "free" subscription record for this user
    const existingSub = await this.subsRepo.findOne({
      where: { user: { id: user.id } },
    });

    if (!existingSub) {
      const sub = this.subsRepo.create({
        user,
        tier: 'free',
        status: 'active',
        start_date: now,
        current_period_end: null,
        stripe_customer_id: null,
        stripe_subscription_id: null,
        stripe_price_id: null,
      });
      await this.subsRepo.save(sub);
    }

    return { ok: true };
  }
}
