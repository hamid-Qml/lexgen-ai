// src/contracts/contracts.service.ts
import { Injectable, Logger, NotFoundException, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';

import { ContractDraft } from './entities/contract-draft.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { ContractType } from 'src/contract-catalog/entities/contract-type.entity';
import { ContractQuestionTemplate } from 'src/contract-catalog/entities/contract-question-template.entity';
import { CreateContractDraftDto } from './dto/create-contract-draft.dto';
import { CreateChatMessageDto } from './dto/create-chat-message.dto';
import { GenerateContractDto } from './dto/generate-contract.dto';
import { User } from 'src/users/entities/user.entity';

type MlChatRole = 'system' | 'user' | 'assistant';

type MlContractQuestion = {
    key: string;
    label: string;
    description?: string | null;
    required: boolean;
};

type MlContractContext = {
    contract_type_id: string;
    contract_type_name: string;
    category?: string | null;
    jurisdiction?: string | null;
    template_questions: MlContractQuestion[];
    form_answers: Record<string, any>;
    chat_answers: Record<string, any>;
    clarifying_questions: string[];
};

type MlChatMessage = {
    role: MlChatRole;
    content: string;
};

type MlContractChatRequest = {
    draft_id: string;
    context: MlContractContext;
    messages: MlChatMessage[];
};

type MlContractChatResponse = {
    draft_id: string;
    assistant_message: string;
    updated_chat_answers: Record<string, any>;
};

type MlGenerateContractRequest = {
    draft_id: string;
    context: MlContractContext;
    messages: MlChatMessage[];
    precedent_snippets?: string[];
};

type MlGenerateContractResponse = {
    draft_id: string;
    contract_text: string;
    revision_notes?: string | null;
};

@Injectable()
export class ContractsService {
    private readonly mlBaseUrl = process.env.MLEND_URL || 'http://localhost:5000/api';
    private readonly logger = new Logger(ContractsService.name);
    constructor(
        @InjectRepository(ContractDraft)
        private drafts: Repository<ContractDraft>,

        @InjectRepository(ChatMessage)
        private messages: Repository<ChatMessage>,

        @InjectRepository(ContractType)
        private contractTypes: Repository<ContractType>,

        @InjectRepository(ContractQuestionTemplate)
        private questionTemplates: Repository<ContractQuestionTemplate>,

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

        const title = dto.title || `${contractType.name}`;

        const jurisdiction = dto.jurisdiction || contractType.jurisdictionDefault;

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
            relations: ['contractType'],
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
            relations: ['user', 'contractType', 'chatMessages'],
            order: {
                chatMessages: { created_at: 'ASC' },
            } as any,
        });

        if (!draft) throw new NotFoundException('Contract draft not found');
        if (draft.user.id !== userId) {
            throw new ForbiddenException('Not your draft');
        }

        // Attach question templates for this contract type
        if (draft.contractType) {
            const qts = await this.questionTemplates.find({
                where: { contractType: { id: draft.contractType.id } },
                order: { order: 'ASC' },
            });

            (draft.contractType as any).questionTemplates = qts;
        }

        return draft;
    }

    async getDraftWithMessages(draftId: string, userId: string) {
        return this.getDraftForUserOrThrow(draftId, userId);
    }

    /**
     * Build the ContractContext payload expected by the Python mlend service.
     */
    private buildMlContext(draft: ContractDraft): MlContractContext {
        const ct: any = draft.contractType;

        const template_questions: MlContractQuestion[] =
            (ct?.questionTemplates || []).map((qt: ContractQuestionTemplate) => ({
                key: qt.questionKey,
                label: qt.label,
                description: qt.description,
                required: qt.isRequired,
            }));

        const aiInputs = (draft.ai_inputs || {}) as any;
        const chat_answers = aiInputs.chat_answers || {};
        const clarifyingQuestions: string[] = ct?.clarifyingQuestions || [];

        return {
            contract_type_id: ct?.id,
            contract_type_name: ct?.name,
            category: ct?.category || null,
            jurisdiction: draft.jurisdiction || ct?.jurisdictionDefault || null,
            template_questions,
            form_answers: (draft.questionnaire_state || {}) as Record<string, any>,
            chat_answers,
            clarifying_questions: clarifyingQuestions,
        };
    }

    /**
     * Build the messages history for mlend.
     */
    private buildMlMessages(draft: ContractDraft): MlChatMessage[] {
        const history: MlChatMessage[] = [];

        (draft.chatMessages || []).forEach((msg) => {
            const role: MlChatRole =
                msg.sender === 'user'
                    ? 'user'
                    : msg.sender === 'assistant'
                        ? 'assistant'
                        : 'system';

            history.push({
                role,
                content: msg.message,
            });
        });

        return history;
    }

    /**
     * Calls Python /contract/chat to get the next assistant message.
     */
    private async callMlContractChat(
        draft: ContractDraft,
    ): Promise<MlContractChatResponse> {
        const payload: MlContractChatRequest = {
            draft_id: draft.id,
            context: this.buildMlContext(draft),
            messages: this.buildMlMessages(draft),
        };

        this.logger.debug(
            `Calling ML /contract/chat for draft ${draft.id} with ${payload.messages.length} messages`,
        );

        try {
            const res = await axios.post<MlContractChatResponse>(
                `${this.mlBaseUrl}/contract/chat`,
                payload,
            );
            this.logger.debug(
                `ML /contract/chat response for draft ${draft.id}: ${res.status}`,
            );
            return res.data;
        } catch (e: any) {
            this.logger.error(
                `ML chat call failed for draft ${draft.id}`,
                JSON.stringify({
                    message: e?.message,
                    status: e?.response?.status,
                    data: e?.response?.data,
                }),
            );
            throw new InternalServerErrorException(
                `ML chat call failed: ${e?.message || 'unknown error'}`,
            );
        }
    }

    private async callMlGenerateContract(
        draft: ContractDraft,
    ): Promise<MlGenerateContractResponse> {
        const payload: MlGenerateContractRequest = {
            draft_id: draft.id,
            context: this.buildMlContext(draft),
            messages: this.buildMlMessages(draft),
            precedent_snippets: [],
        };

        this.logger.debug(
            `Calling ML /contract/generate for draft ${draft.id} with ${payload.messages.length} messages`,
        );

        try {
            const res = await axios.post<MlGenerateContractResponse>(
                `${this.mlBaseUrl}/contract/generate`,
                payload,
            );
            this.logger.debug(
                `ML /contract/generate response for draft ${draft.id}: ${res.status}`,
            );
            return res.data;
        } catch (e: any) {
            this.logger.error(
                `ML generate call failed for draft ${draft.id}`,
                JSON.stringify({
                    message: e?.message,
                    status: e?.response?.status,
                    data: e?.response?.data,
                }),
            );
            throw new InternalServerErrorException(
                `ML generate call failed: ${e?.message || 'unknown error'}`,
            );
        }
    }

    /**
     * Append chat message to a draft.
     *
     * Behaviour:
     * - Always store the incoming message.
     * - If sender === 'user', call mlend to get the assistant reply and store it.
     * - If sender === 'assistant' (e.g. initial static greeting), just store it.
     */
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

        // Ensure the in-memory draft has the new message
        if (!draft.chatMessages) draft.chatMessages = [];
        draft.chatMessages.push(msg);

        // If this is a user message, we now invoke the AI to respond
        if (dto.sender === 'user') {
            const mlResponse = await this.callMlContractChat(draft);

            // Persist updated chat_answers into ai_inputs
            const aiInputs = (draft.ai_inputs || {}) as any;
            aiInputs.chat_answers = mlResponse.updated_chat_answers || aiInputs.chat_answers || {};
            draft.ai_inputs = aiInputs;

            // Save AI's message as well
            const assistantMessage = this.messages.create({
                contractDraft: draft,
                sender: 'assistant',
                message: mlResponse.assistant_message,
            });
            await this.messages.save(assistantMessage);

            draft.chatMessages.push(assistantMessage);
            await this.drafts.save(draft);
        }

        // Return updated draft with all messages
        return this.getDraftWithMessages(draftId, userId);
    }

    /**
 * Start the AI conversation for a draft:
 * - No user input yet.
 * - Calls mlend to get an initial assistant message (greeting + first question).
 */
    async startConversation(
        draftId: string,
        userId: string,
        answers?: Record<string, any>,
    ) {
        const draft = await this.getDraftForUserOrThrow(draftId, userId);

        if (answers && Object.keys(answers).length > 0) {
            draft.questionnaire_state = {
                ...(draft.questionnaire_state || {}),
                ...answers,
            };
            await this.drafts.save(draft);
        }

        // If there are already messages, just return the draft (idempotent)
        if (draft.chatMessages && draft.chatMessages.length > 0) {
            this.logger.debug(
                `startConversation called for draft ${draftId} but messages already exist – returning existing draft`,
            );
            return draft;
        }

        this.logger.debug(
            `Starting ML conversation for draft ${draftId} (no prior messages)`,
        );

        const mlResponse = await this.callMlContractChat(draft);

        const aiInputs = (draft.ai_inputs || {}) as any;
        aiInputs.chat_answers =
            mlResponse.updated_chat_answers || aiInputs.chat_answers || {};
        draft.ai_inputs = aiInputs;

        const assistantMessage = this.messages.create({
            contractDraft: draft,
            sender: 'assistant',
            message: mlResponse.assistant_message,
        });
        await this.messages.save(assistantMessage);

        draft.chatMessages = [assistantMessage];
        await this.drafts.save(draft);

        return this.getDraftWithMessages(draftId, userId);
    }

    /**
     * Generate contract: update questionnaire_state (form answers),
     * call mlend, store the resulting text and revision notes.
     */
    async generateContract(
        draftId: string,
        userId: string,
        dto: GenerateContractDto,
    ) {
        const draft = await this.getDraftForUserOrThrow(draftId, userId);

        // Persist form answers if provided
        if (dto.answers) {
            draft.questionnaire_state = dto.answers;
        }

        const mlResponse = await this.callMlGenerateContract(draft);

        draft.ai_draft_text = mlResponse.contract_text;
        draft.ai_revision_notes = mlResponse.revision_notes || null;
        draft.status = 'ready_for_review';
        draft.version = (draft.version || 1) + 1;

        await this.drafts.save(draft);

        return this.getDraftWithMessages(draftId, userId);
    }
}
