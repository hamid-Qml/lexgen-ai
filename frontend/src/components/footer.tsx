export default function Footer() {
  return (
    <div className="w-full flex flex-row items-center justify-between gap-24 px-10 py-6 bg-black mt-20">
      <p className="text-[16px] text-white/50">
        © 2025 Lexgen. All rights reserved.
      </p>
      <div className="flex flex-row items-center justify-between gap-6">
        <a href="">
          <img src="/linkedin.svg" width="24px" height="24px" />
        </a>
        <a
          className="text-[16px] text-white/50 underline"
          href="mailto:support@lexgen.co"
        >
          support@lexgen.co
        </a>
      </div>
    </div>
  );
}
