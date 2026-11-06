"use client";

import { useState } from "react";
import { Package, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DietaryMark } from "@/features/menu/components/dietary-mark";
import { requestJson, errorMessage } from "@/lib/http-client";

interface KitchenStockControlProps {
  outletId: string;
  outletName: string;
  initialItems: {
    id: string;
    name: string;
    category: string;
    isVeg: boolean;
    isAvailable: boolean;
  }[];
}

export function KitchenStockControl({
  outletId,
  outletName,
  initialItems,
}: KitchenStockControlProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(initialItems);
  const [toggling, setToggling] = useState<string | null>(null);
  const [error, setError] = useState("");

  const outOfStockCount = items.filter((i) => !i.isAvailable).length;

  async function handleToggle(itemId: string, current: boolean) {
    setToggling(itemId);
    setError("");

    // Optimistic toggle
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, isAvailable: !current } : item,
      ),
    );

    try {
      await requestJson("/api/kitchen/stock/pause", {
        method: "POST",
        body: JSON.stringify({
          itemId,
          outletId,
          isAvailable: !current,
        }),
      });
    } catch (err) {
      // Revert on error
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, isAvailable: current } : item,
        ),
      );
      setError(errorMessage(err));
    } finally {
      setToggling(null);
    }
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold shadow-2xs transition cursor-pointer sm:text-sm ${
            outOfStockCount > 0
              ? "border-[#dec9ec] bg-[#f7f2fa] text-[#4a1d5a] hover:bg-[#ede0f5]"
              : "border-[#dfd4c2] bg-[#fffdfa] text-[#25221e] hover:bg-[#faf7f2]"
          }`}
        >
          <Package className="h-4 w-4 text-[#0f352d]" aria-hidden="true" />
          <span>Outlet Stock</span>
          {outOfStockCount > 0 && (
            <span className="rounded-full bg-[#3b1747] px-2 py-0.5 text-[11px] font-bold text-[#f4d6a9]">
              {outOfStockCount} paused
            </span>
          )}
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#140d18]/60 p-4 backdrop-blur-xs">
          <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-[2rem] border border-[#dfd4c2] bg-[#fffdfa] shadow-2xl">
            <div className="h-1.5 w-full bg-gradient-to-r from-[#0f352d] via-[#c99b53] to-[#3b1747]" />
            <div className="flex items-center justify-between border-b border-[#ece3d5] bg-[#faf7f2] px-6 py-4">
              <div>
                <h2 className="font-display text-xl font-bold text-[#0f352d]">
                  Kitchen Stock Controls
                </h2>
                <p className="mt-0.5 text-xs text-[#635b50]">
                  {outletName} · Pause items when sold out to protect promise
                  times
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e2d8c7] bg-[#fffdfa] text-[#25221e] transition hover:bg-[#f7f2fa] hover:text-[#3b1747]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-2.5">
              {error && (
                <div
                  role="alert"
                  className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                >
                  {error}
                </div>
              )}

              {items.map((item) => {
                const isWorking = toggling === item.id;
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-2xl border border-[#e3d8c6] bg-[#faf7f2] p-3.5"
                  >
                    <div className="flex items-center gap-3">
                      <DietaryMark isVeg={item.isVeg} />
                      <div>
                        <p className="text-sm font-bold text-[#1f1c18]">
                          {item.name}
                        </p>
                        <p className="text-xs text-[#787064]">
                          {item.category}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isWorking}
                      onClick={() => handleToggle(item.id, item.isAvailable)}
                      className={`min-h-9 rounded-xl px-3.5 text-xs font-bold transition disabled:opacity-50 cursor-pointer ${
                        item.isAvailable
                          ? "border border-[#a7f3d0] bg-[#ecfdf5] text-[#065f46] hover:bg-[#d1fae5]"
                          : "border border-[#dec9ec] bg-[#f7f2fa] text-[#4a1d5a] hover:bg-[#ede0f5]"
                      }`}
                    >
                      {isWorking
                        ? "Saving…"
                        : item.isAvailable
                          ? "In Stock"
                          : "Out of Stock (Paused)"}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end border-t border-[#ece3d5] bg-[#faf7f2] px-6 py-4">
              <Button
                type="button"
                variant="primary"
                onClick={() => setOpen(false)}
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
