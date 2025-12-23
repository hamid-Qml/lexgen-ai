export default function Stats() {
  return (
    <div className="flex flex-row gap-6 items-center justify-center px-24 mb-24">
      <div className="flex flex-col items-center justify-center w-[288px] gap-2 p-6 rounded-[28px] bg-card border-[1px] border-card-border">
        <p className="font-medium text-[57px] text-secondary">80%</p>
        <p className="font-medium text-[20px] text-white">Faster Review Time</p>
      </div>
      <div className="flex flex-col items-center justify-center w-[288px] gap-2 p-6 rounded-[28px] bg-card border-[1px] border-card-border">
        <p className="font-medium text-[57px] text-secondary">$150K+</p>
        <p className="font-medium text-[20px] text-white">
          Avg. Savings Per Year
        </p>
      </div>
      <div className="flex flex-col items-center justify-center w-[288px] gap-2 p-6 rounded-[28px] bg-card border-[1px] border-card-border">
        <p className="font-medium text-[57px] text-secondary">99.7%</p>
        <p className="font-medium text-[20px] text-white">Accuracy Rate</p>
      </div>
    </div>
  );
}
