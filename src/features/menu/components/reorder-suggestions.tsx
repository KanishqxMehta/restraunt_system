"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DietaryMark } from "./dietary-mark";
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
    <section aria-label="AI Reorder Suggestions" className="mb-8 rounded-3xl bg-amber-50/70 p-6 border border-amber-200 shadow-xs">
      <div className="flex items-center gap-2 mb-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-200 text-amber-900">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        <h2 className="text-base font-bold text-amber-950">AI Suggested for You</h2>
      </div>

      {aiNote && (
        <p className="text-xs text-amber-900 mb-4 italic leading-relaxed">
          &ldquo;{aiNote}&rdquo;
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {suggestions.map((sug) => {
          const fullItem = allItems.find((i) => i.id === sug.itemId || i.name === sug.name);
          if (!fullItem) return null;

          return (
            <div
              key={sug.itemId}
              className="flex flex-col justify-between rounded-2xl bg-white p-4 border border-amber-200/80 shadow-xs"
            >
              <div>
                <div className="relative aspect-video w-full rounded-xl bg-stone-100 overflow-hidden mb-3">
                  {fullItem.imageUrl ? (
                    <Image
                      src={fullItem.imageUrl}
                      alt={fullItem.name}
                      fill
                      sizes="(min-width: 640px) 250px, 90vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-stone-400">
                      Photo
                    </div>
                  )}
                  <span className="absolute top-2 left-2 rounded-md bg-white/90 px-1.5 py-0.5 text-xs backdrop-blur-xs">
                    <DietaryMark isVeg={fullItem.isVeg} />
                  </span>
                </div>

                <h3 className="font-bold text-sm text-stone-900">{fullItem.name}</h3>
                <p className="text-[11px] text-amber-900 font-medium mt-0.5">{sug.reason}</p>
              </div>

              {/* Strict constraint: Never adds directly to cart; opens configuration review */}
              <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                <span className="text-xs text-stone-500 font-medium">Customize</span>
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-8 px-3 text-xs border-amber-700 text-amber-900 hover:bg-amber-50"
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
      <p className="mt-3 text-[10px] text-amber-800/80">
        AI recommendations are based on your order history and current kitchen availability. Dishes are never auto-added to your cart.
      </p>
    </section>
  );
}
