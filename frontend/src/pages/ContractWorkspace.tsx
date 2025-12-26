// src/pages/ContractWorkspace.tsx
import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getCurrentUser } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Send,
  Download,
  RefreshCw,
  FileText,
  Loader2,
} from "lucide-react";
import { contractService } from "@/services/contractService";
import { useToast } from "@/hooks/use-toast";

type QuestionInputType =
  | "text"
  | "textarea"
  | "select"
  | "number"
  | "date"
  | "multi_select";

type ComplexityLevel = "basic" | "standard" | "complex";

type BackendQuestionTemplate = {
  id: string;
  order: number;
  questionKey: string;
  label: string;
  description?: string | null;
  inputType: QuestionInputType;
  options: any | null;
  isRequired: boolean;
  complexityLevel: ComplexityLevel;
};

type BackendChatMessage = {
  id: string;
  sender: "user" | "assistant" | "system";
  message: string;
  created_at: string;
};

type BackendContractDraft = {
  id: string;
  title: string;
  status: "in_progress" | "ready_for_review" | "finalized";
  jurisdiction: string | null;
  questionnaire_state: Record<string, any> | null;
  ai_inputs?: {
    chat_answers?: Record<string, any>;
  } | null;
  ai_draft_text: string | null;
  contractType?: {
    id: string;
    name: string;
    category: string;
    complexityLevel: ComplexityLevel;
    jurisdictionDefault?: string;
    // optional list of question_keys that belong on the direct form
    primaryFormKeys?: string[] | null;
    questionTemplates?: BackendQuestionTemplate[];
    templateSections?: {
      id?: string;
      sectionCode: string;
      name: string;
      displayOrder: number;
    }[];
  };
  chatMessages?: BackendChatMessage[];
  created_at: string;
  updated_at: string;
};

type Stage = "form" | "chat" | "preview";

type FormattedContractBlock =
  | { type: "heading"; content: string; level: "main" | "sub" }
  | { type: "paragraph"; content: string }
  | { type: "list"; items: string[] };

const hasAnswerValue = (value: any) => {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
};

const normalizeQuestionText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const scoreQuestionMatch = (normalizedMessage: string, label: string) => {
  const normalizedLabel = normalizeQuestionText(label);
  if (!normalizedLabel) return 0;

  if (normalizedMessage.includes(normalizedLabel)) {
    return normalizedLabel.length + 10;
  }

  const labelWords = normalizedLabel
    .split(" ")
    .filter((word) => word.length > 2);
  if (labelWords.length === 0) return 0;
  const matches = labelWords.filter((word) =>
    normalizedMessage.includes(word),
  ).length;
  return (matches / labelWords.length) * 10;
};

const inferQuestionFromAssistant = (
  assistantMessage: string | undefined,
  candidates: BackendQuestionTemplate[],
) => {
  if (!assistantMessage) return null;
  const normalizedMessage = normalizeQuestionText(assistantMessage);
  if (!normalizedMessage) return null;

  let best: { question: BackendQuestionTemplate; score: number } | null = null;
  for (const question of candidates) {
    const score = scoreQuestionMatch(normalizedMessage, question.label);
    if (score <= 0) continue;
    if (!best || score > best.score) {
      best = { question, score };
    }
  }

  if (!best || best.score < 3) return null;
  return best.question;
};

const coerceAnswerValue = (
  value: string,
  question: BackendQuestionTemplate,
) => {
  if (question.inputType === "number") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : value;
  }

  if (question.inputType === "multi_select") {
    const parts = value
      .split(/[,;\n]/)
      .map((part) => part.trim())
      .filter(Boolean);
    return parts.length > 0 ? parts : value;
  }

  return value;
};

const renderWithPlaceholders = (text: string) => {
  const segments = text.split(/(\[[^\]]+\]|TO BE CONFIRMED)/gi);
  return segments.map((segment, idx) => {
    if (!segment) return null;
    const isPlaceholder = /^(\[[^\]]+\]|TO BE CONFIRMED)$/i.test(segment);
    if (isPlaceholder) {
      return (
        <strong
          key={`ph-${idx}`}
          className="font-semibold text-amber-900 bg-amber-100/70 px-1 rounded"
        >
          {segment}
        </strong>
      );
    }
    return <span key={`txt-${idx}`}>{segment}</span>;
  });
};

