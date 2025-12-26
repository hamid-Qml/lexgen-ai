// src/contracts/contracts.service.ts
import { Injectable, Logger, NotFoundException, ForbiddenException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThanOrEqual, Not, Repository } from 'typeorm';
import axios from 'axios';

import { ContractDraft } from './entities/contract-draft.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { ContractType } from 'src/contract-catalog/entities/contract-type.entity';
import { ContractQuestionTemplate } from 'src/contract-catalog/entities/contract-question-template.entity';
import { ContractTemplateVersion } from 'src/contract-templates/entities/contract-template-version.entity';
import { TemplateQuestion } from 'src/contract-templates/entities/template-question.entity';
import { TemplateQuestionOption } from 'src/contract-templates/entities/template-question-option.entity';
import { TemplateSection } from 'src/contract-templates/entities/template-section.entity';
import { CreateContractDraftDto } from './dto/create-contract-draft.dto';
import { CreateChatMessageDto } from './dto/create-chat-message.dto';
import { GenerateContractDto } from './dto/generate-contract.dto';
import { SubscriptionTier, User } from 'src/users/entities/user.entity';
import { buildDocxBuffer, buildPdfBuffer } from './contract-export.util';

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

        @InjectRepository(ContractTemplateVersion)
        private templateVersions: Repository<ContractTemplateVersion>,

        @InjectRepository(TemplateQuestion)
        private templateQuestions: Repository<TemplateQuestion>,

        @InjectRepository(TemplateQuestionOption)
        private templateQuestionOptions: Repository<TemplateQuestionOption>,

        @InjectRepository(TemplateSection)
        private templateSections: Repository<TemplateSection>,

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

    async downloadDraft(
        draftId: string,
        userId: string,
        format: 'pdf' | 'docx' | 'txt',
    ) {
        const draft = await this.getDraftForUserOrThrow(draftId, userId);
        if (!draft.ai_draft_text) {
            throw new BadRequestException('Contract has not been generated yet.');
        }

        const baseName =
            draft.contractType?.name ||
            draft.title ||
            'lexgen-contract';
        const safeBase = baseName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');

        if (format === 'pdf') {
            return {
                buffer: buildPdfBuffer(draft.ai_draft_text),
                filename: `${safeBase || 'lexgen-contract'}.pdf`,
                mime: 'application/pdf',
            };
        }

        if (format === 'docx') {
            return {
                buffer: buildDocxBuffer(draft.ai_draft_text),
                filename: `${safeBase || 'lexgen-contract'}.docx`,
                mime:
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            };
        }

        return {
            buffer: Buffer.from(draft.ai_draft_text, 'utf8'),
            filename: `${safeBase || 'lexgen-contract'}.txt`,
            mime: 'text/plain',
        };
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
            await this.attachTemplateSections(draft.contractType);
            const qts = await this.questionTemplates.find({
                where: { contractType: { id: draft.contractType.id } },
                order: { order: 'ASC' },
            });

            if (qts.length > 0) {
                (draft.contractType as any).questionTemplates = qts;
            } else {
                const fallback = await this.buildFallbackQuestionTemplates(
                    draft.contractType,
                );
                if (fallback.length > 0) {
                    this.logger.warn(
                        `No contract_question_templates for contractType=${draft.contractType.name}. Using template_questions fallback (${fallback.length}).`,
                    );
                    (draft.contractType as any).questionTemplates = fallback;
                } else {
                    (draft.contractType as any).questionTemplates = [];
                }
            }
        }

        return draft;
    }

    private async attachTemplateSections(contractType: ContractType) {
        const templateVersion = await this.templateVersions.findOne({
            where: { contractTypeName: contractType.name },
            order: { createdAt: 'DESC' },
        });

        if (!templateVersion) {
            (contractType as any).templateSections = [];
            return;
        }

        const sections = await this.templateSections.find({
            where: { templateVersionId: templateVersion.id },
            order: { displayOrder: 'ASC' },
        });

        if (sections.length > 0) {
            (contractType as any).templateSections = sections.map((section) => ({
                id: section.id,
                sectionCode: section.sectionCode,
                name: section.name,
                displayOrder: section.displayOrder,
            }));
            return;
        }

        const questions = await this.templateQuestions.find({
            where: { templateVersionId: templateVersion.id },
            order: { questionCode: 'ASC' },
        });

        const seen = new Set<string>();
        const fallbackSections = [] as {
            sectionCode: string;
            name: string;
            displayOrder: number;
        }[];

        const formatName = (value: string) =>
            value
                .toLowerCase()
                .split(/[_\s]+/)
                .filter(Boolean)
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');

        questions.forEach((question) => {
            const code = question.sectionCode;
            if (!code || seen.has(code)) return;
            seen.add(code);
            fallbackSections.push({
                sectionCode: code,
                name: formatName(code),
                displayOrder: fallbackSections.length + 1,
            });
        });

        (contractType as any).templateSections = fallbackSections;
    }

    private async buildFallbackQuestionTemplates(
        contractType: ContractType,
    ): Promise<ContractQuestionTemplate[]> {
        const templateVersion = await this.templateVersions.findOne({
            where: { contractTypeName: contractType.name },
            order: { createdAt: 'DESC' },
        });

        if (!templateVersion) {
            return [];
        }

        const [sections, questions, options] = await Promise.all([
            this.templateSections.find({
                where: { templateVersionId: templateVersion.id },
            }),
            this.templateQuestions.find({
                where: { templateVersionId: templateVersion.id },
            }),
            this.templateQuestionOptions.find({
                where: { templateVersionId: templateVersion.id },
            }),
        ]);

        if (!questions.length) {
            return [];
        }

        const sectionOrder = new Map(
            sections.map((section) => [section.sectionCode, section.displayOrder]),
        );
        const optionsByQuestion = new Map<string, string[]>();

        options.forEach((opt) => {
            const key = opt.questionCode;
            const list = optionsByQuestion.get(key) ?? [];
            const label = opt.optionLabel || opt.optionValue;
            if (label) {
                list.push(label);
            }
            optionsByQuestion.set(key, list);
        });

        const basicSections = new Set(['PARTIES', 'ROLE', 'REMUNERATION']);
        const sorted = [...questions].sort((a, b) => {
            const aOrder = sectionOrder.get(a.sectionCode) ?? 0;
            const bOrder = sectionOrder.get(b.sectionCode) ?? 0;
            if (aOrder !== bOrder) return aOrder - bOrder;
            return a.questionCode.localeCompare(b.questionCode);
        });

        return sorted.map((q, index) => {
            const questionType = this.mapTemplateQuestionType(q.questionType);
            const rawChoices = optionsByQuestion.get(q.questionCode) ?? [];
            const choices =
                rawChoices.length > 0
                    ? rawChoices
                    : q.questionType === 'yes-no'
                        ? ['Yes', 'No']
                        : [];

            return {
                id: `template-${templateVersion.id}-${q.questionCode}`,
                order: index + 1,
                questionKey: q.variableKey || q.questionCode,
                label: q.questionText,
                description: null as string | null,
                inputType: questionType as any,
                options: choices.length ? { choices } : null,
                isRequired: q.isRequired,
                complexityLevel: basicSections.has(q.sectionCode)
                    ? 'basic'
                    : 'standard',
                contractType: null,
            } as unknown as ContractQuestionTemplate;
        });
    }

    private mapTemplateQuestionType(questionType: string) {
        const normalized = questionType.trim().toLowerCase();
        switch (normalized) {
            case 'multi-select':
                return 'multi_select';
            case 'yes-no':
                return 'select';
            case 'currency':
            case 'percentage':
                return 'number';
            case 'number':
                return 'number';
            case 'date':
                return 'date';
            case 'select':
                return 'select';
            case 'text':
                return 'text';
            default:
                return 'text';
        }
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
        await this.enforceMonthlyGenerationLimit(draft.user);

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

    /**
     * Enforce per-tier monthly generation limits.
     * Free: 3, Pro: 20, Business: unlimited (very high cap for safety).
     */
    private async enforceMonthlyGenerationLimit(user: User) {
        const limit = this.getMonthlyGenerationLimit(user.subscription_tier);
        if (!limit) return; // unlimited

        const now = new Date();
        const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

        const generationsThisMonth = await this.drafts.count({
            where: {
                user: { id: user.id },
                ai_draft_text: Not(IsNull()),
                updated_at: MoreThanOrEqual(monthStart),
            },
        });

        if (generationsThisMonth >= limit) {
            throw new ForbiddenException(
                `Monthly contract generation limit reached for your plan (${limit} per month).`,
            );
        }
    }

    private getMonthlyGenerationLimit(tier: SubscriptionTier): number | null {
        switch (tier) {
            case SubscriptionTier.FREE:
                return 3;
            case SubscriptionTier.PRO:
                return 20;
            case SubscriptionTier.BUSINESS:
            case SubscriptionTier.ENTERPRISE:
                return null; // unlimited
            default:
                return 3;
        }
    }
}
