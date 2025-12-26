import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
} from 'typeorm';

@Entity('template_frameworks')
@Index(['templateVersionId'])
@Index(['templateVersionId', 'frameworkCode'], { unique: true })
export class TemplateFramework {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'template_version_id' })
  templateVersionId: string;

  @Column({ name: 'framework_code' })
  frameworkCode: string;

  @Column()
  name: string;

  @Column({ name: 'requirement_count', type: 'int', nullable: true })
  requirementCount: number | null;
}
