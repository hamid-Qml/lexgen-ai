import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
} from 'typeorm';

@Entity('template_clauses')
@Index(['templateVersionId'])
@Index(['templateVersionId', 'clauseCode'], { unique: true })
export class TemplateClause {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'template_version_id' })
  templateVersionId: string;

  @Column({ name: 'category_code' })
  categoryCode: string;

  @Column({ name: 'category_name' })
  categoryName: string;

  @Column({ name: 'clause_code' })
  clauseCode: string;

  @Column({ name: 'clause_name' })
  clauseName: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'status', type: 'varchar', nullable: true })
  status: string | null;

  @Column({ name: 'default_variant_code', type: 'varchar', nullable: true })
  defaultVariantCode: string | null;

  @Column({ name: 'legislation_reference', type: 'text', nullable: true })
  legislationReference: string | null;

  @Column({ name: 'risk_notes', type: 'text', nullable: true })
  riskNotes: string | null;

  @Column({ name: 'has_triggers', default: false })
  hasTriggers: boolean;

  @Column({ name: 'variant_count', type: 'int', nullable: true })
  variantCount: number | null;

  @Column('text', { name: 'requires_clauses', array: true, default: '{}' })
  requiresClauses: string[];

  @Column('text', { name: 'conflicts_with', array: true, default: '{}' })
  conflictsWith: string[];
}
