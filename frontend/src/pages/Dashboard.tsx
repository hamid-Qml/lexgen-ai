import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, getContractDrafts, setCurrentUser, seedSampleDrafts } from '@/lib/storage';
import { ContractDraft } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus, LogOut } from 'lucide-react';
import { contractService } from "@/services/contractService";

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
        console.error("Failed to load drafts:", e);
      }
    };
    load();
  }, []);

  const handleLogout = () => {
    setCurrentUser(null);
    navigate('/login');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-muted text-muted-foreground';
      case 'generated': return 'bg-accent text-accent-foreground';
      case 'finalized': return 'bg-primary text-primary-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold text-foreground">Monoxy</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {user?.full_name} ({user?.subscription_tier})
            </span>
            <Button variant="ghost" size="sm" onClick={() => navigate('/profile')}>
              Profile
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/subscriptions')}>
              Subscriptions
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Your Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your contracts and start new drafts
          </p>
        </div>

        {/* Start New Contract Button */}
        <Card className="mb-8 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create New Contract
            </CardTitle>
            <CardDescription>
              Choose from 170+ contract templates tailored to Australian law
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => navigate('/contracts/new')}
              className="bg-gold hover:bg-gold/90 text-background font-semibold"
            >
              Start New Contract
            </Button>
          </CardContent>
        </Card>

        {/* Contract Drafts List */}
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Recent Contracts ({drafts.length})
          </h2>
          {drafts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No contracts yet. Start your first contract to get started.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {drafts.map((draft) => (
                <Card
                  key={draft.id}
                  className="cursor-pointer hover:border-primary/40 transition-all"
                  onClick={() => navigate(`/contracts/${draft.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{draft.contract_type_name}</CardTitle>
                      <Badge className={getStatusColor(draft.status)}>
                        {draft.status}
                      </Badge>
                    </div>
                    <CardDescription>
                      Updated: {new Date(draft.updated_at).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {draft.ai_draft_text ?
                        draft.ai_draft_text.substring(0, 100) + '...' :
                        'Draft in progress...'
                      }
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
