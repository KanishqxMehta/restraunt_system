import { cn } from "@/lib/classes";
export function DietaryMark({ isVeg }: { isVeg: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium",
        isVeg ? "text-emerald-800" : "text-red-800",
      )}
    >
      <span
        aria-hidden="true"
        className="inline-flex h-3.5 w-3.5 items-center justify-center border border-current text-[9px]"
      >
        {isVeg ? "●" : "▲"}
      </span>
      {isVeg ? "Veg" : "Non-veg"}
    </span>
  );
}
