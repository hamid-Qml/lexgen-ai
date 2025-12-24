import { useState } from "react";
import UpArrow from "../../../public/uparrow.svg";
import DownArrow from "../../../public/downarrow.svg";

type QnAProps = {
  question?: string;
  answer?: string;
};

export default function QnA({
  question = "Lorem ipsum dolor sit amet?",
  answer = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
}: QnAProps) {
  const [isClosed, setIsClosed] = useState(true);

  return (
    <div className="flex flex-col w-[746px] gap-4 p-6 rounded-[28px] border-[1px] border-white/30">
      <div className="flex flex-row justify-between">
        <h4 className="font-medium text-[24px]">{question}</h4>
        <img
          src={!isClosed ? UpArrow : DownArrow}
          width="40px"
          height="40px"
          onClick={() => setIsClosed(!isClosed)}
        />
      </div>
      {!isClosed ? <p className="text-[18px] text-white/50">{answer}</p> : ""}
    </div>
  );
}
