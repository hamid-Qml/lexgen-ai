export default function Trust() {
  return (
    <div className="flex flex-col items-center justify-between  text-white mt-24 py-24 px-12 gap-12">
      <div className="felx flex-col items-center justify-center gap-3">
        <h2 className="font-medium text-[48px]">
          Trusted by Growing Businesses
        </h2>
        <p className="text-center text-[18px] text-white/50">
          Real results from business leaders using LeXgen daily
        </p>
      </div>
      <div className="flex flex-col items-center justify-center w-[895px]">
        <p className="font-medium text-[36px] text-center">
          <span className="text-secondary">|</span> "Saved us $150K in the first
          month alone by catching compliance issues early. We're now reviewing
          contracts 80% faster across the organization."
        </p>
        <p className="text-center text-[16px] mt-6">Richard McDonnell</p>
        <p className="text-white/50 text-[12px] mt-2">
          Director at McDonnell McPhee & Associates
        </p>
      </div>
    </div>
  );
}
