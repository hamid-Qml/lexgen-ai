// src/contracts/entities/contract-draft.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { ContractType } from 'src/contract-catalog/entities/contract-type.entity';
import { ChatMessage } from './chat-message.entity';

export type ContractDraftStatus =
  | 'in_progress'
  | 'ready_for_review'
  | 'finalized';

@Entity('contract_drafts')
export class ContractDraft {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (u) => u.contractDrafts, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => ContractType, (t) => t.drafts, { eager: true })
  contractType: ContractType;

  @Column()
  title: string;

  @Column({ type: 'varchar', default: 'in_progress' })
  status: ContractDraftStatus;

  @Column()
  jurisdiction: string;

  @Column({ type: 'jsonb', default: {} })
  questionnaire_state: Record<string, any>;

  @Column({ type: 'jsonb', default: {} })
  ai_inputs: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  ai_draft_text: string | null;

  @Column({ type: 'text', nullable: true })
  ai_revision_notes: string | null;

  @Column({ type: 'int', default: 1 })
  version: number;

  @OneToMany(() => ChatMessage, (m) => m.contractDraft, { cascade: true })
  chatMessages: ChatMessage[];

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
