"use client";

import { useState } from "react";
import {
  Plus,
  Search,
  Filter,
  Clock,
  PauseCircle,
  Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DietaryMark } from "./dietary-mark";
import { DishImage } from "./dish-image";
import { CreateDishModal } from "./create-dish-modal";
import { EditDishModal } from "./edit-dish-modal";
import { EditPricesModal } from "./edit-prices-modal";
import { formatMoney } from "@/lib/format";
import { formatTimeWindow } from "../time-windows";
import { requestJson, errorMessage } from "@/lib/http-client";
import type { AdminMenuItem, AdminOutlet } from "../types";
import { cn } from "@/lib/classes";

interface AdminMenuBoardProps {
  initialItems: AdminMenuItem[];
  outlets: AdminOutlet[];
}

export function AdminMenuBoard({ initialItems, outlets }: AdminMenuBoardProps) {
  const [items, setItems] = useState<AdminMenuItem[]>(initialItems);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [dietaryFilter, setDietaryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AdminMenuItem | null>(null);
  const [pricingItem, setPricingItem] = useState<AdminMenuItem | null>(null);

  const [togglingMap, setTogglingMap] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // Derive categories
  const categories = [
    "All",
    ...Array.from(new Set(items.map((i) => i.category))),
  ];

  // Filtered items
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      categoryFilter === "All" || item.category === categoryFilter;

    const matchesDietary =
      dietaryFilter === "ALL" ||
      (dietaryFilter === "VEG" && item.isVeg) ||
      (dietaryFilter === "NON_VEG" && !item.isVeg);

    const hasAnyPaused = (item.availability || []).some((a) => !a.isAvailable);
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && item.isActive) ||
      (statusFilter === "INACTIVE" && !item.isActive) ||
      (statusFilter === "PAUSED_ANY" && hasAnyPaused);

    return matchesSearch && matchesCategory && matchesDietary && matchesStatus;
  });

  // Calculate summary stats
  const totalItems = items.length;
  const activeItems = items.filter((i) => i.isActive).length;
  const vegItems = items.filter((i) => i.isVeg).length;
  const nonVegItems = items.filter((i) => !i.isVeg).length;
  const pausedOutletsCount = items.reduce(
    (acc, item) =>
      acc + (item.availability || []).filter((a) => !a.isAvailable).length,
    0,
  );

  async function handleToggleStock(
    itemId: string,
    outletId: string,
    currentAvailable: boolean,
  ) {
    const toggleKey = `${itemId}-${outletId}`;
    setTogglingMap((prev) => ({ ...prev, [toggleKey]: true }));
    setFeedback(null);

    // Optimistic update
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const updatedAvail = (item.availability || []).map((a) =>
          a.outletId === outletId
            ? { ...a, isAvailable: !currentAvailable }
            : a,
        );
        if (!updatedAvail.some((a) => a.outletId === outletId)) {
          updatedAvail.push({ outletId, isAvailable: !currentAvailable });
        }
        return { ...item, availability: updatedAvail };
      }),
    );

    try {
      await requestJson(`/api/admin/menu/${itemId}/availability`, {
        method: "POST",
        body: JSON.stringify({
          outletId,
          isAvailable: !currentAvailable,
        }),
      });

      setFeedback({
        message: `Stock updated for ${!currentAvailable ? "In stock" : "Paused"}.`,
        type: "success",
      });
    } catch (err) {
      // Revert optimistic update
      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== itemId) return item;
          const revertedAvail = (item.availability || []).map((a) =>
            a.outletId === outletId
              ? { ...a, isAvailable: currentAvailable }
              : a,
          );
          return { ...item, availability: revertedAvail };
        }),
      );
      setFeedback({
        message: `Failed to update stock: ${errorMessage(err)}`,
        type: "error",
      });
    } finally {
      setTogglingMap((prev) => ({ ...prev, [toggleKey]: false }));
    }
  }

  async function handleToggleDishActive(itemId: string, currentActive: boolean) {
    try {
      const res = await requestJson<{ item: AdminMenuItem }>(
        `/api/admin/menu/${itemId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ isActive: !currentActive }),
        },
      );

      setItems((prev) =>
        prev.map((i) =>
          i.id === itemId ? { ...i, isActive: res.item.isActive } : i,
        ),
      );
      setFeedback({
        message: `Dish ${res.item.isActive ? "activated" : "deactivated"} successfully.`,
        type: "success",
      });
    } catch (err) {
      setFeedback({
        message: `Failed to change status: ${errorMessage(err)}`,
        type: "error",
      });
    }
  }

  async function refreshMenu() {
    try {
      const res = await requestJson<{
        items: AdminMenuItem[];
        outlets: AdminOutlet[];
      }>("/api/admin/menu");
      setItems(res.items);
    } catch (err) {
      console.error("Refresh menu failed:", err);
    }
  }

  return (
    <div className="space-y-7">
      {/* Top Banner Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <div className="rounded-2xl border border-[#dfd4c2] bg-[#fffdfa] p-4 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#635b50]">
            Total Dishes
          </p>
          <p className="font-mono-tabular mt-2 text-2xl font-black text-[#1f1c18]">
            {totalItems}
          </p>
        </div>
        <div className="rounded-2xl border border-[#dfd4c2] bg-[#fffdfa] p-4 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#0f352d]">
            Active
          </p>
          <p className="font-mono-tabular mt-2 text-2xl font-black text-[#0f352d]">
            {activeItems}
          </p>
        </div>
        <div className="rounded-2xl border border-[#dfd4c2] bg-[#fffdfa] p-4 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
            Vegetarian
          </p>
          <p className="font-mono-tabular mt-2 text-2xl font-black text-emerald-700">
            {vegItems}
          </p>
        </div>
        <div className="rounded-2xl border border-[#dfd4c2] bg-[#fffdfa] p-4 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-red-800">
            Non-Veg
          </p>
          <p className="font-mono-tabular mt-2 text-2xl font-black text-red-700">
            {nonVegItems}
          </p>
        </div>
        <div className="col-span-2 rounded-2xl border border-[#dec9ec] bg-gradient-to-br from-[#faf5fd] to-[#f3e8fa] p-4 shadow-xs sm:col-span-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#4a1d5a]">
            Outlet Pauses
          </p>
          <p className="font-mono-tabular mt-2 text-2xl font-black text-[#3b1747]">
            {pausedOutletsCount}
          </p>
        </div>
      </div>

      {feedback && (
        <div
          role="status"
          className={cn(
            "flex items-center justify-between rounded-2xl p-4 text-sm font-bold shadow-2xs",
            feedback.type === "success"
              ? "border border-[#a7f3d0] bg-[#ecfdf5] text-[#065f46]"
              : "border border-red-200 bg-red-50 text-red-800",
          )}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="ml-4 text-xs underline hover:opacity-75"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Action Controls & Filters */}
      <div className="flex flex-col gap-4 rounded-[1.75rem] border border-[#dfd4c2] bg-[#fffdfa] p-5 shadow-xs sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search
              className="absolute top-3.5 left-3.5 h-4 w-4 text-[#7a7062]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search dishes by name, description or category…"
              className="h-11 w-full rounded-xl border border-[#dcd2c2] bg-[#faf7f2] pr-4 pl-10 text-sm font-medium text-[#1f1c18] outline-none transition placeholder:font-normal placeholder:text-[#8f8474] focus:border-[#0f352d] focus:bg-white focus:ring-3 focus:ring-[#0f352d]/10"
            />
          </div>
          <Button
            type="button"
            variant="primary"
            onClick={() => setCreateModalOpen(true)}
            className="min-h-11 gap-2"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add menu dish
          </Button>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 border-t border-[#ece3d5] pt-3.5 text-xs">
          <span className="mr-1 flex items-center gap-1 font-bold text-[#4a1d5a]">
            <Filter className="h-3.5 w-3.5" aria-hidden="true" /> Category:
          </span>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategoryFilter(c)}
              className={cn(
                "rounded-full border px-3 py-1 font-bold transition active:scale-95",
                categoryFilter === c
                  ? "border-[#0f352d] bg-[#0f352d] text-white shadow-2xs"
                  : "border-[#dfd4c2] bg-[#faf7f2] text-[#544d42] hover:border-[#4a1d5a] hover:bg-white hover:text-[#4a1d5a]",
              )}
            >
              {c}
            </button>
          ))}

          <span className="mr-1 ml-3 font-bold text-[#4a1d5a]">Dietary:</span>
          {[
            { label: "All", val: "ALL" },
            { label: "Veg", val: "VEG" },
            { label: "Non-Veg", val: "NON_VEG" },
          ].map((d) => (
            <button
              key={d.val}
              type="button"
              onClick={() => setDietaryFilter(d.val)}
              className={cn(
                "rounded-full border px-3 py-1 font-bold transition active:scale-95",
                dietaryFilter === d.val
                  ? "border-[#0f352d] bg-[#0f352d] text-white shadow-2xs"
                  : "border-[#dfd4c2] bg-[#faf7f2] text-[#544d42] hover:border-[#4a1d5a] hover:bg-white hover:text-[#4a1d5a]",
              )}
            >
              {d.label}
            </button>
          ))}

          <span className="mr-1 ml-3 font-bold text-[#4a1d5a]">Status:</span>
          {[
            { label: "All", val: "ALL" },
            { label: "Active", val: "ACTIVE" },
            { label: "Paused in outlet", val: "PAUSED_ANY" },
          ].map((s) => (
            <button
              key={s.val}
              type="button"
              onClick={() => setStatusFilter(s.val)}
              className={cn(
                "rounded-full border px-3 py-1 font-bold transition active:scale-95",
                statusFilter === s.val
                  ? "border-[#3b1747] bg-[#3b1747] text-white shadow-2xs"
                  : "border-[#dfd4c2] bg-[#faf7f2] text-[#544d42] hover:border-[#4a1d5a] hover:bg-white hover:text-[#4a1d5a]",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dishes Grid */}
      {filteredItems.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#d6c9b6] bg-[#fffdfa] p-12 text-center shadow-xs">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#ded2bf] bg-[#faf7f2] text-[#c99b53]">
            <Search className="h-5 w-5" aria-hidden="true" />
          </div>
          <h3 className="font-display text-lg font-bold text-[#0f352d]">
            No dishes found
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-[#7a6f60]">
            No menu items match your active search query or filter constraints.
          </p>
          {(search || categoryFilter !== "All" || dietaryFilter !== "ALL" || statusFilter !== "ALL") && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setCategoryFilter("All");
                setDietaryFilter("ALL");
                setStatusFilter("ALL");
              }}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0f352d] px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-[#15463b] transition"
            >
              <span>Reset All Filters</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {filteredItems.map((item) => {
            const hasTimeWindow =
              item.availableFromMinute != null &&
              item.availableToMinute != null;
            const timeWindowLabel = formatTimeWindow(
              item.availableFromMinute,
              item.availableToMinute,
            );

            return (
              <article
                key={item.id}
                className={cn(
                  "flex flex-col justify-between overflow-hidden rounded-[1.75rem] border bg-[#fffdfa] shadow-[0_6px_24px_rgba(20,18,14,0.04)] transition hover:border-[#0f352d]/40",
                  item.isActive
                    ? "border-[#dfd4c2]"
                    : "border-[#dfd4c2] bg-[#faf7f2] opacity-75",
                )}
              >
                <div>
                  {/* Card Image Banner */}
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#f2ebe0]">
                    <DishImage
                      src={item.imageUrl}
                      alt={item.name}
                      sizes="(min-width: 1024px) 500px, 90vw"
                      emptyLabel="No image uploaded"
                    />
                    <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 bg-gradient-to-b from-black/50 via-black/15 to-transparent p-3.5">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-white/95 shadow-2xs backdrop-blur-xs">
                          <DietaryMark isVeg={item.isVeg} />
                        </span>
                        <span className="rounded-lg bg-[#0f352d]/90 px-2.5 py-1 text-[11px] font-bold text-[#f4d6a9] backdrop-blur-xs">
                          {item.category}
                        </span>
                      </div>

                      <div className="flex gap-1.5">
                        {!item.isActive && (
                          <span className="rounded-lg bg-red-800 px-2.5 py-1 text-[11px] font-bold text-white">
                            Deactivated
                          </span>
                        )}
                        {hasTimeWindow && (
                          <span className="flex items-center gap-1 rounded-lg border border-[#dec9ec] bg-[#3b1747]/90 px-2.5 py-1 text-[11px] font-bold text-[#f4d6a9] backdrop-blur-xs">
                            <Clock className="h-3 w-3" aria-hidden="true" />{" "}
                            {timeWindowLabel}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-display text-2xl font-bold text-[#0f352d]">
                          {item.name}
                        </h2>
                        <p className="mt-1 flex items-center gap-2 text-xs text-[#635b50]">
                          <span className="inline-flex items-center gap-1 font-semibold">
                            <Flame
                              className="h-3.5 w-3.5 text-[#c99b53]"
                              aria-hidden="true"
                            />
                            {["Mild", "Gentle", "Medium", "Hot"][
                              item.spiceLevel ?? 1
                            ]}
                          </span>
                          <span>·</span>
                          <span>
                            Station:{" "}
                            <strong className="font-bold text-[#4a1d5a]">
                              {item.prepStation ?? "MAIN"}
                            </strong>
                          </span>
                        </p>
                      </div>
                    </div>

                    <p className="mt-3 text-sm leading-relaxed text-[#544d42]">
                      {item.description}
                    </p>

                    {/* Portions & City Prices */}
                    <div className="mt-4 rounded-2xl border border-[#e6dccb] bg-[#faf7f2] p-4">
                      <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-[#4a1d5a]">
                        Portions & City Prices (5% GST Incl.)
                      </p>
                      <ul className="space-y-1.5 text-sm">
                        {(item.portions || []).flatMap((portion) =>
                          (portion.prices || []).map((price) => (
                            <li
                              key={price.id}
                              className="flex justify-between text-[#544d42]"
                            >
                              <span className="font-medium text-[#1f1c18]">
                                {portion.name}{" "}
                                <span className="text-xs text-[#7a7062]">
                                  · {price.city}
                                </span>
                              </span>
                              <span className="font-mono-tabular font-extrabold text-[#0f352d]">
                                {formatMoney(price.pricePaise)}
                              </span>
                            </li>
                          )),
                        )}
                      </ul>
                    </div>

                    {/* Operational Details */}
                    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-[#ece3d5] pt-3.5 text-xs text-[#635b50]">
                      <p>
                        Base Prep:{" "}
                        <strong className="text-[#0f352d]">
                          {item.basePrepMinutes} min
                        </strong>
                      </p>
                      <p>
                        Batch Capacity:{" "}
                        <strong className="text-[#0f352d]">
                          {item.batchCapacity}
                        </strong>
                      </p>
                      <p>
                        Allergens:{" "}
                        <strong className="text-[#1f1c18]">
                          {item.allergens?.join(", ") || "None"}
                        </strong>
                      </p>
                    </div>

                    {/* Outlet Availability / Stock Pausing Controls */}
                    <div className="mt-5 border-t border-[#ece3d5] pt-4">
                      <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#4a1d5a]">
                        <PauseCircle
                          className="h-3.5 w-3.5 text-[#4a1d5a]"
                          aria-hidden="true"
                        />
                        Outlet Stock Availability
                      </p>
                      <div className="grid grid-cols-1 gap-2">
                        {outlets.map((outlet) => {
                          const avail = (item.availability || []).find(
                            (a) => a.outletId === outlet.id,
                          );
                          const isAvailable = avail ? avail.isAvailable : true;
                          const toggleKey = `${item.id}-${outlet.id}`;
                          const isToggling = Boolean(togglingMap[toggleKey]);

                          return (
                            <div
                              key={outlet.id}
                              className="flex items-center justify-between rounded-xl border border-[#e3d8c6] bg-[#faf7f2] px-3.5 py-2 text-xs"
                            >
                              <div className="flex flex-col">
                                <span className="font-bold text-[#1f1c18]">
                                  {outlet.name}
                                </span>
                                <span className="text-[10px] text-[#7a7062]">
                                  {outlet.city}
                                </span>
                              </div>
                              <button
                                type="button"
                                disabled={isToggling}
                                onClick={() =>
                                  handleToggleStock(
                                    item.id,
                                    outlet.id,
                                    isAvailable,
                                  )
                                }
                                className={cn(
                                  "rounded-lg px-3 py-1 font-bold transition disabled:opacity-50",
                                  isAvailable
                                    ? "border border-[#a7f3d0] bg-[#ecfdf5] text-[#065f46] hover:bg-[#d1fae5]"
                                    : "border border-[#dec9ec] bg-[#f7f2fa] text-[#4a1d5a] hover:bg-[#ede0f5]",
                                )}
                              >
                                {isToggling
                                  ? "Updating…"
                                  : isAvailable
                                    ? "In Stock"
                                    : "Paused / Out"}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-between border-t border-[#ece3d5] bg-[#faf7f2] px-6 py-4">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-9 px-3.5 text-xs"
                      onClick={() => setEditingItem(item)}
                    >
                      Edit details
                    </Button>
                    <Button
                      type="button"
                      variant="tertiary"
                      className="min-h-9 px-3.5 text-xs font-bold"
                      onClick={() => setPricingItem(item)}
                    >
                      City prices
                    </Button>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleToggleDishActive(item.id, item.isActive)
                    }
                    className="text-xs font-bold text-[#635b50] underline underline-offset-4 hover:text-[#4a1d5a]"
                  >
                    {item.isActive ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {createModalOpen && (
        <CreateDishModal
          onClose={() => setCreateModalOpen(false)}
          onCreated={(newItem) => {
            setFeedback({
              message: `Dish "${newItem.name}" created!`,
              type: "success",
            });
            void refreshMenu();
          }}
        />
      )}

      {editingItem && (
        <EditDishModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onUpdated={(updated) => {
            setFeedback({
              message: `Dish "${updated.name}" updated!`,
              type: "success",
            });
            void refreshMenu();
          }}
        />
      )}

      {pricingItem && (
        <EditPricesModal
          item={pricingItem}
          onClose={() => setPricingItem(null)}
          onPricesUpdated={() => {
            setFeedback({ message: "Pricing updated!", type: "success" });
            void refreshMenu();
          }}
        />
      )}
    </div>
  );
}
