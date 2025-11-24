// src/billing/dto/create-checkout-session.dto.ts
import { IsString, IsIn } from 'class-validator';
import { type PlanKey } from '../plan';

export class CreateCheckoutSessionDto {
  @IsString()
  @IsIn([
    'pro_monthly',
    'pro_yearly',
    'business_monthly',
    'business_yearly',
  ])
  planKey: PlanKey;
}
