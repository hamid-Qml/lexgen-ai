// src/contracts/entities/chat-message.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { ContractDraft } from './contract-draft.entity';

export type ChatSender = 'user' | 'assistant' | 'system';

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ContractDraft, (d) => d.chatMessages, {
    onDelete: 'CASCADE',
  })
  contractDraft: ContractDraft;

  @Column({ type: 'varchar' })
  sender: ChatSender;

  @Column({ type: 'text' })
  message: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
