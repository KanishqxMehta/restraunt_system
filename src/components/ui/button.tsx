import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/classes";

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
}) {
  return (
    <button
      className={cn(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-700 disabled:cursor-wait disabled:opacity-60",
        variant === "primary"
          ? "bg-stone-900 text-white hover:bg-stone-700"
          : "border border-stone-300 bg-white text-stone-800 hover:bg-stone-50",
        className,
      )}
      {...props}
    />
  );
}
