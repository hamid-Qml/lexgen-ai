import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
} from 'typeorm';

@Entity('template_clause_variants')
@Index(['templateVersionId'])
@Index(['templateVersionId', 'clauseCode', 'variantCode'], { unique: true })
export class TemplateClauseVariant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'template_version_id' })
  templateVersionId: string;

  @Column({ name: 'clause_code' })
  clauseCode: string;

  @Column({ name: 'variant_code' })
  variantCode: string;

  @Column({ name: 'variant_name' })
  variantName: string;

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @Column({ name: 'use_case', type: 'text', nullable: true })
  useCase: string | null;

  @Column({ name: 'full_text', type: 'text' })
  fullText: string;

  @Column({ name: 'variable_count', type: 'int', nullable: true })
  variableCount: number | null;

  @Column('text', { name: 'variables_list', array: true, default: '{}' })
  variablesList: string[];
}
