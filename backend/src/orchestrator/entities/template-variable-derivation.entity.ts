import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
} from 'typeorm';

@Entity('template_variable_derivations')
@Index(['templateVersionCode'])
@Index(['templateVersionCode', 'variableKey'], { unique: true })
export class TemplateVariableDerivation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'template_version_code' })
  templateVersionCode: string;

  @Column({ name: 'variable_key' })
  variableKey: string;

  @Column({ type: 'text' })
  expression: string;

  @Column('text', { name: 'depends_on', array: true, default: '{}' })
  dependsOn: string[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
