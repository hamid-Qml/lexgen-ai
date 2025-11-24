// src/contract-catalog/entities/contract-type.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
} from 'typeorm';
import { ContractQuestionTemplate } from './contract-question-template.entity';
import { PrecedentDocument } from './precedent-document.entity';
import { ContractDraft } from '../../contracts/entities/contract-draft.entity';

export enum ContractCategory {
  COMMERCIAL = 'commercial',
  EMPLOYMENT = 'employment',
  TECHNOLOGY = 'technology',
  FAMILY_LAW = 'family_law',
}

export enum ComplexityLevel {
  BASIC = 'basic',
  STANDARD = 'standard',
  COMPLEX = 'complex',
}

@Entity('contract_types')
export class ContractType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  slug: string;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: ContractCategory,
  })
  category: ContractCategory;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    name: 'complexity_level',
    type: 'enum',
    enum: ComplexityLevel,
    default: ComplexityLevel.STANDARD,
  })
  complexityLevel: ComplexityLevel;

  @Column({ name: 'jurisdiction_default', default: 'AU' })
  jurisdictionDefault: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  // questions per contract type
  @OneToMany(
    () => ContractQuestionTemplate,
    (q) => q.contractType,
    { cascade: true },
  )
  questionTemplates: ContractQuestionTemplate[];

  // precedents for RAG
  @OneToMany(
    () => PrecedentDocument,
    (p) => p.contractType,
  )
  precedents: PrecedentDocument[];

  // drafts referencing this type
  @OneToMany(
    () => ContractDraft,
    (d) => d.contractType,
  )
  drafts: ContractDraft[];
}
