type BackButtonProps = {
  onClick: () => void;
  label?: string;
  type?: "button" | "submit" | "reset";
};

function ArrowLeftIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M15 6l-6 6 6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function BackButton({
  onClick,
  label = "Back",
  type = "button",
}: BackButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white/90 px-3.5 text-[13px] font-black text-slate-600 shadow-[0_10px_24px_rgba(15,23,42,0.05)] transition hover:-translate-y-[1px] hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
    >
      <ArrowLeftIcon size={15} />
      {label}
    </button>
  );
}