const buildPendingInfoMessage = (
  questions: BackendQuestionTemplate[],
  hasAnyInformation: boolean,
  assistantAwaitingResponse: boolean,
) => {
  if (!questions.length) {
    if (assistantAwaitingResponse) {
      return [
        "You asked me to generate the contract even though I just asked a follow-up question.",
        "I'll move ahead, but please note that the contract may miss the details I was clarifying. You can always come back, add that information, and regenerate the draft.",
      ].join("\n\n");
    }

    if (hasAnyInformation) return "";

    return [
      "You asked me to generate a contract without sharing any specific details about the parties, scope, or commercial terms.",
      "I'll create a very general draft that uses placeholders (e.g. [INSERT PARTY NAME]) and high-level boilerplate. Please review it carefully and replace every placeholder before using the document.",
      "Sharing even a single detail helps produce a draft that's tailored to your scenario.",
    ].join("\n\n");
  }

  const enumerated = questions
    .map((q, idx) => `${idx + 1}. ${q.label}`)
    .join("\n");
  return [
    "I'll generate the draft with the details you've shared so far.",
    "I'm still missing:",
    enumerated,
    "I'll insert clearly marked placeholders or rely on generic assumptions for those sections. You can update the missing details later and regenerate the contract at any time.",
  ].join("\n\n");
};

const stripToBeConfirmed = (line: string) =>
  line.replace(/\[?\(?\s*TO BE CONFIRMED\s*\)?\]?/gi, "").trim();

const getHeadingInfo = (
  rawLine: string,
): { content: string; level: "main" | "sub" } | null => {
  if (!rawLine) return null;
  const trimmed = stripToBeConfirmed(rawLine.trim());
  if (!trimmed) return null;
  if (trimmed.length > 140) return null;

  if (/^\d+(\.\d+)+\s+/.test(trimmed)) return { content: trimmed, level: "sub" };
  if (/^\d+(\.\d+)*\s+/.test(trimmed)) return { content: trimmed, level: "main" };
  if (trimmed.endsWith(":")) return { content: trimmed.replace(/:$/, ""), level: "main" };
  if (trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed))
    return { content: trimmed, level: "main" };
  if (/^[A-Z][A-Z\s/&,\-()]*$/.test(trimmed)) return { content: trimmed, level: "main" };
  return null;
};

const formatContractText = (text: string): FormattedContractBlock[] => {
  if (!text) return [];
  const lines = text.split(/\r?\n/);
  const blocks: FormattedContractBlock[] = [];
  let buffer: string[] = [];

  const flushBuffer = () => {
    if (!buffer.length) return;
    const normalized = buffer
      .map((line) => stripToBeConfirmed(line).trim())
      .filter(Boolean);
    if (!normalized.length) {
      buffer = [];
      return;
    }

    const isBulletList = normalized.every((line) => /^[-*•]\s+/.test(line));

    if (isBulletList) {
      blocks.push({
        type: "list",
        items: normalized.map((line) =>
          line.replace(/^[-*•]\s+/, "").trim(),
        ),
      });
    } else {
      const paragraph = normalized.join(" ").replace(/\s+/g, " ").trim();
      if (paragraph) {
        blocks.push({ type: "paragraph", content: paragraph });
      }
    }
    buffer = [];
  };

  lines.forEach((raw) => {
    const line = raw.trimEnd();
    const cleaned = stripToBeConfirmed(line);

    if (!cleaned.trim()) {
      flushBuffer();
      return;
    }

    const heading = getHeadingInfo(cleaned);
    if (heading) {
      flushBuffer();
      blocks.push({
        type: "heading",
        content: heading.content,
        level: heading.level,
      });
      return;
    }

    buffer.push(cleaned);
  });

  flushBuffer();

  return blocks;
};

