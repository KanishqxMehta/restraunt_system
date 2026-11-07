import { cn } from "@/lib/classes";

export function DietaryMark({
  isVeg,
  className,
}: {
  isVeg: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-wide shadow-2xs backdrop-blur-xs select-none",
        isVeg
          ? "border-emerald-700/30 bg-[#f0fdf4]/95 text-emerald-950"
          : "border-red-800/30 bg-[#fef2f2]/95 text-red-950",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border leading-none",
          isVeg
            ? "border-emerald-700 text-emerald-700"
            : "border-red-700 text-red-700",
        )}
      >
        {isVeg ? (
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-700" />
        ) : (
          <span
            className="h-0 w-0 border-x-[3.5px] border-b-[6px] border-x-transparent border-b-red-700"
            style={{ transform: "translateY(-0.5px)" }}
          />
        )}
      </span>
      <span>{isVeg ? "Veg" : "Non-veg"}</span>
    </span>
  );
}
