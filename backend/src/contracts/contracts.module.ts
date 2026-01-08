// src/contracts/contracts.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContractDraft } from './entities/contract-draft.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { ContractsService } from './contracts.service';
import { ContractsController } from './contracts.controller';
import { ContractType } from 'src/contract-catalog/entities/contract-type.entity';
import { User } from 'src/users/entities/user.entity';
import { ContractQuestionTemplate } from 'src/contract-catalog/entities/contract-question-template.entity';
import { PrecedentDocument } from 'src/contract-catalog/entities/precedent-document.entity';
import { ContractTemplateVersion } from 'src/contract-templates/entities/contract-template-version.entity';
import { TemplateQuestion } from 'src/contract-templates/entities/template-question.entity';
import { TemplateQuestionOption } from 'src/contract-templates/entities/template-question-option.entity';
import { TemplateSection } from 'src/contract-templates/entities/template-section.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ContractDraft,
      ChatMessage,
      ContractType,
      User,
      ContractQuestionTemplate,
      PrecedentDocument,
      ContractTemplateVersion,
      TemplateQuestion,
      TemplateQuestionOption,
      TemplateSection,
    ]),
  ],
  providers: [ContractsService],
  controllers: [ContractsController],
  exports: [ContractsService],
})
export class ContractsModule {}
