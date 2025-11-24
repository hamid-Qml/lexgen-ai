// src/contracts/dto/create-chat-message.dto.ts
import { IsIn, IsString } from 'class-validator';

export class CreateChatMessageDto {
  @IsString()
  @IsIn(['user', 'assistant', 'system'])
  sender: 'user' | 'assistant' | 'system';

  @IsString()
  message: string;
}
