import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/classes";

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "tertiary";
}) {
  return (
    <button
      className={cn(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#3b1747] disabled:cursor-wait disabled:opacity-60",
        variant === "primary"
          ? "bg-[#133d34] text-white hover:bg-[#0c2a23] shadow-xs active:scale-[0.99]"
          : variant === "tertiary"
            ? "border border-[#dcc8ea] bg-[#f5effa] text-[#3b1747] hover:bg-[#ecdcf5] active:scale-[0.99]"
            : "border border-[#e0d6c7] bg-[#fffdfa] text-[#25221e] hover:bg-[#f6f0e7] hover:text-[#133d34] active:scale-[0.99]",
        className,
      )}
      {...props}
    />
  );
}
