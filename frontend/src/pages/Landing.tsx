import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { FileText, Sparkles, Shield, Zap } from 'lucide-react';
import TopBar from '@/components/topbar';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <nav>
        <TopBar />
      </nav>

      <main className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-foreground mb-6">
            AI-Powered Contract Generation
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Create professional legal contracts in minutes with our intelligent assistant.
            170+ contract types, tailored to Australian law.
          </p>
          <Button
            size="lg"
            className="bg-gold text-gold-foreground hover:bg-gold/90 text-lg px-8"
            onClick={() => navigate('/signup')}
          >
            Start Free Trial
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mt-20 max-w-5xl mx-auto">
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="h-12 w-12 bg-primary/20 rounded-lg flex items-center justify-center mb-4">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">AI-Powered</h3>
            <p className="text-muted-foreground">
              Advanced AI asks the right questions and generates precise contracts tailored to your needs.
            </p>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <div className="h-12 w-12 bg-accent/20 rounded-lg flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-accent" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Legally Sound</h3>
            <p className="text-muted-foreground">
              Templates based on Australian law with comprehensive clauses covering all essential terms.
            </p>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <div className="h-12 w-12 bg-gold/20 rounded-lg flex items-center justify-center mb-4">
              <Zap className="h-6 w-6 text-gold" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Lightning Fast</h3>
            <p className="text-muted-foreground">
              Generate complete contracts in minutes, not hours. Download as PDF or DOCX instantly.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Landing;
