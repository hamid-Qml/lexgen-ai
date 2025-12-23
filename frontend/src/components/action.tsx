import UiAi from "../../public/ui-ai.svg";
import Caution from "../../public/caution.svg";

export default function Action() {
  return (
    <div className="flex flex-col px-12 py-24 gap-12">
      <div className="flex flex-col gap-4 max-w-[1300px] px-12 py-24">
        <h2 className="text-[48px] font-medium text-white">
          See LeXgen in Action
        </h2>
        <p className="text-[18px] text-white/50">
          Watch how Lexy analyzes contracts, cites sources, and flags risks in
          real-time
        </p>
      </div>
      <div className="flex flex-row items-center justify-center max-w-[1300px] gap-6">
        <div className="flex flex-col gap-6">
          <div className="flex flex-row gap-6">
            <div
              className="flex flex-col justify-center rounded-[28px]
              border-[1px] bg-card border-card-border gap-6 p-6 w-[295px]"
            >
              <img src={Caution} width="80px" height="80px" />
              <p className="text-white text-[20px] font-medium">
                Identifies risky clauses automatically
              </p>
            </div>
            <div
              className="flex flex-col justify-center rounded-[28px]
              border-[1px] bg-card border-card-border gap-6 p-6 w-[295px]"
            >
              <img src={Caution} width="80px" height="80px" />
              <p className="text-white text-[20px] font-medium">
                Cites exact source locations for every finding
              </p>
            </div>
          </div>
          <div className="flex flex-row gap-6">
            <div
              className="flex flex-col justify-center rounded-[28px]
              border-[1px] bg-card border-card-border gap-6 p-6 w-[295px]"
            >
              <img src={Caution} width="80px" height="80px" />
              <p className="text-white text-[20px] font-medium">
                Provides actionable remediation suggestions
              </p>
            </div>
            <div
              className="flex flex-col justify-center rounded-[28px]
              border-[1px] bg-card border-card-border gap-6 p-6 w-[295px]"
            >
              <img src={Caution} width="80px" height="80px" />
              <p className="text-white text-[20px] font-medium">
                Works with any contract format instantly
              </p>
            </div>
          </div>
        </div>
        <div>
          <img src={UiAi} width="614px" height="440px" />
        </div>
      </div>
    </div>
  );
}
