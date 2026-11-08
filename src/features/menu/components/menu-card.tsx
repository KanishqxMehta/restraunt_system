import { Flame, Clock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/classes";
import type { CustomerMenuItem } from "../types";
import { DietaryMark } from "./dietary-mark";
import { DishImage } from "./dish-image";

const SPICE_LABELS: Record<number, string> = {
  1: "Mild spice",
  2: "Medium spice",
  3: "Hot",
};

export function MenuCard({
  item,
  isOpen,
  onConfigure,
}: {
  item: CustomerMenuItem;
  isOpen: boolean;
  onConfigure: (item: CustomerMenuItem) => void;
}) {
  const minPrice = item.portions.length
    ? Math.min(...item.portions.map((portion) => portion.pricePaise))
    : null;

  const isSweetOrDessert =
    item.category?.toLowerCase().includes("dessert") ||
    item.category?.toLowerCase().includes("sweet") ||
    item.category?.toLowerCase().includes("beverage") ||
    item.category?.toLowerCase().includes("drink");

  const showSpiceBadge = item.spiceLevel > 0 && !isSweetOrDessert;

  return (
    <article
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-[1.6rem] border border-[#dfd4c2] bg-[#fffdfa] shadow-[0_4px_20px_rgba(25,20,15,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#0f352d]/45 hover:shadow-[0_14px_32px_rgba(15,53,45,0.1)]",
        !item.isAvailable && "opacity-80",
      )}
    >
      <div>
        {/* Dish Photography Header */}
        <div className="relative aspect-[16/10] overflow-hidden bg-[#f2ebe0]">
          <DishImage
            src={item.imageUrl}
            alt={item.name}
            sizes="(min-width: 1024px) 360px, (min-width: 640px) 45vw, 92vw"
            emptyLabel="Photo coming soon"
            className={cn(
              "transition-transform duration-500 group-hover:scale-105",
              !item.isAvailable && "grayscale-[35%] opacity-60",
            )}
          />

          {/* Top Gradient Overlay & Badges */}
          <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 bg-gradient-to-b from-black/50 via-black/15 to-transparent p-3.5">
            <DietaryMark isVeg={item.isVeg} />
            {showSpiceBadge && (
              <span className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-[#f4d6a9] backdrop-blur-xs">
                <Flame className="h-3 w-3 text-[#f4d6a9]" aria-hidden="true" />
                {SPICE_LABELS[item.spiceLevel] ?? "Medium spice"}
              </span>
            )}
          </div>

          {/* Category Tag in bottom-left of image */}
          <div className="absolute bottom-3 left-3.5 flex flex-wrap items-center gap-1.5">
            <span className="rounded-lg border border-[#e3d8c6]/80 bg-[#fffdfa]/92 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#0f352d] shadow-2xs backdrop-blur-xs">
              {item.category}
            </span>
            {item.serviceHoursText && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-[#dec9ec] bg-[#3b1747]/90 px-2.5 py-0.5 text-[10px] font-bold text-[#f4d6a9] backdrop-blur-xs">
                <Clock className="h-3 w-3" aria-hidden="true" />
                Available {item.serviceHoursText}
              </span>
            )}
          </div>
        </div>

        {/* Dish Details */}
        <div className="p-5 pb-4">
          <h3 className="font-display text-xl font-bold tracking-tight text-[#0f352d] group-hover:text-[#08231d]">
            {item.name}
          </h3>

          <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#575046]">
            {item.description}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-[#7a7062]">
            <span className="font-semibold text-[#544d42]">Allergens:</span>
            <span>{item.allergens.join(", ") || "No declared allergens"}</span>
          </div>
        </div>
      </div>

      {/* Price & Add Action Bar */}
      <div className="mx-5 mb-5 flex items-center justify-between gap-3 border-t border-[#ece3d5] pt-4">
        <div>
          {minPrice !== null ? (
            <div className="flex items-baseline gap-1">
              {item.portions.length > 1 && (
                <span className="text-[11px] font-medium uppercase tracking-wider text-[#7a7062]">
                  from
                </span>
              )}
              <span className="font-mono-tabular text-lg font-extrabold text-[#1f1c18]">
                {formatMoney(minPrice)}
              </span>
            </div>
          ) : (
            <span className="text-xs font-semibold text-[#7a7062]">
              Price unavailable
            </span>
          )}
          {item.portions.length > 1 && (
            <p className="text-[11px] text-[#7a7062]">
              {item.portions.length} portion sizes
            </p>
          )}
        </div>

        <Button
          variant="primary"
          disabled={!item.isAvailable || !isOpen || !item.portions.length}
          aria-label={`Add ${item.name}`}
          className="min-h-10 rounded-xl px-4 text-xs font-bold shadow-xs"
          onClick={() => onConfigure(item)}
        >
          {item.isAvailable ? (
            <>
              <span>Add</span>
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            </>
          ) : item.timeRestricted ? (
            "Outside hours"
          ) : (
            "Sold out"
          )}
        </Button>
      </div>
    </article>
  );
}
