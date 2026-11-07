"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { X, Sparkles } from "lucide-react";
import { cn } from "@/lib/classes";

export function Modal({
  title,
  subtitle,
  maxWidth = "max-w-lg",
  children,
  onClose,
}: {
  title: string;
  subtitle?: string;
  maxWidth?: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className={cn(
        "m-auto max-h-[90dvh] w-[calc(100%-1.5rem)] overflow-hidden rounded-[1.75rem] border border-[#dfd4c2] bg-[#fffdfa] p-0 shadow-[0_24px_64px_rgba(20,15,25,0.32)] backdrop:bg-[#140d18]/60 backdrop:backdrop-blur-xs",
        maxWidth,
      )}
    >
      <div className="h-1.5 w-full bg-gradient-to-r from-[#0f352d] via-[#c99b53] to-[#3b1747]" />
      <div className="flex items-start justify-between gap-4 border-b border-[#ece3d5] bg-[#faf7f2]/80 px-6 py-4 sm:px-7 sm:py-5">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#e3d2f0] bg-[#f7f0fc] text-[#4a1d5a]"
          >
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <h2
              id={titleId}
              className="font-display text-xl font-bold tracking-tight text-[#0f352d]"
            >
              {title}
            </h2>
            {subtitle && (
              <p className="mt-0.5 text-[11px] font-medium text-[#635b50]">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          aria-label="Close dialog"
          onClick={onClose}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#e2d8c7] bg-[#fffdfa] text-[#433d35] transition hover:border-[#3b1747]/30 hover:bg-[#f5effa] hover:text-[#3b1747]"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <div className="max-h-[calc(90dvh-5.5rem)] overflow-y-auto overscroll-contain p-6 sm:p-7">
        {children}
      </div>
    </dialog>
  );
}
