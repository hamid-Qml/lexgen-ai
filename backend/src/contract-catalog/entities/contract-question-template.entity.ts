// src/contract-catalog/entities/contract-question-template.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
} from 'typeorm';
import { ContractType } from './contract-type.entity';
import { ComplexityLevel } from './contract.enums';

export enum QuestionInputType {
  TEXT = 'text',
  TEXTAREA = 'textarea',
  SELECT = 'select',
  NUMBER = 'number',
  DATE = 'date',
  MULTI_SELECT = 'multi_select',
}

@Entity('contract_question_templates')
export class ContractQuestionTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(
    () => ContractType,
    (ct) => ct.questionTemplates,
    { nullable: true, onDelete: 'SET NULL' },
  )
  contractType: ContractType | null; // null for global questions

  @Column()
  order: number;

  @Column({ name: 'question_key' })
  questionKey: string;

  @Column()
  label: string;

  @Column({ nullable: true })
  description: string;

  @Column({
    name: 'input_type',
    type: 'enum',
    enum: QuestionInputType,
    default: QuestionInputType.TEXT,
  })
  inputType: QuestionInputType;

  @Column({ type: 'jsonb', nullable: true })
  options: any | null;

  @Column({ name: 'is_required', default: true })
  isRequired: boolean;

  @Column({
    name: 'complexity_level',
    type: 'enum',
    enum: ComplexityLevel,
    default: ComplexityLevel.STANDARD,
  })
  complexityLevel: ComplexityLevel;
}
