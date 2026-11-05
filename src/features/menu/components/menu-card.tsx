import Image from "next/image";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/classes";
import type { CustomerMenuItem } from "../types";
import { DietaryMark } from "./dietary-mark";
export function MenuCard({
  item,
  isOpen,
  onConfigure,
}: {
  item: CustomerMenuItem;
  isOpen: boolean;
  onConfigure: (item: CustomerMenuItem) => void;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
      <div className="relative aspect-[16/10] bg-stone-100">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            sizes="(min-width: 1024px) 330px, (min-width: 640px) 45vw, 90vw"
            className={cn("object-cover", !item.isAvailable && "opacity-50")}
          />
        ) : (
          <span className="flex h-full items-center justify-center text-sm text-stone-400">
            Photo coming soon
          </span>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-center justify-between gap-2">
          <DietaryMark isVeg={item.isVeg} />
          <span className="text-xs text-stone-500">
            {["Mild", "Gentle spice", "Medium spice", "Hot"][item.spiceLevel]}
          </span>
        </div>
        <h3 className="mt-3 text-lg font-semibold">{item.name}</h3>
        {item.serviceHoursText && (
          <p className="mt-1 text-xs font-medium text-amber-800">
            ⏰ Available {item.serviceHoursText}
          </p>
        )}
        <p className="mt-2 text-sm leading-6 text-stone-500">
          {item.description}
        </p>
        <p className="mt-3 text-xs leading-5 text-stone-500">
          Contains: {item.allergens.join(", ") || "No declared allergens"}
        </p>
        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="font-semibold">
            {item.portions.length ? (
              <>
                {item.portions.length > 1 && (
                  <span className="mr-1 text-xs font-normal text-stone-400">
                    from
                  </span>
                )}
                {formatMoney(
                  Math.min(
                    ...item.portions.map((portion) => portion.pricePaise),
                  ),
                )}
              </>
            ) : (
              "Price unavailable"
            )}
          </p>
          <Button
            variant="secondary"
            disabled={!item.isAvailable || !isOpen || !item.portions.length}
            aria-label={`Add ${item.name}`}
            className="min-h-10 border-emerald-800 px-4 text-emerald-900"
            onClick={() => onConfigure(item)}
          >
            {item.isAvailable
              ? "Add +"
              : item.timeRestricted
                ? "Outside hours"
                : "Sold out"}
          </Button>
        </div>
      </div>
    </article>
  );
}
