"use client";

import { useState } from "react";
import Image from "next/image";
import { Plus, Search, Filter, Clock, PauseCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DietaryMark } from "./dietary-mark";
import { CreateDishModal } from "./create-dish-modal";
import { EditDishModal } from "./edit-dish-modal";
import { EditPricesModal } from "./edit-prices-modal";
import { formatMoney } from "@/lib/format";
import { formatTimeWindow } from "../time-windows";
import { requestJson, errorMessage } from "@/lib/http-client";
import type { AdminMenuItem, AdminOutlet } from "../types";

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
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Derive categories
  const categories = ["All", ...Array.from(new Set(items.map((i) => i.category)))];

  // Filtered items
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = categoryFilter === "All" || item.category === categoryFilter;

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
    (acc, item) => acc + (item.availability || []).filter((a) => !a.isAvailable).length,
    0,
  );

  async function handleToggleStock(itemId: string, outletId: string, currentAvailable: boolean) {
    const toggleKey = `${itemId}-${outletId}`;
    setTogglingMap((prev) => ({ ...prev, [toggleKey]: true }));
    setFeedback(null);

    // Optimistic update
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const updatedAvail = (item.availability || []).map((a) =>
          a.outletId === outletId ? { ...a, isAvailable: !currentAvailable } : a,
        );
        // If not in availability array yet, append it
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
            a.outletId === outletId ? { ...a, isAvailable: currentAvailable } : a,
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
      const res = await requestJson<{ item: AdminMenuItem }>(`/api/admin/menu/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !currentActive }),
      });

      setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, isActive: res.item.isActive } : i)));
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
      const res = await requestJson<{ items: AdminMenuItem[]; outlets: AdminOutlet[] }>("/api/admin/menu");
      setItems(res.items);
    } catch (err) {
      console.error("Refresh menu failed:", err);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-stone-500">Total Dishes</p>
          <p className="mt-2 text-2xl font-bold text-stone-900">{totalItems}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-stone-500">Active</p>
          <p className="mt-2 text-2xl font-bold text-emerald-800">{activeItems}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-stone-500">Vegetarian</p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">{vegItems}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-stone-500">Non-Veg</p>
          <p className="mt-2 text-2xl font-bold text-red-700">{nonVegItems}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-stone-500">Outlet Pauses</p>
          <p className="mt-2 text-2xl font-bold text-amber-800">{pausedOutletsCount}</p>
        </div>
      </div>

      {feedback && (
        <div
          role="status"
          className={`flex items-center justify-between rounded-xl p-3 text-sm font-medium ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs underline ml-4 hover:opacity-75"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Action Controls & Filters */}
      <div className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-[260px] flex-1">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-stone-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search dishes by name, description or category…"
              className="h-11 w-full rounded-xl border border-stone-300 pl-10 pr-4 text-sm outline-none focus:border-stone-800"
            />
          </div>
          <Button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="min-h-11 gap-2 bg-stone-900 text-white hover:bg-stone-800"
          >
            <Plus className="h-4 w-4" />
            Add menu dish
          </Button>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-100 text-xs">
          <span className="font-semibold text-stone-500 mr-1 flex items-center gap-1">
            <Filter className="h-3.5 w-3.5" /> Category:
          </span>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategoryFilter(c)}
              className={`rounded-full px-3 py-1 font-medium transition ${
                categoryFilter === c
                  ? "bg-stone-900 text-white"
                  : "bg-stone-100 text-stone-700 hover:bg-stone-200"
              }`}
            >
              {c}
            </button>
          ))}

          <span className="font-semibold text-stone-500 ml-3 mr-1">Dietary:</span>
          {[
            { label: "All", val: "ALL" },
            { label: "Veg", val: "VEG" },
            { label: "Non-Veg", val: "NON_VEG" },
          ].map((d) => (
            <button
              key={d.val}
              type="button"
              onClick={() => setDietaryFilter(d.val)}
              className={`rounded-full px-3 py-1 font-medium transition ${
                dietaryFilter === d.val
                  ? "bg-stone-900 text-white"
                  : "bg-stone-100 text-stone-700 hover:bg-stone-200"
              }`}
            >
              {d.label}
            </button>
          ))}

          <span className="font-semibold text-stone-500 ml-3 mr-1">Status:</span>
          {[
            { label: "All", val: "ALL" },
            { label: "Active", val: "ACTIVE" },
            { label: "Paused in outlet", val: "PAUSED_ANY" },
          ].map((s) => (
            <button
              key={s.val}
              type="button"
              onClick={() => setStatusFilter(s.val)}
              className={`rounded-full px-3 py-1 font-medium transition ${
                statusFilter === s.val
                  ? "bg-stone-900 text-white"
                  : "bg-stone-100 text-stone-700 hover:bg-stone-200"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dishes Grid */}
      {filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 p-12 text-center text-stone-500">
          No dishes match your active search or filters.
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {filteredItems.map((item) => {
            const hasTimeWindow = item.availableFromMinute != null && item.availableToMinute != null;
            const timeWindowLabel = formatTimeWindow(item.availableFromMinute, item.availableToMinute);

            return (
              <article
                key={item.id}
                className={`overflow-hidden rounded-2xl border transition bg-white shadow-xs flex flex-col justify-between ${
                  item.isActive ? "border-stone-200" : "border-stone-300 bg-stone-50/50 opacity-75"
                }`}
              >
                <div>
                  {/* Card Image Banner */}
                  <div className="relative aspect-[16/9] w-full bg-stone-100 overflow-hidden">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        sizes="(min-width: 1024px) 500px, 90vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-stone-400">
                        No image uploaded
                      </div>
                    )}
                    <div className="absolute top-3 left-3 flex gap-2">
                      <span className="rounded-md bg-white/90 px-2 py-1 text-xs font-semibold backdrop-blur-xs">
                        <DietaryMark isVeg={item.isVeg} />
                      </span>
                      <span className="rounded-md bg-stone-950/80 px-2 py-1 text-xs font-medium text-white backdrop-blur-xs">
                        {item.category}
                      </span>
                    </div>

                    <div className="absolute top-3 right-3 flex gap-1">
                      {!item.isActive && (
                        <span className="rounded-md bg-red-800 text-white px-2 py-1 text-xs font-semibold">
                          Deactivated
                        </span>
                      )}
                      {hasTimeWindow && (
                        <span className="rounded-md bg-amber-900/90 text-amber-200 px-2 py-1 text-xs font-medium flex items-center gap-1 backdrop-blur-xs">
                          <Clock className="h-3 w-3" /> {timeWindowLabel}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-bold text-stone-900">{item.name}</h2>
                        <p className="mt-1 text-xs text-stone-500">
                          Spice: {["Mild", "Gentle", "Medium", "Hot"][item.spiceLevel ?? 1]} · Station:{" "}
                          {item.prepStation ?? "MAIN"}
                        </p>
                      </div>
                    </div>

                    <p className="mt-3 text-sm text-stone-600 leading-relaxed">{item.description}</p>

                    {/* Portions & City Prices */}
                    <div className="mt-4 rounded-xl border border-stone-100 bg-stone-50/70 p-3">
                      <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
                        Portions & City Prices (5% GST Incl.)
                      </p>
                      <ul className="space-y-1.5 text-sm">
                        {(item.portions || []).flatMap((portion) =>
                          (portion.prices || []).map((price) => (
                            <li key={price.id} className="flex justify-between text-stone-700">
                              <span>
                                {portion.name} <span className="text-stone-400">· {price.city}</span>
                              </span>
                              <span className="font-semibold text-stone-900">
                                {formatMoney(price.pricePaise)}
                              </span>
                            </li>
                          )),
                        )}
                      </ul>
                    </div>

                    {/* Operational Details */}
                    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500 border-t border-stone-100 pt-3">
                      <p>
                        Base Prep: <strong className="text-stone-700">{item.basePrepMinutes} min</strong>
                      </p>
                      <p>
                        Batch Capacity: <strong className="text-stone-700">{item.batchCapacity}</strong>
                      </p>
                      <p>
                        Allergens:{" "}
                        <strong className="text-stone-700">
                          {item.allergens?.join(", ") || "None"}
                        </strong>
                      </p>
                    </div>

                    {/* Outlet Availability / Stock Pausing Controls */}
                    <div className="mt-5 border-t border-stone-100 pt-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-stone-600 mb-2 flex items-center gap-1.5">
                        <PauseCircle className="h-3.5 w-3.5 text-amber-700" />
                        Outlet Stock Availability
                      </p>
                      <div className="grid grid-cols-1 gap-2">
                        {outlets.map((outlet) => {
                          const avail = (item.availability || []).find((a) => a.outletId === outlet.id);
                          const isAvailable = avail ? avail.isAvailable : true;
                          const toggleKey = `${item.id}-${outlet.id}`;
                          const isToggling = Boolean(togglingMap[toggleKey]);

                          return (
                            <div
                              key={outlet.id}
                              className="flex items-center justify-between rounded-lg border border-stone-200 px-3 py-2 text-xs"
                            >
                              <div className="flex flex-col">
                                <span className="font-medium text-stone-800">{outlet.name}</span>
                                <span className="text-[10px] text-stone-400">{outlet.city}</span>
                              </div>
                              <button
                                type="button"
                                disabled={isToggling}
                                onClick={() => handleToggleStock(item.id, outlet.id, isAvailable)}
                                className={`rounded-md px-2.5 py-1 font-semibold transition cursor-pointer disabled:opacity-50 ${
                                  isAvailable
                                    ? "bg-emerald-100 text-emerald-900 hover:bg-emerald-200"
                                    : "bg-amber-100 text-amber-900 hover:bg-amber-200"
                                }`}
                              >
                                {isToggling ? "Updating…" : isAvailable ? "In Stock" : "Paused / Out"}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-between border-t border-stone-100 bg-stone-50/50 p-4">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-9 px-3 text-xs"
                      onClick={() => setEditingItem(item)}
                    >
                      Edit details
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-9 px-3 text-xs"
                      onClick={() => setPricingItem(item)}
                    >
                      City prices
                    </Button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleDishActive(item.id, item.isActive)}
                    className="text-xs font-semibold text-stone-600 hover:text-stone-900 underline"
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
            setFeedback({ message: `Dish "${newItem.name}" created!`, type: "success" });
            void refreshMenu();
          }}
        />
      )}

      {editingItem && (
        <EditDishModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onUpdated={(updated) => {
            setFeedback({ message: `Dish "${updated.name}" updated!`, type: "success" });
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
