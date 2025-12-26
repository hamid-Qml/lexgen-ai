import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
} from 'typeorm';

@Entity('template_variable_aliases')
@Index(['templateVersionCode'])
@Index(['templateVersionCode', 'aliasKey'], { unique: true })
export class TemplateVariableAlias {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'template_version_code' })
  templateVersionCode: string;

  @Column({ name: 'alias_key' })
  aliasKey: string;

  @Column({ name: 'target_key' })
  targetKey: string;

  @Column({ type: 'double precision', nullable: true })
  confidence: number | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
