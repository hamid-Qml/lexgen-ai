export default function Benefits() {
  return (
    <div className="flex flex-row px-12 py-24 gap-12 text-white ">
      <div className="flex flex-col max-w-[626px]">
        <h2 className="font-medium text-[48px]">Exclusive Founder Benefits</h2>
        <p className="text-[18px] text-white/50">
          Be one of the first 500 users to join and unlock lifetime benefits
          that will never be available again.
        </p>
      </div>
      <div className="flex flex-col gap-6 font-medium text-[24px]">
        <p>
          <span className="text-secondary">|</span> Lifetime 50% discount on all
          plans
        </p>
        <p>
          <span className="text-secondary">|</span> Early access to all new
          features
        </p>
        <p>
          <span className="text-secondary">|</span> Priority customer support
        </p>
        <p>
          <span className="text-secondary">|</span> Direct influence on product
          roadmap
        </p>
        <p>
          <span className="text-secondary">|</span> Exclusive founder badge and
          recognition
        </p>
        <p>
          <span className="text-secondary">|</span> Access to private founder
          community
        </p>
      </div>
    </div>
  );
}
