import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
} from 'typeorm';

@Entity('template_api_schema_fields')
@Index(['templateVersionId'])
@Index(['templateVersionId', 'fieldName'], { unique: true })
export class TemplateApiSchemaField {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'template_version_id' })
  templateVersionId: string;

  @Column({ name: 'field_name' })
  fieldName: string;

  @Column({ name: 'field_type' })
  fieldType: string;

  @Column({ name: 'is_required', default: false })
  isRequired: boolean;
}
