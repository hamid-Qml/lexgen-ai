import QnA from "./ui/qabox";

export default function FAQs() {
  return (
    <div className="flex flex-row px-12 py-24 gap-12 text-white justify-between">
      <div className="flex flex-col max-w-[626px]">
        <h2 className="font-medium text-[48px]">
          Frequently <br /> Asked Questions
        </h2>
        <p className="text-[18px] text-white/50">
          Have another question? Please contact our team!
        </p>
      </div>
      <div className="flex flex-col gap-6 font-medium text-[24px]">
        <QnA />
        <QnA />
        <QnA />
        <QnA />
        <QnA />
      </div>
    </div>
  );
}
