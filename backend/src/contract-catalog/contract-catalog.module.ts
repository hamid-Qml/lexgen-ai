// src/contract-catalog/contract-catalog.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContractType } from './entities/contract-type.entity';
import { PrecedentDocument } from './entities/precedent-document.entity';
import { ContractQuestionTemplate } from './entities/contract-question-template.entity';

import { ContractCatalogService } from './contract-catalog.service';
import { ContractCatalogController } from './contract-catalog.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ContractType,
      PrecedentDocument,
      ContractQuestionTemplate,
    ]),
  ],
  providers: [ContractCatalogService],
  controllers: [ContractCatalogController],
  exports: [ContractCatalogService],
})
export class ContractCatalogModule {}
