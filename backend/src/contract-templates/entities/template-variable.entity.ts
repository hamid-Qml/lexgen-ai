import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
} from 'typeorm';

@Entity('template_variables')
@Index(['templateVersionId'])
@Index(['templateVersionId', 'variableKey'], { unique: true })
export class TemplateVariable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'template_version_id' })
  templateVersionId: string;

  @Column({ name: 'variable_key' })
  variableKey: string;

  @Column({ name: 'variable_type' })
  variableType: string;

  @Column({ name: 'source_question_code', type: 'varchar', nullable: true })
  sourceQuestionCode: string | null;

  @Column('text', { name: 'used_in_clauses', array: true, default: '{}' })
  usedInClauses: string[];
}
