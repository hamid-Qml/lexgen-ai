import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
} from 'typeorm';

@Entity('template_clause_effects')
@Index(['templateVersionId'])
@Index(
  ['templateVersionId', 'questionCode', 'optionValue', 'clauseCode', 'action', 'variantCode'],
  { unique: true },
)
export class TemplateClauseEffect {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'template_version_id' })
  templateVersionId: string;

  @Column({ name: 'question_code' })
  questionCode: string;

  @Column({ name: 'option_value' })
  optionValue: string;

  @Column({ name: 'clause_code' })
  clauseCode: string;

  @Column()
  action: string;

  @Column({ name: 'variant_code', type: 'varchar', nullable: true })
  variantCode: string | null;
}
