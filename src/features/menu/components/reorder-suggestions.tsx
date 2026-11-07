"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DietaryMark } from "./dietary-mark";
import { DishImage } from "./dish-image";
import type { CustomerMenuItem } from "../types";
import { requestJson } from "@/lib/http-client";

interface ReorderSuggestion {
  itemId: string;
  name: string;
  category: string;
  imageUrl: string | null;
  isVeg: boolean;
  spiceLevel: number;
  reason: string;
}

export function ReorderSuggestions({
  outletId,
  allItems,
  onConfigure,
}: {
  outletId: string;
  allItems: CustomerMenuItem[];
  onConfigure: (item: CustomerMenuItem) => void;
}) {
  const [suggestions, setSuggestions] = useState<ReorderSuggestion[]>([]);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    requestJson<{ suggestions: ReorderSuggestion[]; aiNote: string | null }>(
      `/api/customer/reorder-suggestions?outletId=${encodeURIComponent(outletId)}`,
    )
      .then((data) => {
        if (!active) return;
        setSuggestions(data.suggestions || []);
        setAiNote(data.aiNote);
      })
      .catch(() => {
        // Silently skip if user is not signed in or has no history
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [outletId]);

  if (loading || suggestions.length === 0) return null;

  return (
    <section
      aria-label="AI Reorder Suggestions"
      className="mb-9 overflow-hidden rounded-[2rem] border border-[#dec9ec] bg-gradient-to-br from-[#faf5fd] via-[#fffdfa] to-[#f4ecfa] p-6 shadow-xs sm:p-7"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#3b1747] text-[#f4d6a9] shadow-2xs"
          >
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#4a1d5a]">
              Personal Culinary Concierge
            </span>
            <h2 className="font-display text-lg font-bold text-[#3b1747]">
              AI Suggested for You
            </h2>
          </div>
        </div>
        <span className="rounded-full border border-[#dec9ec] bg-white/80 px-3 py-1 text-[11px] font-semibold text-[#4a1d5a]">
          Tailored to your palate & live stock
        </span>
      </div>

      {aiNote && (
        <p className="mb-5 rounded-xl border border-[#e5d4f0] bg-white/70 px-4 py-2.5 text-xs italic leading-relaxed text-[#4a1d5a]">
          &ldquo;{aiNote}&rdquo;
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {suggestions.map((sug) => {
          const fullItem = allItems.find(
            (i) => i.id === sug.itemId || i.name === sug.name,
          );
          if (!fullItem) return null;

          return (
            <div
              key={sug.itemId}
              className="group flex flex-col justify-between rounded-2xl border border-[#e2d4ec] bg-[#fffdfa] p-4 shadow-2xs transition hover:border-[#3b1747]/45 hover:shadow-md"
            >
              <div>
                <div className="relative mb-3 aspect-video w-full overflow-hidden rounded-xl bg-[#f4efe6]">
                  <DishImage
                    src={fullItem.imageUrl}
                    alt={fullItem.name}
                    sizes="(min-width: 640px) 250px, 90vw"
                    emptyLabel="Photo"
                    className="transition-transform duration-300 group-hover:scale-105"
                  />
                  <span className="absolute top-2 left-2 rounded-full bg-white/95 shadow-2xs backdrop-blur-xs">
                    <DietaryMark isVeg={fullItem.isVeg} />
                  </span>
                </div>

                <h3 className="font-display text-base font-bold text-[#0f352d]">
                  {fullItem.name}
                </h3>
                <p className="mt-1 text-xs font-medium text-[#4a1d5a]">
                  {sug.reason}
                </p>
              </div>

              {/* Strict constraint: Never adds directly to cart; opens configuration review */}
              <div className="mt-4 flex items-center justify-between border-t border-[#ede6da] pt-3">
                <span className="text-xs font-semibold text-[#635b50]">
                  Customize portion
                </span>
                <Button
                  type="button"
                  variant="primary"
                  className="min-h-9 px-3.5 text-xs"
                  onClick={() => onConfigure(fullItem)}
                  disabled={!fullItem.isAvailable}
                >
                  {fullItem.isAvailable ? "Review dish" : "Sold out"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-[11px] text-[#6e587b]">
        AI recommendations are based on your order history and current kitchen
        availability. Dishes are never auto-added to your cart.
      </p>
    </section>
  );
}
