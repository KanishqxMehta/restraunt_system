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
    <article className="overflow-hidden rounded-2xl border border-[#ded5c6] bg-[#fffdfa] shadow-xs transition hover:border-[#133d34]/40 hover:shadow-md">
      <div className="relative aspect-[16/10] bg-[#f4efe6]">
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
          <span className="rounded-full bg-[#f4efe6] px-2.5 py-0.5 text-[11px] font-semibold text-[#544d42]">
            {["Mild", "Gentle spice", "Medium spice", "Hot"][item.spiceLevel]}
          </span>
        </div>
        <h3 className="mt-3 text-lg font-bold text-[#133d34]">{item.name}</h3>
        {item.serviceHoursText && (
          <p className="mt-1.5 inline-block rounded-md border border-[#e4d3f1] bg-[#f5effa] px-2 py-0.5 text-xs font-semibold text-[#4a1d5a]">
            ⏰ Available {item.serviceHoursText}
          </p>
        )}
        <p className="mt-2 text-sm leading-6 text-[#5c5448]">
          {item.description}
        </p>
        <p className="mt-3 text-xs leading-5 text-[#736a5c]">
          Contains: {item.allergens.join(", ") || "No declared allergens"}
        </p>
        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="font-extrabold text-[#25221e]">
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
            variant="primary"
            disabled={!item.isAvailable || !isOpen || !item.portions.length}
            aria-label={`Add ${item.name}`}
            className="min-h-10 px-4 text-xs font-bold"
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