export default function ContractWorkspace() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const mergeAnswers = (
    d: BackendContractDraft | null,
    fallback: Record<string, any> = {},
  ) => ({
    ...fallback,
    ...(d?.questionnaire_state || {}),
    ...((d?.ai_inputs?.chat_answers as Record<string, any>) || {}),
  });

  const [draft, setDraft] = useState<BackendContractDraft | null>(null);
  const [messages, setMessages] = useState<BackendChatMessage[]>([]);
  const [userInput, setUserInput] = useState("");
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [startingChat, setStartingChat] = useState(false);
  const [stage, setStage] = useState<Stage>("form");
  const [allowGenerateOverride, setAllowGenerateOverride] = useState(false);
  const [skipDialogOpen, setSkipDialogOpen] = useState(false);
  const [skipSummaryLoading, setSkipSummaryLoading] = useState(false);
  const [assistantThinking, setAssistantThinking] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStep, setGenerationStep] = useState("");
  const generationTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll chat to bottom when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (assistantThinking) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [assistantThinking]);

  const clearGenerationTimers = () => {
    generationTimers.current.forEach((t) => clearTimeout(t));
    generationTimers.current = [];
  };

  const startGenerationProgress = () => {
    clearGenerationTimers();
    const sectionLabels =
      draft?.contractType?.templateSections
        ?.slice()
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map((section) => section.name || section.sectionCode)
        .filter(Boolean) || [];

    if (sectionLabels.length > 0) {
      const stepDelay = 650;
      const stepCount = sectionLabels.length + 1;
      setGenerationStep(`Drafting ${sectionLabels[0]}`);
      setGenerationProgress(Math.max(8, Math.round((1 / stepCount) * 90)));

      sectionLabels.slice(1).forEach((label, idx) => {
        const stepIndex = idx + 2;
        const timer = setTimeout(() => {
          setGenerationStep(`Drafting ${label}`);
          setGenerationProgress(Math.round((stepIndex / stepCount) * 90));
        }, stepDelay * stepIndex);
        generationTimers.current.push(timer);
      });

      const finalTimer = setTimeout(() => {
        setGenerationStep("Finalizing contract");
        setGenerationProgress(92);
      }, stepDelay * (sectionLabels.length + 1));
      generationTimers.current.push(finalTimer);
      return;
    }

    setGenerationStep("Gathering your details");
    setGenerationProgress(8);

    const steps = [
      { delay: 400, progress: 22, label: "Reviewing answers" },
      { delay: 1200, progress: 48, label: "Drafting key clauses" },
      { delay: 2200, progress: 72, label: "Polishing language" },
      { delay: 3200, progress: 88, label: "Final legal checks" },
    ];

    steps.forEach((step) => {
      const timer = setTimeout(() => {
        setGenerationProgress(step.progress);
        setGenerationStep(step.label);
      }, step.delay);
      generationTimers.current.push(timer);
    });
  };

  const finishGenerationProgress = (status: "success" | "error") => {
    clearGenerationTimers();
    if (status === "success") {
      setGenerationStep("Contract ready");
      setGenerationProgress(100);
      const timer = setTimeout(() => {
        setGenerationProgress(0);
        setGenerationStep("");
      }, 1200);
      generationTimers.current.push(timer);
    } else {
      setGenerationProgress(0);
      setGenerationStep("");
    }
  };

  useEffect(() => {
    return () => clearGenerationTimers();
  }, []);

  // Helper: decide which questions belong on the “form” step
  const getPrimaryQuestions = (d: BackendContractDraft | null) => {
    if (!d?.contractType?.questionTemplates) return [];
    const all = [...d.contractType.questionTemplates];

    // If we have an explicit list from backend, use that
    const primaryKeys = d.contractType.primaryFormKeys;
    if (primaryKeys && primaryKeys.length > 0) {
      return all
        .filter((q) => primaryKeys.includes(q.questionKey))
        .sort((a, b) => a.order - b.order);
    }

    // Fallback heuristic: show BASIC questions in the form step
    return all
      .filter((q) => q.complexityLevel === "basic")
      .sort((a, b) => a.order - b.order);
  };

  // required-field completeness based on templates
  const isFormComplete = (() => {
    if (!draft) return false;
    const primary = getPrimaryQuestions(draft);
    if (primary.length === 0) return true;

    return primary
      .filter((q) => q.isRequired)
      .every((q) => {
        const v = answers[q.questionKey];
        if (v === null || v === undefined) return false;
        if (Array.isArray(v)) return v.length > 0;
        return String(v).trim().length > 0;
      });
  })();

  const pendingRequiredQuestions = useMemo(
    () =>
      (draft?.contractType?.questionTemplates || []).filter(
        (q) => q.isRequired && !hasAnswerValue(answers[q.questionKey]),
      ),
    [draft?.contractType?.questionTemplates, answers],
  );

  const hasFormAnswers = useMemo(
    () =>
      Object.values(answers).some((value) => {
        if (Array.isArray(value)) return value.length > 0;
        if (value === null || value === undefined) return false;
        return String(value).trim().length > 0;
      }),
    [answers],
  );

  const hasUserMessages = useMemo(
    () => messages.some((msg) => msg.sender === "user"),
    [messages],
  );

  const hasAnyInformation = hasFormAnswers || hasUserMessages;

  const assistantAwaitingResponse =
    stage === "chat" &&
    messages.length > 0 &&
    messages[messages.length - 1].sender === "assistant";

  const formattedContractBlocks = useMemo(
    () => formatContractText(draft?.ai_draft_text || ""),
    [draft?.ai_draft_text],
  );

  const primaryQuestions = useMemo(
    () => getPrimaryQuestions(draft),
    [draft],
  );

  const requiresMoreInformation =
    pendingRequiredQuestions.length > 0 ||
    (!hasAnyInformation && primaryQuestions.length > 0) ||
    (assistantAwaitingResponse && !hasUserMessages);

  const canGenerateContract =
    !requiresMoreInformation || allowGenerateOverride;

  useEffect(() => {
    console.info("[Workspace] Generate gating snapshot", {
      stage,
      pendingRequiredCount: pendingRequiredQuestions.length,
      primaryQuestionsCount: primaryQuestions.length,
      hasAnyInformation,
      hasFormAnswers,
      hasUserMessages,
      assistantAwaitingResponse,
      allowGenerateOverride,
      requiresMoreInformation,
      canGenerateContract,
      messagesCount: messages.length,
    });
  }, [
    stage,
    pendingRequiredQuestions.length,
    primaryQuestions.length,
    hasAnyInformation,
    hasFormAnswers,
    hasUserMessages,
    assistantAwaitingResponse,
    allowGenerateOverride,
    requiresMoreInformation,
    canGenerateContract,
    messages.length,
  ]);

  useEffect(() => {
    if (!requiresMoreInformation && allowGenerateOverride) {
      setAllowGenerateOverride(false);
    }
  }, [requiresMoreInformation, allowGenerateOverride]);

  const truncatedPending = pendingRequiredQuestions.slice(0, 3);
  const hasMorePending =
    pendingRequiredQuestions.length > truncatedPending.length;
  const showMissingInfoAlert =
    stage === "chat" && requiresMoreInformation && !allowGenerateOverride;

  // Load draft + messages from backend
  useEffect(() => {
    const load = async () => {
      if (!id) return;

      const user = getCurrentUser();
      if (!user) {
        navigate("/login");
        return;
      }

      try {
        setLoading(true);
        const d = (await contractService.getDraft(id)) as BackendContractDraft;

        setDraft(d);
        setAnswers(mergeAnswers(d));
        const msgs = d.chatMessages || [];
        setMessages(msgs);

        // Decide initial stage
        if (d.ai_draft_text) {
          setStage("preview");
        } else if (msgs.length > 0) {
          setStage("chat");
        } else {
          setStage("form");
        }
      } catch (e: any) {
        console.error(e);
        toast({
          title: "Error",
          description:
            e?.message || "Failed to load contract workspace. Redirecting.",
          variant: "destructive",
        });
        navigate("/dashboard");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, navigate, toast]);

  const handleFieldChange = (key: string, value: any) => {
    setAllowGenerateOverride(false);
    setAnswers((prev) => ({ ...prev, [key]: value }));
    // later: PATCH /contracts/:id to persist questionnaire_state on every change
  };

  const handleStartChat = async () => {
    if (!draft || !id) return;

    if (!isFormComplete) {
      toast({
        title: "Missing details",
        description:
          "Please complete all required fields on the Contract Details step before continuing.",
        variant: "destructive",
      });
      return;
    }

    // If there are already messages (e.g. returning to a draft), just go to chat
    if (messages.length > 0) {
      setStage("chat");
      return;
    }

    try {
      setStartingChat(true);
      setAssistantThinking(true);
      const started = (await contractService.startChat(id, {
        answers,
      })) as BackendContractDraft;
      setDraft(started);
      setAnswers((prev) => mergeAnswers(started, prev));
      setMessages(started.chatMessages || []);
      setStage("chat");
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Chat error",
        description:
          err?.message || "Failed to start the assistant conversation.",
        variant: "destructive",
      });
    } finally {
      setAssistantThinking(false);
      setStartingChat(false);
    }
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || !draft || !id) return;

    const outbound = userInput.trim();
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: BackendChatMessage = {
      id: tempId,
      sender: "user",
      message: outbound,
      created_at: new Date().toISOString(),
    };

    try {
      setSending(true);
      setAssistantThinking(true);
      const allUnanswered = (draft.contractType?.questionTemplates || []).filter(
        (q) => !hasAnswerValue(answers[q.questionKey]),
      );
      const requiredUnanswered = allUnanswered.filter((q) => q.isRequired);
      const candidates =
        requiredUnanswered.length > 0 ? requiredUnanswered : allUnanswered;
      const lastAssistantMessage = [...messages]
        .reverse()
        .find((msg) => msg.sender === "assistant");
      const inferredQuestion = inferQuestionFromAssistant(
        lastAssistantMessage?.message,
        candidates,
      );
      const fallbackQuestion =
        !inferredQuestion &&
        messages.length > 0 &&
        messages[messages.length - 1].sender === "assistant"
          ? candidates[0]
          : null;
      const targetQuestion = inferredQuestion ?? fallbackQuestion;

      if (targetQuestion) {
        const coercedValue = coerceAnswerValue(outbound, targetQuestion);
        setAnswers((prev) => ({
          ...prev,
          [targetQuestion.questionKey]: coercedValue,
        }));
      }
      setMessages((prev) => [...prev, optimisticMessage]);
      setUserInput("");

      // Backend:
      // - stores user message
      // - calls mlend to get assistant reply
      // - stores assistant reply
      // - returns updated draft with full chat history
      const updated = (await contractService.addMessage(id, {
        sender: "user",
        message: outbound,
      })) as BackendContractDraft;

      setDraft(updated);
      setAnswers((prev) => mergeAnswers(updated, prev));
      setMessages(updated.chatMessages || []);
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Error",
        description: e?.message || "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setSending(false);
      setTimeout(() => setAssistantThinking(false), 300);
    }
  };

  const handleDownload = async (format: "pdf" | "docx" | "txt") => {
    if (!draft?.ai_draft_text || !id) return;
    try {
      const { blob, filename } = await contractService.downloadDraft(
        id,
        format,
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Download failed",
        description: err?.message || "Unable to download the contract.",
        variant: "destructive",
      });
    }
  };

  const handleConfirmSkip = async () => {
    if (!draft || !id) {
      setSkipDialogOpen(false);
      return;
    }

    try {
      setSkipSummaryLoading(true);
      const assistantSummary = buildPendingInfoMessage(
        pendingRequiredQuestions,
        hasAnyInformation,
        assistantAwaitingResponse,
      );

      if (assistantSummary.trim().length > 0) {
        const updated = (await contractService.addMessage(id, {
          sender: "assistant",
          message: assistantSummary,
        })) as BackendContractDraft;
        setDraft(updated);
        setMessages(updated.chatMessages || []);
      }

      setAllowGenerateOverride(true);
      toast({
        title: "Continuing with missing info",
        description:
          pendingRequiredQuestions.length > 0
            ? "I'll insert placeholders or note assumptions for the unanswered sections."
            : assistantAwaitingResponse
              ? "I'll continue even though I just asked another question. That answer will be missing from the draft."
              : "I'll rely on generic placeholders until you share specific contract details.",
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Unable to continue",
        description:
          err?.message ||
          "Failed to share the missing information summary. Please try again.",
        variant: "destructive",
      });
      return;
    } finally {
      setSkipSummaryLoading(false);
      setSkipDialogOpen(false);
    }
  };

  const handleGenerateContract = async () => {
    if (assistantThinking) {
      toast({
        title: "Still replying",
        description: "Please wait for Lexy to finish responding before generating.",
      });
      return;
    }

    if (sending) {
      toast({
        title: "Sending message",
        description: "Please wait for your message to send before generating.",
      });
      return;
    }

    if (!draft || !id) return;

    if (!isFormComplete && !allowGenerateOverride) {
      toast({
        title: "Missing details",
        description:
          "Please complete all required fields on the Contract Details step before generating.",
        variant: "destructive",
      });
      setStage("form");
      return;
    }

    if (!canGenerateContract) {
      setSkipDialogOpen(true);
      let warningDescription = "";
      if (pendingRequiredQuestions.length > 0) {
        warningDescription =
          "There are still required details to capture. Update them now or confirm you're ready to proceed anyway.";
      } else if (!hasAnyInformation) {
        warningDescription =
          "We haven't captured any specific contract details yet. Share at least one answer or confirm you want a generic draft.";
      } else if (assistantAwaitingResponse) {
        warningDescription =
          "I just asked another question in the chat. Please answer it or confirm you want to skip it before generating.";
      } else {
        warningDescription =
          "Please confirm that you want to proceed without providing additional context.";
      }
      toast({
        title: "Missing answers",
        description: warningDescription,
      });
      return;
    }

    try {
      startGenerationProgress();
      setGenerating(true);

      // Call backend, which calls mlend to generate the full contract text
      const updated = (await contractService.generateContract(id, {
        answers,
      })) as BackendContractDraft;

      setDraft(updated);
      setMessages(updated.chatMessages || []);
      setAnswers((prev) => mergeAnswers(updated, prev));
      setStage("preview");
      finishGenerationProgress("success");
    } catch (e: any) {
      console.error(e);
      finishGenerationProgress("error");
      toast({
        title: "Error",
        description:
          e?.message || "Failed to generate contract. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const renderField = (q: BackendQuestionTemplate) => {
    const value = answers[q.questionKey] ?? "";

    const commonLabel = (
      <Label htmlFor={q.questionKey}>
        {q.label}
        {q.isRequired && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
    );

    switch (q.inputType) {
      case "textarea":
        return (
          <div key={q.id}>
            {commonLabel}
            <Textarea
              id={q.questionKey}
              value={value}
              onChange={(e) => handleFieldChange(q.questionKey, e.target.value)}
              placeholder={q.description || ""}
            />
          </div>
        );

      case "number":
        return (
          <div key={q.id}>
            {commonLabel}
            <Input
              id={q.questionKey}
              type="number"
              value={value}
              onChange={(e) => handleFieldChange(q.questionKey, e.target.value)}
              placeholder={q.description || ""}
            />
          </div>
        );

      case "date":
        return (
          <div key={q.id}>
            {commonLabel}
            <Input
              id={q.questionKey}
              type="date"
              value={value}
              onChange={(e) => handleFieldChange(q.questionKey, e.target.value)}
            />
          </div>
        );

      case "select": {
        const rawChoices =
          (q.options?.choices as string[]) ||
          (Array.isArray(q.options) ? q.options : []);
        return (
          <div key={q.id}>
            {commonLabel}
            <select
              id={q.questionKey}
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={value}
              onChange={(e) => handleFieldChange(q.questionKey, e.target.value)}
            >
              <option value="">Select an option</option>
              {rawChoices.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        );
      }

      case "multi_select": {
        const rawChoices =
          (q.options?.choices as string[]) ||
          (Array.isArray(q.options) ? q.options : []);
        const current: string[] = Array.isArray(value) ? value : [];
        const toggle = (opt: string) => {
          if (current.includes(opt)) {
            handleFieldChange(
              q.questionKey,
              current.filter((v) => v !== opt),
            );
          } else {
            handleFieldChange(q.questionKey, [...current, opt]);
          }
        };

        return (
          <div key={q.id}>
            {commonLabel}
            <div className="mt-2 flex flex-wrap gap-2">
              {rawChoices.map((opt) => {
                const selected = current.includes(opt);
                return (
                  <Button
                    key={opt}
                    type="button"
                    variant={selected ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggle(opt)}
                  >
                    {opt}
                  </Button>
                );
              })}
            </div>
          </div>
        );
      }

      case "text":
      default:
        return (
          <div key={q.id}>
            {commonLabel}
            <Input
              id={q.questionKey}
              value={value}
              onChange={(e) => handleFieldChange(q.questionKey, e.target.value)}
              placeholder={q.description || ""}
            />
          </div>
        );
    }
  };

  const effectiveProgress = generationProgress || (generating ? 10 : 0);
  const showGenerationProgress =
    effectiveProgress > 0 || !!generationStep || generating;
  const generationLabel =
    generationStep ||
    (generating ? "Generating your contract draft..." : "");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <img
                src="/lexgen-logo-transparent.svg"
                alt="Lexgen logo"
                className="h-7 w-7"
              />
              <span className="text-xl font-bold text-foreground">
                {draft?.contractType?.name ||
                  draft?.title ||
                  "Contract Workspace"}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  disabled={!draft?.ai_draft_text}
                  className="bg-gold hover:bg-gold/90 text-background"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleDownload("pdf")}>
                  PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownload("docx")}>
                  DOCX
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownload("txt")}>
                  Text
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-6xl">
        {loading && (
          <p className="text-muted-foreground mb-4">
            Loading contract workspace...
          </p>
        )}

        {/* STEP 1: Contract Details (form only) */}
        {stage === "form" && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Contract Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {primaryQuestions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No form questions configured for this contract type yet.
                  </p>
                ) : (
                  primaryQuestions.map((q) => renderField(q))
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <Button
                  onClick={handleStartChat}
                  disabled={!isFormComplete || startingChat}
                  size="lg"
                  className="px-8"
                >
                  {startingChat ? "Starting chat..." : "Next"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 2: Chat Assistant */}
        {stage === "chat" && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <img
                  src="/lexgen-logo-transparent.svg"
                  alt="Lexgen logo"
                  className="h-6 w-6"
                />
                Contract Details
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Answer our chatbot’s questions or ask it to add/remove clauses.
                When you’re ready, generate your contract draft.
              </p>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {showMissingInfoAlert && (
                <Alert className="bg-amber-50 border-amber-200 text-amber-900">
                  <AlertTitle>
                    {pendingRequiredQuestions.length > 0
                      ? "More information needed"
                      : assistantAwaitingResponse
                        ? "Answer the latest question"
                        : "Share at least one detail"}
                  </AlertTitle>
                  <AlertDescription>
                    {pendingRequiredQuestions.length > 0 ? (
                      <>
                        <p className="text-sm">
                          I still need the following required details before the
                          contract can be generated:
                        </p>
                        <ul className="mt-2 list-disc pl-5 space-y-1 text-sm">
                          {truncatedPending.map((q) => (
                            <li key={q.id} className="leading-snug">
                              {q.label}
                            </li>
                          ))}
                          {hasMorePending && (
                            <li className="leading-snug text-xs italic">
                              +{" "}
                              {pendingRequiredQuestions.length -
                                truncatedPending.length}{" "}
                              more
                            </li>
                          )}
                        </ul>
                      </>
                    ) : assistantAwaitingResponse ? (
                      <p className="text-sm">
                        I just asked another question in the chat. Please answer
                        it or confirm that you want to continue without that
                        detail.
                      </p>
                    ) : (
                      <p className="text-sm">
                        We haven’t captured any contract-specific details yet.
                        Please answer at least one question so the draft is
                        tailored to your scenario, or confirm that you want to
                        continue with a generic template.
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setStage("form")}
                      >
                        Update details
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSkipDialogOpen(true)}
                      >
                        Skip & allow generation
                      </Button>
                    </div>
                    <p className="mt-2 text-xs text-amber-800">
                      Skipping will insert placeholders or generic assumptions
                      for the missing sections.
                    </p>
                  </AlertDescription>
                </Alert>
              )}
              {showGenerationProgress && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 shadow-sm">
                  <div className="flex items-center justify-between text-sm font-medium text-primary">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{generationLabel}</span>
                    </div>
                    <span className="text-xs text-primary/80">
                      {Math.round(effectiveProgress)}%
                    </span>
                  </div>
                  <div className="mt-2">
                    <Progress
                      value={Math.min(effectiveProgress, 100)}
                      className="h-2 bg-primary/10"
                    />
                  </div>
                </div>
              )}
              <ScrollArea className="h-[60vh] min-h-[280px] pr-4">
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.sender === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-2 ${
                          msg.sender === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground"
                        }`}
                      >
                        <p className="text-sm">{msg.message}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {new Date(msg.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {(assistantThinking || startingChat) && (
                    <div className="flex justify-start">
                      <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-3 py-2 shadow-sm">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-primary">
                            Lexifying
                          </p>
                          <div className="mt-1 flex gap-1">
                            <span className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce" />
                            <span className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:0.15s]" />
                            <span className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:0.3s]" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              </ScrollArea>

              <div className="flex gap-2">
                <Input
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && !sending && handleSendMessage()
                  }
                  placeholder="Type your message..."
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  size="icon"
                  disabled={sending}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-4 flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setStage("form")}
                  size="sm"
                  className="text-foreground"
                >
                  Back
                </Button>
                <Button
                  onClick={handleGenerateContract}
                  disabled={
                    generating || !canGenerateContract || assistantThinking || sending
                  }
                  size="lg"
                  className="bg-gold hover:bg-gold/90 text-background font-semibold px-5 gap-2"
                >
                  <img
                    src="/lexgen-logo-transparent.svg"
                    alt="Lexgen logo"
                    className="h-5 w-5 shrink-0 object-contain"
                    style={{ filter: "brightness(0)" }}
                  />
                  <span className="leading-none">
                    {generating ? "Generating..." : "Generate"}
                  </span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 3: Generated Contract Preview */}
        {stage === "preview" && draft?.ai_draft_text && (
          <Card className="bg-white text-black">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-black">
                  <img
                    src="/lexgen-logo-transparent.svg"
                    alt="Lexgen logo"
                    className="h-6 w-6"
                  />
                  Contract Details
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStage("chat")}
                    className="text-foreground"
                  >
                    Back
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateContract}
                    className="border-gold text-gold hover:bg-gold hover:text-background"
                    disabled={generating || !canGenerateContract}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {generating ? "Regenerating..." : "Regenerate"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {showGenerationProgress && (
                <div className="mx-8 mt-8 mb-4 rounded-lg border border-primary/20 bg-primary/5 p-3 shadow-sm">
                  <div className="flex items-center justify-between text-sm font-medium text-primary">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{generationLabel}</span>
                    </div>
                    <span className="text-xs text-primary/80">
                      {Math.round(effectiveProgress)}%
                    </span>
                  </div>
                  <div className="mt-2">
                    <Progress
                      value={Math.min(effectiveProgress, 100)}
                      className="h-2 bg-primary/10"
                    />
                  </div>
                </div>
              )}
              <ScrollArea className="h-[72vh] pr-6">
                <div className="mx-auto w-full max-w-5xl px-6 pb-12">
                  <div className="rounded-2xl border border-slate-200 bg-white shadow-xl">
                    <div className="border-b border-slate-200 px-10 py-8">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                        Lexgen draft
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold text-black">
                        {draft?.title || draft?.contractType?.name || "Contract"}
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Generated {new Date(draft?.updated_at || Date.now()).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="px-10 py-8 space-y-5 font-serif text-[15px] leading-7 text-slate-900">
                      {formattedContractBlocks.length === 0 ? (
                        <p className="text-muted-foreground">
                          No contract text is available yet.
                        </p>
                      ) : (
                        formattedContractBlocks.map((block, idx) => {
                          if (block.type === "heading") {
                            const headingClass =
                              block.level === "main"
                                ? "text-lg font-semibold text-black tracking-wide mt-6 first:mt-0"
                                : "text-base font-semibold text-slate-800 mt-4 first:mt-0";
                            return (
                              <h3
                                key={`${block.content}-${idx}`}
                                className={headingClass}
                              >
                                {renderWithPlaceholders(block.content)}
                              </h3>
                            );
                          }

                          if (block.type === "list") {
                            return (
                              <ul
                                key={`list-${idx}`}
                                className="list-disc pl-6 space-y-1 text-slate-800"
                              >
                                {block.items.map((item, liIdx) => (
                                  <li key={`list-${idx}-${liIdx}`}>
                                    {renderWithPlaceholders(item)}
                                  </li>
                                ))}
                              </ul>
                            );
                          }

                          return (
                            <p key={`paragraph-${idx}`} className="text-slate-800">
                              {renderWithPlaceholders(block.content)}
                            </p>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </main>

      <AlertDialog open={skipDialogOpen} onOpenChange={setSkipDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Generate without all details?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground space-y-3">
              {pendingRequiredQuestions.length > 0 ? (
                <>
                  <div>
                    I am still missing the following required inputs:
                    <ul className="mt-2 list-disc pl-5 space-y-1 text-foreground">
                      {pendingRequiredQuestions.map((q) => (
                        <li key={q.id}>{q.label}</li>
                      ))}
                    </ul>
                  </div>
                  <p>
                    If you continue, those sections will include placeholders or
                    generic language. You can edit your answers later and
                    regenerate the contract.
                  </p>
                </>
              ) : assistantAwaitingResponse ? (
                <>
                  <p>
                    I just sent you another clarifying question. If you continue
                    without answering, the contract will not include that detail.
                  </p>
                  <p>
                    You can message me again later with the missing information
                    and regenerate the draft.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    We haven’t captured any contract-specific information yet.
                    The draft will be a very generic template with placeholder
                    names, dates, and fees.
                  </p>
                  <p>
                    You can always come back, add the missing information, and
                    regenerate the contract once you’re ready.
                  </p>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={skipSummaryLoading}>
              Keep collecting info
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={skipSummaryLoading}
              onClick={handleConfirmSkip}
            >
              {skipSummaryLoading ? "Preparing..." : "Proceed anyway"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
