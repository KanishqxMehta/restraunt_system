"use client";

import { useState } from "react";
import { Search, Store, PauseCircle, CheckCircle2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { DietaryMark } from "./dietary-mark";
import { DishImage } from "./dish-image";
import { cn } from "@/lib/classes";
import type { AdminMenuItem, AdminOutlet } from "../types";

interface ManageStockModalProps {
  item: AdminMenuItem;
  outlets: AdminOutlet[];
  togglingMap: Record<string, boolean>;
  onToggleStock: (itemId: string, outletId: string, currentAvailable: boolean) => Promise<void>;
  onBatchToggle: (itemId: string, targetAvailable: boolean) => Promise<void>;
  onClose: () => void;
}

export function ManageStockModal({
  item,
  outlets,
  togglingMap,
  onToggleStock,
  onBatchToggle,
  onClose,
}: ManageStockModalProps) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "DINE_IN" | "CLOUD" | "PAUSED">("ALL");
  const [batching, setBatching] = useState(false);

  // Derive availability counts
  const totalOutlets = outlets.length;
  const pausedOutlets = outlets.filter((o) => {
    const avail = (item.availability || []).find((a) => a.outletId === o.id);
    return avail ? !avail.isAvailable : false;
  });
  const inStockCount = totalOutlets - pausedOutlets.length;
  const pausedCount = pausedOutlets.length;

  const filteredOutlets = outlets.filter((outlet) => {
    const query = search.trim().toLowerCase();
    const matchesSearch =
      query === "" ||
      outlet.name.toLowerCase().includes(query) ||
      outlet.city.toLowerCase().includes(query);

    const isCloud = Boolean(outlet.isCloudKitchen);
    const avail = (item.availability || []).find((a) => a.outletId === outlet.id);
    const isAvailable = avail ? avail.isAvailable : true;

    if (!matchesSearch) return false;

    if (filterType === "DINE_IN") return !isCloud;
    if (filterType === "CLOUD") return isCloud;
    if (filterType === "PAUSED") return !isAvailable;

    return true;
  });

  async function handleBatch(targetAvailable: boolean) {
    setBatching(true);
    try {
      await onBatchToggle(item.id, targetAvailable);
    } finally {
      setBatching(false);
    }
  }

  return (
    <Modal title="Outlet stock availability" onClose={onClose}>
      <div className="space-y-5">
        {/* Dish Summary Banner */}
        <div className="flex items-center gap-3.5 rounded-2xl border border-[#dfd4c2] bg-[#faf7f2] p-3.5 shadow-2xs">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-[#ded2bf] bg-[#f2ebe0]">
            <DishImage src={item.imageUrl} alt={item.name} sizes="56px" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <DietaryMark isVeg={item.isVeg} />
              <span className="rounded-md bg-[#0f352d]/10 px-2 py-0.5 text-[10px] font-bold text-[#0f352d]">
                {item.category}
              </span>
            </div>
            <h3 className="truncate font-display text-lg font-bold text-[#0f352d]">
              {item.name}
            </h3>
          </div>
          <div className="text-right">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold",
                pausedCount === 0
                  ? "border border-emerald-300 bg-emerald-50 text-emerald-800"
                  : "border border-[#dec9ec] bg-[#f7f2fa] text-[#4a1d5a]",
              )}
            >
              {pausedCount === 0 ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  All {totalOutlets} In Stock
                </>
              ) : (
                <>
                  <PauseCircle className="h-3.5 w-3.5 text-[#73278c]" />
                  {pausedCount} of {totalOutlets} Paused
                </>
              )}
            </span>
          </div>
        </div>

        {/* Toolbar: Search, Filters & Batch actions */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="relative min-w-[200px] flex-1">
              <Search
                className="absolute top-3 left-3 h-4 w-4 text-[#7a7062]"
                aria-hidden="true"
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search outlets by name or city…"
                className="h-10 w-full rounded-xl border border-[#dcd2c2] bg-[#fffdfa] pr-3 pl-9 text-xs font-medium text-[#1f1c18] outline-none transition focus:border-[#0f352d] focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={batching || pausedCount === 0}
                onClick={() => handleBatch(true)}
                className="inline-flex items-center gap-1 rounded-xl border border-emerald-300 bg-emerald-50/80 px-3 py-2 text-xs font-bold text-emerald-800 shadow-2xs hover:bg-emerald-100 disabled:opacity-40 transition"
                title="Restore stock across all outlets"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                {batching ? "Updating…" : "Restore all"}
              </button>
              <button
                type="button"
                disabled={batching || inStockCount === 0}
                onClick={() => handleBatch(false)}
                className="inline-flex items-center gap-1 rounded-xl border border-[#dec9ec] bg-[#faf5fd] px-3 py-2 text-xs font-bold text-[#4a1d5a] shadow-2xs hover:bg-[#f3e8fa] disabled:opacity-40 transition"
                title="Pause stock across all outlets"
              >
                <PauseCircle className="h-3.5 w-3.5 text-[#73278c]" />
                {batching ? "Updating…" : "Pause all"}
              </button>
            </div>
          </div>

          {/* Quick filter chips */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="font-bold text-[#635b50]">Filter:</span>
            {[
              { id: "ALL", label: `All (${totalOutlets})` },
              {
                id: "DINE_IN",
                label: `Dine-in (${outlets.filter((o) => !o.isCloudKitchen).length})`,
              },
              {
                id: "CLOUD",
                label: `Cloud Kitchens (${outlets.filter((o) => o.isCloudKitchen).length})`,
              },
              {
                id: "PAUSED",
                label: `Paused (${pausedCount})`,
              },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterType(f.id as typeof filterType)}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 font-bold transition",
                  filterType === f.id
                    ? "border-[#0f352d] bg-[#0f352d] text-white"
                    : "border-[#dfd4c2] bg-[#faf7f2] text-[#544d42] hover:bg-white",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Outlets List */}
        <div className="max-h-[380px] space-y-2 overflow-y-auto pr-1">
          {filteredOutlets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#dcd2c2] bg-[#faf7f2] p-8 text-center text-xs text-[#7a6f60]">
              <Store className="mx-auto mb-2 h-6 w-6 text-[#9a8e7e]" />
              <p className="font-bold text-[#1f1c18]">No matching outlets found</p>
              <p className="mt-0.5">Try adjusting your search query or filter selection.</p>
            </div>
          ) : (
            filteredOutlets.map((outlet) => {
              const avail = (item.availability || []).find((a) => a.outletId === outlet.id);
              const isAvailable = avail ? avail.isAvailable : true;
              const toggleKey = `${item.id}-${outlet.id}`;
              const isToggling = Boolean(togglingMap[toggleKey]);

              return (
                <div
                  key={outlet.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[#e3d8c6] bg-[#fffdfa] p-3 text-xs transition hover:border-[#0f352d]/40"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-bold text-[#1f1c18]">
                        {outlet.name}
                      </span>
                      <span
                        className={cn(
                          "rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                          outlet.isCloudKitchen
                            ? "bg-[#3b1747]/10 text-[#4a1d5a]"
                            : "bg-amber-100 text-amber-900",
                        )}
                      >
                        {outlet.isCloudKitchen ? "Cloud Kitchen" : "Dine-in"}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-[#7a7062]">
                      {outlet.city}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold",
                        isAvailable
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-purple-100 text-purple-900",
                      )}
                    >
                      {isAvailable ? "In Stock" : "Paused"}
                    </span>

                    <button
                      type="button"
                      disabled={isToggling || batching}
                      onClick={() => onToggleStock(item.id, outlet.id, isAvailable)}
                      className={cn(
                        "rounded-lg px-3 py-1.5 font-bold shadow-2xs transition disabled:opacity-50",
                        isAvailable
                          ? "border border-[#dec9ec] bg-[#faf5fd] text-[#4a1d5a] hover:bg-[#ede0f5]"
                          : "border border-emerald-300 bg-emerald-600 text-white hover:bg-emerald-700",
                      )}
                    >
                      {isToggling ? "Updating…" : isAvailable ? "Pause item" : "Mark in stock"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#ece3d5] pt-4">
          <p className="text-[11px] text-[#7a7062]">
            Updates take effect immediately on customer ordering channels.
          </p>
          <Button type="button" variant="primary" onClick={onClose} className="px-5">
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
