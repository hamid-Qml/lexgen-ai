import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
} from 'typeorm';

@Entity('template_questions')
@Index(['templateVersionId'])
@Index(['templateVersionId', 'questionCode'], { unique: true })
export class TemplateQuestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'template_version_id' })
  templateVersionId: string;

  @Column({ name: 'question_code' })
  questionCode: string;

  @Column({ name: 'section_code' })
  sectionCode: string;

  @Column({ name: 'question_text', type: 'text' })
  questionText: string;

  @Column({ name: 'question_type' })
  questionType: string;

  @Column({ name: 'is_required', default: false })
  isRequired: boolean;

  @Column({ name: 'variable_key', type: 'varchar', nullable: true })
  variableKey: string | null;

  @Column({ name: 'has_show_if', default: false })
  hasShowIf: boolean;

  @Column({ name: 'has_skip_if', default: false })
  hasSkipIf: boolean;
}
