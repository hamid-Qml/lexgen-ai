import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
} from 'typeorm';

@Entity('template_compliance_rules')
@Index(['templateVersionId'])
@Index(['templateVersionId', 'ruleCode'], { unique: true })
export class TemplateComplianceRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'template_version_id' })
  templateVersionId: string;

  @Column({ name: 'rule_code' })
  ruleCode: string;

  @Column()
  framework: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;
}
