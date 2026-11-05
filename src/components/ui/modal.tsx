"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
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
      className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-3xl border-0 bg-white p-0 shadow-2xl backdrop:bg-stone-950/50"
    >
      <div className="flex items-start justify-between gap-4 border-b border-stone-100 px-6 py-5">
        <h2 id={titleId} className="text-xl font-semibold">
          {title}
        </h2>
        <button
          type="button"
          aria-label="Close dialog"
          onClick={onClose}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-100"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="p-6">{children}</div>
    </dialog>
  );
}
