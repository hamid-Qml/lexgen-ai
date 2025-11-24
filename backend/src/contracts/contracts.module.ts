// src/contracts/contracts.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContractDraft } from './entities/contract-draft.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { ContractsService } from './contracts.service';
import { ContractsController } from './contracts.controller';
import { ContractType } from 'src/contract-catalog/entities/contract-type.entity';
import { User } from 'src/users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ContractDraft, ChatMessage, ContractType, User]),
  ],
  providers: [ContractsService],
  controllers: [ContractsController],
  exports: [ContractsService],
})
export class ContractsModule {}
