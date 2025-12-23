import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { FileText, Sparkles, Shield, Zap } from "lucide-react";
import TopBar from "@/components/topbar";
import Hero from "@/components/hero";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center w-full">
      <div className="w-full bg-background max-w-[4096px] min-w-[1080px]">
        <nav>
          <TopBar />
        </nav>
        <Hero />
      </div>
    </div>
  );
};

export default Landing;
