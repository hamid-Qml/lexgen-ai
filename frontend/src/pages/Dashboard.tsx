import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, setCurrentUser } from '@/lib/storage';
import { ContractDraft, ContractStatus } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus, LogOut } from 'lucide-react';
import { contractService } from '@/services/contractService';

export default function Dashboard() {
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState<ContractDraft[]>([]);
  const [user, setUser] = useState(getCurrentUser());

  useEffect(() => {
    const load = async () => {
      try {
        const drafts = await contractService.listMyDrafts(10);
        setDrafts(drafts);
      } catch (e) {
        console.error('Failed to load drafts:', e);
      }
    };
    load();
  }, []);

  const handleLogout = () => {
    setCurrentUser(null);
    navigate('/login');
  };

  // Map backend statuses → badge styles + labels that match Figma
  const getStatusMeta = (status: ContractStatus) => {
    switch (status) {
      case 'in_progress':
        return {
          label: 'draft',
          className: 'bg-muted text-muted-foreground',
        };
      case 'ready_for_review':
        return {
          label: 'generated',
          className: 'bg-accent text-accent-foreground',
        };
      case 'finalized':
        return {
          label: 'finalised',
          className: 'bg-primary text-primary-foreground',
        };
      default:
        return {
          label: status,
          className: 'bg-muted text-muted-foreground',
        };
    }
  };

  const getBodyText = (draft: ContractDraft) => {
    if (draft.status === 'in_progress' || !draft.ai_draft_text) {
      return 'Draft in progress...';
    }

    const flat = draft.ai_draft_text.replace(/\s+/g, ' ').trim();
    if (!flat) return 'Draft in progress...';

    const maxLen = 140;
    return flat.length > maxLen ? `${flat.slice(0, maxLen)}…` : flat;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-card/60 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src="/lexgen-logo-transparent.svg"
              alt="Lexy"
              className="h-8 w-8"
            />
            <span className="text-xl font-semibold tracking-wide text-foreground">
              Lexy
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-3 rounded-full bg-white/5 border border-white/10 px-3 py-2 backdrop-blur">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/70 to-accent/70 flex items-center justify-center text-sm font-semibold text-background uppercase">
                {(user?.full_name || user?.email || "LX")
                  .split(" ")
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)}
              </div>
              <div className="leading-tight">
                <div className="text-foreground font-semibold">
                  {user?.full_name || user?.email || "Guest"}
                </div>
                <div className="text-[11px] text-white/60 capitalize">
                  {user?.subscription_tier || "free"} plan
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-white/20 bg-card/60 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20 transition-all duration-200"
              onClick={() => navigate('/profile')}
            >
              Profile
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-white/20 bg-card/60 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20 transition-all duration-200"
              onClick={() => navigate('/subscriptions')}
            >
              Subscriptions
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="hover:-translate-y-0.5 transition-transform duration-200"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-1">
            Your Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your contracts and start new drafts
          </p>
        </div>

        {/* Start New Contract Button */}
        <Card className="mb-8 border-primary/15 bg-gradient-to-br from-primary/5 to-accent/5 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-medium">
              <Plus className="h-5 w-5" />
              Create New Contract
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Choose from 170+ contract templates tailored to Australian law
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => navigate('/contracts/new')}
              className="bg-gold text-background font-semibold px-6 transition-all duration-200 hover:-translate-y-0.5 hover:bg-gold/90 hover:shadow-lg hover:shadow-gold/30 focus-visible:translate-y-0"
            >
              Start New Contract
            </Button>
          </CardContent>
        </Card>

        {/* Contract Drafts List */}
        <div>
          <h2 className="text-lg font-medium text-foreground mb-4">
            Recent Contracts ({drafts.length})
          </h2>

          {drafts.length === 0 ? (
            <Card className="border-dashed border-border/60">
              <CardContent className="py-12 text-center">
                <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">
                  No contracts yet. Start your first contract to get started.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {drafts.map((draft) => {
                const { label, className } = getStatusMeta(draft.status);
                return (
                  <Card
                    key={draft.id}
                    className="cursor-pointer hover:border-primary/40 hover:shadow-md transition-all"
                    onClick={() => navigate(`/contracts/${draft.id}`)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-sm font-medium">
                          {draft.title || draft.contract_type_name}
                        </CardTitle>
                        <Badge className={`capitalize text-xs ${className}`}>
                          {label}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs mt-1">
                        Updated: {new Date(draft.updated_at).toLocaleDateString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-2">
                        {getBodyText(draft)}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
