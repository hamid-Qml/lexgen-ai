// src/contracts/dto/create-chat-message.dto.ts
import { IsIn, IsString, IsOptional, IsObject } from 'class-validator';

export class CreateChatMessageDto {
  @IsString()
  @IsIn(['user', 'assistant', 'system'])
  sender: 'user' | 'assistant' | 'system';

  @IsString()
  message: string;

  @IsOptional()
  @IsObject()
  answers?: Record<string, any>;
}
