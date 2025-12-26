// src/contracts/contracts.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  Logger,
  StreamableFile,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { ContractsService } from './contracts.service';
import { CreateContractDraftDto } from './dto/create-contract-draft.dto';
import { CreateChatMessageDto } from './dto/create-chat-message.dto';
import { GenerateContractDto } from './dto/generate-contract.dto';
import { StartConversationDto } from './dto/start-conversation.dto';

@Controller('contracts')
@UseGuards(AuthGuard('jwt'))
export class ContractsController {
  private readonly logger = new Logger(ContractsController.name);

  constructor(private contracts: ContractsService) {}

  @Get()
  listMyDrafts(@Req() req: any, @Query('limit') limit?: string) {
    const userId = req.user.userId;
    this.logger.debug(
      `listMyDrafts called by user ${userId} (limit=${limit || 10})`,
    );
    return this.contracts.listDraftsForUser(
      userId,
      limit ? Number(limit) : 10,
    );
  }

  @Post()
  create(@Req() req: any, @Body() body: CreateContractDraftDto) {
    const userId = req.user.userId;
    this.logger.debug(
      `create draft called by user ${userId} with payload ${JSON.stringify(
        body,
      )}`,
    );
    return this.contracts.createDraft(userId, body);
  }

  @Get(':id')
  getDraft(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.userId;
    this.logger.debug(`getDraft ${id} for user ${userId}`);
    return this.contracts.getDraftWithMessages(id, userId);
  }

  @Get(':id/download')
  async downloadDraft(
    @Req() req: any,
    @Param('id') id: string,
    @Query('format') format = 'txt',
    @Res({ passthrough: true }) res: Response,
  ) {
    const userId = req.user.userId;
    const normalized =
      format === 'pdf' || format === 'docx' ? format : 'txt';
    const file = await this.contracts.downloadDraft(
      id,
      userId,
      normalized,
    );
    res.setHeader('Content-Type', file.mime);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.filename}"`,
    );
    return new StreamableFile(file.buffer);
  }

  @Post(':id/messages')
  addMessage(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: CreateChatMessageDto,
  ) {
    const userId = req.user.userId;
    this.logger.debug(
      `addMessage to draft ${id} by user ${userId}: sender=${body.sender}`,
    );
    return this.contracts.addMessageToDraft(id, userId, body);
  }

  // start conversation endpoint
  @Post(':id/start')
  startConversation(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: StartConversationDto,
  ) {
    const userId = req.user.userId;
    this.logger.debug(`startConversation for draft ${id} by user ${userId}`);
    return this.contracts.startConversation(id, userId, body?.answers);
  }

  // generate contract endpoint
  @Post(':id/generate')
  generate(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: GenerateContractDto,
  ) {
    const userId = req.user.userId;
    this.logger.debug(
      `generate contract for draft ${id} by user ${userId} with answers keys: ${Object.keys(
        body.answers || {},
      ).join(', ')}`,
    );
    return this.contracts.generateContract(id, userId, body);
  }
}
