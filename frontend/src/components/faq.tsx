type QA = { question: string; answer: string };

const QAS: QA[] = [
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes. You can cancel from the billing portal and you'll keep access until the end of the current billing period.",
  },
  {
    question: "Do you support DOCX and PDF uploads?",
    answer:
      "Absolutely. Lexy ingests DOCX and PDF contracts, extracts the clauses, and returns annotated findings with citations.",
  },
  {
    question: "Is my data secure?",
    answer:
      "We encrypt data in transit and at rest. No training on your data, and strict access controls for your workspace.",
  },
  {
    question: "How accurate is the AI?",
    answer:
      "Each finding includes the exact source reference. Models are tuned on verified legal documents and continuously evaluated.",
  },
  {
    question: "Do you offer team plans?",
    answer:
      "Yes. Business includes team workspaces, shared templates, and priority support. Contact us for tailored pricing.",
  },
];

function QABox({ qa }: { qa: QA }) {
  return (
    <div className="rounded-[16px] border border-card-border bg-card/70 px-5 py-4 text-left">
      <p className="text-[18px] font-semibold mb-2 text-white">{qa.question}</p>
      <p className="text-[14px] text-white/70 leading-relaxed">{qa.answer}</p>
    </div>
  );
}

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
      <div className="flex flex-col gap-4 w-full max-w-[520px]">
        {QAS.map((qa) => (
          <QABox key={qa.question} qa={qa} />
        ))}
      </div>
    </div>
  );
}
