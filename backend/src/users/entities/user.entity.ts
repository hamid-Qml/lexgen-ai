// src/users/entities/user.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Subscription } from '../../billing/entities/subscription.entity';
import { ContractDraft } from '../../contracts/entities/contract-draft.entity';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

export enum SubscriptionTier {
  FREE = 'free',
  PRO = 'pro',
  BUSINESS = 'business',
  ENTERPRISE = 'enterprise',
}

export type IntendedUsage = 'personal' | 'business' | 'legal_practitioner';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  password_hash: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  full_name: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  company_name: string | null;

  // Onboarding fields
  @Column({ type: 'varchar', length: 100, nullable: true })
  abn_acn: string | null;

  @Column({ type: 'text', nullable: true })
  company_address: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  industry: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  primary_jurisdiction: string | null; // e.g. AU-NSW

  @Column('text', { array: true, nullable: true })
  contract_categories_of_interest: string[] | null; // ['commercial', 'employment', ...]

  @Column({ type: 'varchar', length: 50, nullable: true })
  intended_usage: IntendedUsage | null;

  @Column({ type: 'boolean', default: false })
  onboarding_completed: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  terms_accepted_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  disclaimer_ack_at: Date | null;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  // Coarse-grained tier for UX / gating
  @Column({
    type: 'enum',
    enum: SubscriptionTier,
    default: SubscriptionTier.FREE,
  })
  subscription_tier: SubscriptionTier;

  // Stripe customer id (one per user)
  @Column({ type: 'varchar', length: 255, nullable: true })
  stripe_customer_id: string | null;

  // Reset password fields
  @Column({ type: 'varchar', length: 255, nullable: true })
  password_reset_token_hash: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  password_reset_token_expires_at: Date | null;

  @OneToMany(() => Subscription, (sub) => sub.user)
  subscriptions: Subscription[];

  @OneToMany(() => ContractDraft, (draft) => draft.user)
  contractDrafts: ContractDraft[];

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
