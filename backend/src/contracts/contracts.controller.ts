// src/contracts/contracts.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ContractsService } from './contracts.service';
import { CreateContractDraftDto } from './dto/create-contract-draft.dto';
import { CreateChatMessageDto } from './dto/create-chat-message.dto';

@Controller('contracts')
@UseGuards(AuthGuard('jwt'))
export class ContractsController {
  constructor(private contracts: ContractsService) {}

  // Dashboard list – recent drafts
  // GET /contracts?limit=5
  @Get()
  listMyDrafts(@Req() req: any, @Query('limit') limit?: string) {
    const userId = req.user.userId;
    return this.contracts.listDraftsForUser(
      userId,
      limit ? Number(limit) : 10,
    );
  }

  // New contract – create draft
  @Post()
  create(@Req() req: any, @Body() body: CreateContractDraftDto) {
    const userId = req.user.userId;
    return this.contracts.createDraft(userId, body);
  }

  // Contract workspace – get full draft + messages
  @Get(':id')
  getDraft(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.userId;
    return this.contracts.getDraftWithMessages(id, userId);
  }

  // Append chat message to a draft
  @Post(':id/messages')
  addMessage(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: CreateChatMessageDto,
  ) {
    const userId = req.user.userId;
    return this.contracts.addMessageToDraft(id, userId, body);
  }
}
