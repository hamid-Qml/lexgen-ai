// src/contracts/dto/start-conversation.dto.ts
import { IsObject, IsOptional } from 'class-validator';

export class StartConversationDto {
  @IsOptional()
  @IsObject()
  answers?: Record<string, any>;
}

