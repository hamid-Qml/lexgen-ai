// src/billing/entities/subscription.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { User, SubscriptionTier } from '../../users/entities/user.entity';
import { type BillingTier } from '../plan';

export type SubscriptionStatus =
  | 'inactive'
  | 'active'
  | 'trialing'
  | 'canceled'
  | 'past_due';

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (u) => u.subscriptions, { onDelete: 'CASCADE' })
  user: User;

  // Stripe ids
  @Column({ nullable: true })
  stripe_customer_id: string | null;

  @Column({ nullable: true })
  stripe_subscription_id: string | null;

  @Column({ nullable: true })
  stripe_price_id: string | null;

  // Fine-grained billing tier (matches BillingTier)
  @Column({ type: 'varchar' })
  tier: BillingTier;

  // Status mapped from Stripe subscription
  @Column({ type: 'varchar', default: 'inactive' })
  status: SubscriptionStatus;

  // Current period end from Stripe
  @Column({ type: 'timestamptz', nullable: true })
  current_period_end: Date | null;

  // Optional: first activation date
  @Column({ type: 'timestamptz', nullable: true })
  start_date: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
