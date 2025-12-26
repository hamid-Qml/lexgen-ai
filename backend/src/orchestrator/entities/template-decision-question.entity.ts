import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
} from 'typeorm';

@Entity('template_decision_questions')
@Index(['templateVersionCode'])
@Index(['templateVersionCode', 'questionKey'], { unique: true })
export class TemplateDecisionQuestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'template_version_code' })
  templateVersionCode: string;

  @Column({ name: 'question_key' })
  questionKey: string;

  @Column({ name: 'decision_key' })
  decisionKey: string;

  @Column({ type: 'text' })
  text: string;

  @Column({ name: 'input_type', type: 'varchar' })
  inputType: string;

  @Column({ type: 'jsonb', nullable: true })
  options: unknown[] | null;

  @Column({ default: false })
  required: boolean;

  @Column({ name: 'show_if', type: 'jsonb', nullable: true })
  showIf: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  effects: Record<string, unknown>[] | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
