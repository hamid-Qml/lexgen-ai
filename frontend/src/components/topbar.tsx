import { Button } from "./ui/button";
import Logo from "../../public/lexgen-logo-transparent.svg";
import ArrowRight from "../../public/ArrowRight.svg";
import { useNavigate } from "react-router-dom";

export default function TopBar() {
  const navigate = useNavigate();
  return (
    <div className="container px-10 h-[106px] py-6 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <img src={Logo} width="56px" height="56px" />
        <span className="text-2xl font-semibold text-foreground">LeXgen</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          className="text-sm rounded-full gap-2 px-4 py-3 border-white border-[1px] font-medium h-10 flex items-center justify-center"
          onClick={() => navigate("/login")}
        >
          Login
          <img src={ArrowRight} width="20px" height="20px" />
        </button>
        <button
          className="text-sm rounded-full px-4 py-3 bg-secondary border-[1px] font-medium h-10 flex items-center justify-center"
          onClick={() => navigate("/signup")}
        >
          Create Account
        </button>
      </div>
    </div>
  );
}
