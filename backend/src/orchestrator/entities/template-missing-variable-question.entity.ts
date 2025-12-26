import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
} from 'typeorm';

@Entity('template_missing_variable_questions')
@Index(['templateVersionCode'])
@Index(['templateVersionCode', 'questionKey'], { unique: true })
export class TemplateMissingVariableQuestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'template_version_code' })
  templateVersionCode: string;

  @Column({ name: 'question_key' })
  questionKey: string;

  @Column({ name: 'variable_key' })
  variableKey: string;

  @Column({ type: 'text' })
  text: string;

  @Column({ name: 'input_type', type: 'varchar' })
  inputType: string;

  @Column({ type: 'jsonb', nullable: true })
  options: unknown[] | null;

  @Column({ name: 'allow_custom', default: false })
  allowCustom: boolean;

  @Column({ default: false })
  required: boolean;

  @Column({ name: 'show_if', type: 'jsonb', nullable: true })
  showIf: Record<string, unknown> | null;

  @Column({ type: 'varchar', nullable: true })
  priority: string | null;

  @Column({ name: 'default_value', type: 'jsonb', nullable: true })
  defaultValue: unknown | null;

  @Column({ type: 'varchar', nullable: true })
  unit: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
