function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export function SkeletonLine({ width = "w-full" }: { width?: string }) {
  return (
    <div className={cn("h-3 rounded-full bg-slate-900/10 relative overflow-hidden", width)}>
      <div className="absolute inset-0 -translate-x-[60%] animate-[shimmer_1.2s_infinite] bg-gradient-to-r from-transparent via-white/70 to-transparent" />
    </div>
  );
}

export function SkeletonBlock({ lines = 4, className }: { lines?: number; className?: string }) {
  const widths = ["w-3/5", "w-2/5", "w-[85%]", "w-[70%]", "w-3/4", "w-1/2"];
  return (
    <div className={cn("space-y-3 rounded-[18px] border border-slate-200 bg-white p-5", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine key={i} width={widths[i % widths.length]} />
      ))}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-60%); }
          100% { transform: translateX(160%); }
        }
      `}</style>
    </div>
  );
}
