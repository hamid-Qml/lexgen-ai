import { useNavigate } from "react-router-dom";

type Props = {
  children: React.ReactNode;
  eyebrow?: string;
  title?: string;
  description?: string;
};

export default function AuthShell({ children, eyebrow, title, description }: Props) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-[#0c1528] to-[#0b1020] text-foreground">
      <header className="border-b border-white/5">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <button
            className="flex items-center gap-3 hover:opacity-90 transition"
            onClick={() => navigate("/")}
            aria-label="Go to homepage"
          >
            <img src="/lexgen-logo-transparent.svg" alt="Lexy logo" className="h-10 w-10" />
            <div className="flex flex-col items-start">
              <span className="text-lg font-semibold">Lexy</span>
              <span className="text-xs text-white/60">AI Contract OS</span>
            </div>
          </button>
          <div className="hidden sm:flex items-center gap-4 text-sm text-white/70">
            <span className="rounded-full bg-white/10 px-3 py-1">Secure by design</span>
            <span className="rounded-full bg-white/10 px-3 py-1">Zero hallucinations</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-10 flex justify-center">
        <div className="w-full max-w-3xl">
          {(eyebrow || title || description) && (
            <div className="mb-6 text-center space-y-2">
              {eyebrow && (
                <p className="text-xs uppercase tracking-[0.2em] text-white/60">{eyebrow}</p>
              )}
              {title && <h1 className="text-3xl font-semibold">{title}</h1>}
              {description && <p className="text-sm text-white/60">{description}</p>}
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
