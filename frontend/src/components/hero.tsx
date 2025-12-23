import HeroBg from "../../public/Hero.png";
import Eye from "../../public/Eye.svg";
import Dot from "../../public/DotOutline.svg";
import Lock from "../../public/Lock.svg";
import Medal from "../../public/Medal.svg";
import ShieldIcon from "../../public/ShieldCheck.svg";

export default function Hero() {
  return (
    <div className="flex items-center justify-center relative mt-14">
      <div className="absolute inset-0">
        <img src={HeroBg} className="w-full h-full object-fit" />
      </div>
      <div className="flex flex-col items-center w-[834px] mt-14 gap-12 px-2 py-4 z-10">
        <div className="flex flex-col items-center justify-center gap-4">
          <h1 className="text-[64px] font-medium">
            Contract Review in <br />
            Minutes, Not Days
          </h1>
          <p className="font-normal text-center text-[18px]">
            AI-powered legal review that actually works. Every answer cites its
            source. <br />
            Built on 30 years of verified legal documents.
          </p>
          <div className="flex items-center gap-4">
            <button className="text-sm rounded-full px-4 py-3 bg-secondary border-[1px] font-medium h-10 flex items-center justify-center">
              Request demo
            </button>
            <button className="text-sm rounded-full gap-2 px-4 py-3 border-white border-[1px] font-medium h-10 flex items-center justify-center">
              Watch a 90-sec demo
            </button>
          </div>
        </div>
        <div
          className="bg-secondary-button-bg/30 text-sm rounded-full w-fit gap-3 px-6 py-2
          font-medium h-10 flex items-center justify-center text-[16px]"
        >
          <img src={Eye} width="16px" height="16px" />
          <p>Zero hallucinations</p>
          <img src={Dot} width="16px" height="16px" />
          <p>Every answer cites is sources</p>
        </div>

        <div className="flex items-center justify-center gap-4">
          <div
            className="flex items-center justify-center w-fit gap-2 font-semibold bg-black px-4 py-3
                        rounded-full border-white border-[1px] bg-black/50"
          >
            <img src={Lock} width="16px" height="16px" />
            <p className="text-sm">SOC 2 Compliant</p>
            <p className="text-[11px] rounded-full bg-secondary px-[6px] py-[2px] font-normal">
              Coming soon
            </p>
          </div>

          <div
            className="flex items-center justify-center w-fit gap-2 font-semibold px-4 py-3
                        rounded-full bg-secondary/25"
          >
            <img src={ShieldIcon} width="16px" height="16px" />
            <p className="text-sm">256-Bit Encryption</p>
          </div>

          <div
            className="flex items-center justify-center w-fit gap-2 font-semibold bg-black px-4 py-3
                        rounded-full border-white border-[1px] bg-black/50"
          >
            <img src={Medal} width="16px" height="16px" />
            <p className="text-sm">GDPR Certified</p>
            <p className="text-[11px] rounded-full bg-secondary px-[6px] py-[2px] font-normal">
              Coming soon
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
