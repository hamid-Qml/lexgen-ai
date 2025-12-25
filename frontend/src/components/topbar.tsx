import { useNavigate } from "react-router-dom";

export default function TopBar() {
  const navigate = useNavigate();
  return (
    <div className="container px-10 h-[106px] py-6 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <img src="/lexgen-logo-transparent.svg" width="56px" height="56px" />
        <span className="text-2xl font-semibold text-foreground">LeXgen</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          className="text-sm rounded-full gap-2 px-4 py-3 border-white border-[1px] font-medium h-10 flex items-center justify-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-white/20 hover:bg-white/10"
          onClick={() => navigate("/login")}
        >
          Login
          <img src="/ArrowRight.svg" width="20px" height="20px" />
        </button>
        <button
          className="text-sm rounded-full px-4 py-3 bg-secondary border-[1px] font-medium h-10 flex items-center justify-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-secondary/30 hover:bg-secondary/80"
          onClick={() => navigate("/signup")}
        >
          Create Account
        </button>
      </div>
    </div>
  );
}
