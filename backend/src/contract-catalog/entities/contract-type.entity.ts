// src/contract-catalog/entities/contract-type.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
} from 'typeorm';
import { Expose } from 'class-transformer';
import { ContractQuestionTemplate } from './contract-question-template.entity';
import { PrecedentDocument } from './precedent-document.entity';
import { ContractDraft } from '../../contracts/entities/contract-draft.entity';
import { ContractCategory, ComplexityLevel } from './contract.enums';

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

  // which question_keys should be shown as direct form inputs
  @Column({ name: 'primary_form_keys', type: 'jsonb', nullable: true })
  primaryFormKeys: string[] | null;

  // NEW: clarifying questions used by the chatbot (dynamic Q&A)
  @Column({ name: 'clarifying_questions', type: 'jsonb', nullable: true })
  clarifyingQuestions: string[] | null;

  @OneToMany(() => ContractQuestionTemplate, (q) => q.contractType, {
    cascade: true,
  })
  questionTemplates: ContractQuestionTemplate[];

  @OneToMany(() => PrecedentDocument, (p) => p.contractType)
  precedents: PrecedentDocument[];

  @OneToMany(() => ContractDraft, (d) => d.contractType)
  drafts: ContractDraft[];

  @Expose()
  templateSections?: {
    id?: string;
    sectionCode: string;
    name: string;
    displayOrder: number;
  }[];
}
