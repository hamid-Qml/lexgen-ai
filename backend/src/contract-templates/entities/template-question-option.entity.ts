import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
} from 'typeorm';

@Entity('template_question_options')
@Index(['templateVersionId'])
@Index(['templateVersionId', 'questionCode', 'optionValue'], { unique: true })
export class TemplateQuestionOption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'template_version_id' })
  templateVersionId: string;

  @Column({ name: 'question_code' })
  questionCode: string;

  @Column({ name: 'option_value' })
  optionValue: string;

  @Column({ name: 'option_label' })
  optionLabel: string;

  @Column({ name: 'has_clause_effects', default: false })
  hasClauseEffects: boolean;
}
