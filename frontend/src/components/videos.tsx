export default function Videos() {
  return (
    <div className="flex flex-col px-6 gap-12 mb-24 items-center">
      <div className="flex flex-col gap-4 items-center justify-center text-center">
        <h2 className="font-medium text-[48px]">More from LeXgen</h2>
        <p className="text-white/50 text-[18px]">
          Explore more features and capabilities
        </p>
      </div>
      <div className="grid grid-cols-3 grid-rows-2 gap-6">
        <iframe
          src={`https://www.youtube.com/embed/x_POLxxRRxg`}
          className="w-[390px] h-[218px] rounded"
        />
        <iframe
          src={`https://www.youtube.com/embed/QRdIW1g-EeE`}
          className="w-[390px] h-[218px] rounded"
        />
        <iframe
          src={`https://www.youtube.com/embed/8xAN6eVPzeM`}
          className="w-[390px] h-[218px] rounded"
        />
        <iframe
          src={`https://www.youtube.com/embed/2P4SUZ_cGm8`}
          className="w-[390px] h-[218px] rounded"
        />
        <iframe
          src={`https://www.youtube.com/embed/2MIrurFR1wE`}
          className="w-[390px] h-[218px] rounded"
        />
        <iframe
          src={`https://www.youtube.com/embed/sQeu2FZgF_0`}
          className="w-[390px] h-[218px] rounded"
        />
      </div>
      <button
        className="flex flex-row gap-2 w-fit text-sm rounded-full px-6 py-[10px] bg-secondary border-[1px] font-medium h-10 items-center justify-center"
        onClick={() =>
          window.open("https://www.youtube.com/@Lexgen-lab", "_blank")
        }
      >
        Watch all videos on Youtube
        <img src="/ArrowRight.svg" width="20px" height="20px" />
      </button>
    </div>
  );
}
