import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
} from 'typeorm';

@Entity('template_dependency_rules')
@Index(['templateVersionId'])
@Index(['templateVersionId', 'ruleCode'], { unique: true })
export class TemplateDependencyRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'template_version_id' })
  templateVersionId: string;

  @Column({ name: 'rule_code' })
  ruleCode: string;

  @Column({ name: 'rule_type' })
  ruleType: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;
}
