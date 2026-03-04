import React from "react";

export default function Modal({
  open,
  title,
  onClose,
  footer,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] grid place-items-center bg-slate-900/55 p-4 backdrop-blur-sm"
      onMouseDown={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="grid w-full max-w-[1100px] grid-rows-[auto_1fr_auto] overflow-hidden rounded-[22px] border border-white/20 bg-white text-slate-900 shadow-[0_26px_80px_rgba(15,23,42,0.22)]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-900/10 bg-gradient-to-b from-white/98 to-white/92 px-4 py-3">
          <div className="text-[14px] font-black tracking-[-0.02em]">{title}</div>

          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-[14px] border border-slate-900/10 bg-slate-900/5 px-4 font-extrabold transition hover:border-[#6d5efc]/25 hover:bg-[#6d5efc]/10"
          >
            Close
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto overflow-x-hidden p-4">{children}</div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-900/10 bg-white/95 px-4 py-3">
          {footer}
        </div>
      </div>
    </div>
  );
}