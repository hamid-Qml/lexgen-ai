import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { FileText, Sparkles, Shield, Zap } from 'lucide-react';
import TopBar from '@/components/topbar';
import Hero from '@/components/hero';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <nav>
        <TopBar />
      </nav>
      <Hero />
    </div>
  );
};

export default Landing;
