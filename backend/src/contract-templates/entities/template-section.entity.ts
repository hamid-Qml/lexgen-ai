import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
} from 'typeorm';

@Entity('template_sections')
@Index(['templateVersionId'])
@Index(['templateVersionId', 'sectionCode'], { unique: true })
export class TemplateSection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'template_version_id' })
  templateVersionId: string;

  @Column({ name: 'section_code' })
  sectionCode: string;

  @Column()
  name: string;

  @Column({ name: 'display_order', type: 'int' })
  displayOrder: number;
}
