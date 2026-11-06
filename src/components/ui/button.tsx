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
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold tracking-tight transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3b1747] disabled:cursor-wait disabled:opacity-55",
        variant === "primary"
          ? "bg-gradient-to-b from-[#15463b] to-[#0d3129] text-white shadow-[0_2px_8px_rgba(15,53,45,0.22),inset_0_1px_0_rgba(255,255,255,0.14)] hover:from-[#195246] hover:to-[#0f382f] hover:shadow-[0_4px_14px_rgba(15,53,45,0.28)] active:scale-[0.985]"
          : variant === "tertiary"
            ? "border border-[#d8bfe8] bg-gradient-to-b from-[#faf5fd] to-[#f2e8f9] text-[#3b1747] shadow-2xs hover:border-[#c39fdb] hover:from-[#f5ecfb] hover:to-[#ead9f5] active:scale-[0.985]"
            : "border border-[#dcd0be] bg-gradient-to-b from-[#fffdfa] to-[#f6efe4] text-[#25221e] shadow-2xs hover:border-[#133d34]/40 hover:from-[#fffdfa] hover:to-[#efe6d6] hover:text-[#0f352d] active:scale-[0.985]",
        className,
      )}
      {...props}
    />
  );
}
