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
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition border cursor-pointer ${
            outOfStockCount > 0
              ? "border-[#e4d3f1] bg-[#f5effa] text-[#4a1d5a] hover:bg-[#ede0f5]"
              : "border-[#ded5c6] bg-[#fffdfa] text-[#25221e] hover:bg-[#faf7f2]"
          }`}
        >
          <Package className="h-4 w-4" />
          <span>Outlet Stock</span>
          {outOfStockCount > 0 && (
            <span className="rounded-full bg-[#3b1747] px-2 py-0.5 text-xs font-bold text-white">
              {outOfStockCount} paused
            </span>
          )}
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a0f20]/60 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-[#ded5c6] bg-[#fffdfa] p-6 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#ede6da] pb-4 mb-4">
              <div>
                <h2 className="text-xl font-bold text-[#133d34]">Kitchen Stock Controls</h2>
                <p className="text-xs text-[#635b50]">
                  {outletName} · Pause items when sold out to protect promise times
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f5efe5] text-[#25221e] hover:bg-[#ebdcf5] hover:text-[#3b1747]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {error && (
              <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <div className="overflow-y-auto space-y-2 flex-1 pr-1">
              {items.map((item) => {
                const isWorking = toggling === item.id;
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl border border-[#ded5c6] bg-[#fffdfa] p-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <DietaryMark isVeg={item.isVeg} />
                      <div>
                        <p className="text-sm font-bold text-[#25221e]">{item.name}</p>
                        <p className="text-xs text-[#877d70]">{item.category}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isWorking}
                      onClick={() => handleToggle(item.id, item.isAvailable)}
                      className={`min-h-9 px-3 text-xs font-bold rounded-lg transition disabled:opacity-50 cursor-pointer ${
                        item.isAvailable
                          ? "border border-[#a7f3d0] bg-[#ecfdf5] text-[#065f46] hover:bg-[#d1fae5]"
                          : "border border-[#e4d3f1] bg-[#f5effa] text-[#4a1d5a] hover:bg-[#ede0f5]"
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

            <div className="pt-4 mt-4 border-t border-[#ede6da] flex justify-end">
              <Button type="button" variant="primary" onClick={() => setOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
