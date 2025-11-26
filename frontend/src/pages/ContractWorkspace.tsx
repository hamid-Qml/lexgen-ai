// src/pages/ContractWorkspace.tsx
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getCurrentUser } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  Send,
  Download,
  RefreshCw,
  FileText,
  Sparkles,
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
  };
  chatMessages?: BackendChatMessage[];
  created_at: string;
  updated_at: string;
};

type Stage = "form" | "chat" | "preview";

export default function ContractWorkspace() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [draft, setDraft] = useState<BackendContractDraft | null>(null);
  const [messages, setMessages] = useState<BackendChatMessage[]>([]);
  const [userInput, setUserInput] = useState("");
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [startingChat, setStartingChat] = useState(false);
  const [stage, setStage] = useState<Stage>("form");

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll chat to bottom when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    if (primary.length === 0) return false;

    return primary
      .filter((q) => q.isRequired)
      .every((q) => {
        const v = answers[q.questionKey];
        if (v === null || v === undefined) return false;
        if (Array.isArray(v)) return v.length > 0;
        return String(v).trim().length > 0;
      });
  })();

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
        setAnswers(d.questionnaire_state || {});
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
      const started = (await contractService.startChat(id)) as BackendContractDraft;
      setDraft(started);
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
      setStartingChat(false);
    }
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || !draft || !id) return;

    try {
      setSending(true);

      // Backend:
      // - stores user message
      // - calls mlend to get assistant reply
      // - stores assistant reply
      // - returns updated draft with full chat history
      const updated = (await contractService.addMessage(id, {
        sender: "user",
        message: userInput.trim(),
      })) as BackendContractDraft;

      setDraft(updated);
      setMessages(updated.chatMessages || []);
      setUserInput("");
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Error",
        description: e?.message || "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleDownload = () => {
    if (!draft?.ai_draft_text) return;

    const blob = new Blob([draft.ai_draft_text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const baseName =
      draft.contractType?.name || draft.title || "generated_contract";
    a.href = url;
    a.download = `${baseName.replace(/\s+/g, "_")}_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleGenerateContract = async () => {
    if (!draft || !id) return;

    if (!isFormComplete) {
      toast({
        title: "Missing details",
        description:
          "Please complete all required fields on the Contract Details step before generating.",
        variant: "destructive",
      });
      setStage("form");
      return;
    }

    try {
      setGenerating(true);

      // Call backend, which calls mlend to generate the full contract text
      const updated = (await contractService.generateContract(id, {
        answers,
      })) as BackendContractDraft;

      setDraft(updated);
      setMessages(updated.chatMessages || []);
      setStage("preview");
    } catch (e: any) {
      console.error(e);
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

  const primaryQuestions = getPrimaryQuestions(draft);

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
              <FileText className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold text-foreground">
                {draft?.contractType?.name ||
                  draft?.title ||
                  "Contract Workspace"}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleDownload}
              disabled={!draft?.ai_draft_text}
              className="bg-gold hover:bg-gold/90 text-background"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
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
              <CardTitle>Contract Details</CardTitle>
              <p className="text-sm text-muted-foreground">
                Answer our chatbot’s questions or ask it to add/remove clauses.
                When you’re ready, generate your contract draft.
              </p>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <ScrollArea className="h-[300px] pr-4">
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
                >
                  Back
                </Button>
                <Button
                  onClick={handleGenerateContract}
                  disabled={generating}
                  size="lg"
                  className="bg-gold hover:bg-gold/90 text-background font-semibold px-8"
                >
                  <Sparkles className="h-5 w-5 mr-2" />
                  {generating ? "Generating..." : "Generate Contract"}
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
                <CardTitle className="text-black">Contract Details</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStage("chat")}
                  >
                    Back
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateContract}
                    className="border-gold text-gold hover:bg-gold hover:text-background"
                    disabled={generating}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {generating ? "Regenerating..." : "Regenerate"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <div className="max-w-4xl mx-auto">
                <pre className="text-sm whitespace-pre-wrap font-serif leading-relaxed text-black">
                  {draft.ai_draft_text}
                </pre>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
