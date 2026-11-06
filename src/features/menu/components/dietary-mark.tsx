import { cn } from "@/lib/classes";

export function DietaryMark({ isVeg }: { isVeg: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-wide",
        isVeg
          ? "border-emerald-700/25 bg-emerald-50/90 text-emerald-900"
          : "border-red-800/25 bg-red-50/90 text-red-900",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex h-3.5 w-3.5 items-center justify-center rounded-[3px] border text-[8px] leading-none",
          isVeg
            ? "border-emerald-700 text-emerald-700"
            : "border-red-700 text-red-700",
        )}
      >
        {isVeg ? "●" : "▲"}
      </span>
      {isVeg ? "Veg" : "Non-veg"}
    </span>
  );
}
