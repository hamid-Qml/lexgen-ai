// src/contracts/contracts.service.ts
import {
    Injectable,
    NotFoundException,
    ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ContractDraft } from './entities/contract-draft.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { Repository } from 'typeorm';
import { ContractType } from 'src/contract-catalog/entities/contract-type.entity';
import { CreateContractDraftDto } from './dto/create-contract-draft.dto';
import { CreateChatMessageDto } from './dto/create-chat-message.dto';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class ContractsService {
    constructor(
        @InjectRepository(ContractDraft)
        private drafts: Repository<ContractDraft>,
        @InjectRepository(ChatMessage)
        private messages: Repository<ChatMessage>,
        @InjectRepository(ContractType)
        private contractTypes: Repository<ContractType>,
        @InjectRepository(User)
        private users: Repository<User>,
    ) { }

    async createDraft(userId: string, dto: CreateContractDraftDto) {
        const user = await this.users.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

        let contractType: ContractType | null = null;

        if (dto.contractTypeId) {
            contractType = await this.contractTypes.findOne({
                where: { id: dto.contractTypeId },
            });
        } else if (dto.contractTypeSlug) {
            contractType = await this.contractTypes.findOne({
                where: { slug: dto.contractTypeSlug },
            });
        }

        if (!contractType) {
            throw new NotFoundException('Contract type not found');
        }

        const title =
            dto.title || `${contractType.name} – Draft for ${user.company_name ?? user.full_name ?? user.email}`;

        const jurisdiction =
            dto.jurisdiction || contractType.jurisdictionDefault;

        const draft = this.drafts.create({
            user,
            contractType,
            title,
            jurisdiction,
            status: 'in_progress',
            questionnaire_state: {},
            ai_inputs: {},
            version: 1,
        });

        return this.drafts.save(draft);
    }

    async listDraftsForUser(userId: string, limit = 10) {
        return this.drafts.find({
            where: { user: { id: userId } },
            order: { updated_at: 'DESC' },
            take: limit,
        });
    }

    private async getDraftForUserOrThrow(
        draftId: string,
        userId: string,
    ): Promise<ContractDraft> {
        const draft = await this.drafts.findOne({
            where: { id: draftId },
            relations: ['user', 'chatMessages'],
            order: {
                chatMessages: { created_at: 'ASC' },
            } as any,
        });

        if (!draft) throw new NotFoundException('Contract draft not found');
        if (draft.user.id !== userId) {
            throw new ForbiddenException('Not your draft');
        }

        return draft;
    }

    async getDraftWithMessages(draftId: string, userId: string) {
        return this.getDraftForUserOrThrow(draftId, userId);
    }

    async addMessageToDraft(
        draftId: string,
        userId: string,
        dto: CreateChatMessageDto,
    ) {
        const draft = await this.getDraftForUserOrThrow(draftId, userId);

        const msg = this.messages.create({
            contractDraft: draft,
            sender: dto.sender,
            message: dto.message,
        });

        await this.messages.save(msg);

        // Return updated messages list (optional)
        return this.getDraftWithMessages(draftId, userId);
    }
}
