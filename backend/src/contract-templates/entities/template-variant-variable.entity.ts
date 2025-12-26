import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
} from 'typeorm';

@Entity('template_variant_variables')
@Index(['templateVersionId'])
@Index(['templateVersionId', 'clauseCode', 'variantCode', 'variableKey'], {
  unique: true,
})
export class TemplateVariantVariable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'template_version_id' })
  templateVersionId: string;

  @Column({ name: 'clause_code' })
  clauseCode: string;

  @Column({ name: 'variant_code' })
  variantCode: string;

  @Column({ name: 'variable_key' })
  variableKey: string;

  @Column({ name: 'variable_type' })
  variableType: string;

  @Column({ name: 'is_required', default: false })
  isRequired: boolean;

  @Column({ type: 'varchar', nullable: true })
  label: string | null;

  @Column({ name: 'default_value', type: 'jsonb', nullable: true })
  defaultValue: unknown | null;
}
