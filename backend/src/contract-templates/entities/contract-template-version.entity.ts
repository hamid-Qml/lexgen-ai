import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
} from 'typeorm';

@Entity('contract_template_versions')
@Index(['contractTypeCode', 'version'], { unique: true })
export class ContractTemplateVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'contract_type_code' })
  contractTypeCode: string;

  @Column({ name: 'contract_type_name' })
  contractTypeName: string;

  @Column({ name: 'export_type', type: 'varchar', nullable: true })
  exportType: string | null;

  @Column({ type: 'varchar', nullable: true })
  version: string | null;

  @Column({ name: 'generated_at', type: 'timestamptz', nullable: true })
  generatedAt: Date | null;

  @Column({ name: 'source_spreadsheet_path', type: 'text', nullable: true })
  sourceSpreadsheetPath: string | null;

  @Column({ name: 'source_contract_path', type: 'text', nullable: true })
  sourceContractPath: string | null;

  @Column({ name: 'is_current', default: false })
  isCurrent: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
