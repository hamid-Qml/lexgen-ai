import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
} from 'typeorm';

@Entity('template_clause_triggers')
@Index(['templateVersionId'])
@Index(['templateVersionId', 'clauseCode', 'triggerIndex'], { unique: true })
export class TemplateClauseTrigger {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'template_version_id' })
  templateVersionId: string;

  @Column({ name: 'clause_code' })
  clauseCode: string;

  @Column({ name: 'trigger_index', type: 'int' })
  triggerIndex: number;

  @Column({ name: 'condition_field' })
  conditionField: string;

  @Column({ name: 'condition_operator' })
  conditionOperator: string;

  @Column({ name: 'condition_value' })
  conditionValue: string;

  @Column({ name: 'result_status', type: 'varchar', nullable: true })
  resultStatus: string | null;

  @Column({ name: 'result_variant', type: 'varchar', nullable: true })
  resultVariant: string | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;
}
