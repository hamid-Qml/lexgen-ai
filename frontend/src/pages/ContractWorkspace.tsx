// src/pages/ContractWorkspace.tsx
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getCurrentUser } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

// We keep these as `any` for now to avoid breaking the existing types.
// Later you can update `ContractDraft` and `ChatMessage` in `@/types` to match the backend.
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
    complexityLevel: "basic" | "standard" | "complex";
  };
  chatMessages?: BackendChatMessage[];
  created_at: string;
  updated_at: string;
};

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

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll chat to bottom when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

        // If no messages yet, seed a greeting from assistant
        if (msgs.length === 0) {
          const greetingText = `Hi! I'm here to help you create your ${
            d.contractType?.name || "contract"
          }. Fill out the form above with the basic details, and feel free to ask me any questions about terms, clauses, or legal requirements. Once you're ready, click "Generate Contract" to create your document.`;

          const updated = (await contractService.addMessage(id, {
            sender: "assistant",
            message: greetingText,
          })) as BackendContractDraft;

          setDraft(updated);
          setMessages(updated.chatMessages || []);
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

  const handleSendMessage = async () => {
    if (!userInput.trim() || !draft || !id) return;

    try {
      setSending(true);

      // Persist user message to backend
      const updated = (await contractService.addMessage(id, {
        sender: "user",
        message: userInput.trim(),
      })) as BackendContractDraft;

      setDraft(updated);
      setMessages(updated.chatMessages || []);
      setUserInput("");

      // (Optional) local assistant reply for now – not persisted.
      // You can later replace this with a real AI call + another addMessage().
      const assistantMessage: BackendChatMessage = {
        id: `${Date.now()}-assistant`,
        sender: "assistant",
        message:
          "I understand your question. For specific legal advice, please consult a qualified lawyer. I can help you understand the general structure and common clauses in this type of contract. What specific aspect would you like to know more about?",
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
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

  const handleFieldChange = (field: string, value: string) => {
    const newAnswers = { ...answers, [field]: value };
    setAnswers(newAnswers);

    // NOTE:
    // Right now this only updates local state.
    // Later we can add PATCH /contracts/:id to persist questionnaire_state.
  };

  const isFormComplete =
    answers.party1Name && answers.party2Name && answers.startDate && answers.jurisdiction;

  // Simple local generator until backend AI is wired
  const generateLocalContract = () => {
    const title =
      draft?.contractType?.name || draft?.title || "Contract Agreement";
    const party1 = answers.party1Name || "Party A";
    const party2 = answers.party2Name || "Party B";
    const startDate = answers.startDate || "the Commencement Date";
    const term = answers.term || "the agreed term";
    const fees = answers.fees || "the agreed fees";
    const jurisdiction =
      answers.jurisdiction || "the relevant Australian jurisdiction";

    return `${title.toUpperCase()}

This Agreement is made between:

FIRST PARTY: ${party1}
SECOND PARTY: ${party2}

EFFECTIVE DATE
This Agreement commences on ${startDate} and continues for ${term}, unless terminated earlier in accordance with this Agreement.

FEES / CONSIDERATION
The consideration payable under this Agreement is ${fees}.

GOVERNING LAW
This Agreement is governed by the laws of ${jurisdiction}.

DISCLAIMER
This document is generated by an AI-assisted prototype and does not constitute legal advice. You should obtain independent legal advice from a qualified lawyer before using or relying on this document.
`;
  };

  const handleGenerateContract = () => {
    if (!draft || !id) return;
    if (!isFormComplete) return;

    setGenerating(true);
    try {
      const generatedText = generateLocalContract();

      // Local-only update for now (no backend endpoint yet)
      const updated: BackendContractDraft = {
        ...draft,
        ai_draft_text: generatedText,
        status: "ready_for_review",
        questionnaire_state: answers,
        updated_at: new Date().toISOString(),
      };

      setDraft(updated);

      const assistantMessage: BackendChatMessage = {
        id: `${Date.now()}-assistant-generated`,
        sender: "assistant",
        message:
          "Your contract has been generated! Review it below and click 'Download' when you're ready. You can also regenerate it if you want to update any details.",
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold text-foreground">
                {draft?.contractType?.name || draft?.title || "Contract Workspace"}
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

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-6xl">
        {loading && (
          <p className="text-muted-foreground mb-4">Loading contract workspace...</p>
        )}

        {/* Contract Details Form */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Contract Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="party1Name">First Party Name *</Label>
                <Input
                  id="party1Name"
                  value={answers.party1Name || ""}
                  onChange={(e) => handleFieldChange("party1Name", e.target.value)}
                  placeholder="e.g., Acme Corporation Pty Ltd"
                />
              </div>
              <div>
                <Label htmlFor="party1Address">First Party Address</Label>
                <Input
                  id="party1Address"
                  value={answers.party1Address || ""}
                  onChange={(e) => handleFieldChange("party1Address", e.target.value)}
                  placeholder="e.g., Level 5, 123 Business St, Sydney"
                />
              </div>
              <div>
                <Label htmlFor="party2Name">Second Party Name *</Label>
                <Input
                  id="party2Name"
                  value={answers.party2Name || ""}
                  onChange={(e) => handleFieldChange("party2Name", e.target.value)}
                  placeholder="e.g., Tech Innovations Pty Ltd"
                />
              </div>
              <div>
                <Label htmlFor="party2Address">Second Party Address</Label>
                <Input
                  id="party2Address"
                  value={answers.party2Address || ""}
                  onChange={(e) => handleFieldChange("party2Address", e.target.value)}
                  placeholder="e.g., Suite 10, 456 Innovation Rd, Melbourne"
                />
              </div>
              <div>
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={answers.startDate || ""}
                  onChange={(e) => handleFieldChange("startDate", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="term">Contract Term</Label>
                <Input
                  id="term"
                  value={answers.term || ""}
                  onChange={(e) => handleFieldChange("term", e.target.value)}
                  placeholder="e.g., 12 months"
                />
              </div>
              <div>
                <Label htmlFor="fees">Fees / Consideration</Label>
                <Input
                  id="fees"
                  value={answers.fees || ""}
                  onChange={(e) => handleFieldChange("fees", e.target.value)}
                  placeholder="e.g., $50,000 AUD"
                />
              </div>
              <div>
                <Label htmlFor="jurisdiction">Governing Law / Jurisdiction *</Label>
                <Input
                  id="jurisdiction"
                  value={answers.jurisdiction || ""}
                  onChange={(e) => handleFieldChange("jurisdiction", e.target.value)}
                  placeholder="e.g., New South Wales"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-center">
              <Button
                onClick={handleGenerateContract}
                disabled={!isFormComplete || generating}
                size="lg"
                className="bg-gold hover:bg-gold/90 text-background font-semibold px-8"
              >
                <Sparkles className="h-5 w-5 mr-2" />
                {generating
                  ? "Generating..."
                  : draft?.ai_draft_text
                  ? "Regenerate Contract"
                  : "Generate Contract"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Chat Assistant */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Contract Assistant</CardTitle>
            <p className="text-sm text-muted-foreground">
              Ask questions about contract terms, clauses, or legal requirements
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {/* Chat Messages */}
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

            {/* Input Area */}
            <div className="flex gap-2">
              <Input
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !sending && handleSendMessage()}
                placeholder="Ask a question about your contract..."
                className="flex-1"
              />
              <Button onClick={handleSendMessage} size="icon" disabled={sending}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Contract Preview */}
        {draft?.ai_draft_text && (
          <Card className="bg-white text-black">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-black">Generated Contract</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateContract}
                  className="border-gold text-gold hover:bg-gold hover:text-background"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerate
                </Button>
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
