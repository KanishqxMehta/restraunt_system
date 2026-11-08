"use client";

import { useState } from "react";
import {
  Plus,
  Search,
  Clock,
  PauseCircle,
  Flame,
  CheckCircle2,
  FileText,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SelectMenu } from "@/components/ui/select-menu";
import { useAlert } from "@/components/ui/alert-toast";
import { DietaryMark } from "./dietary-mark";
import { DishImage } from "./dish-image";
import { CreateDishModal } from "./create-dish-modal";
import { EditDishModal } from "./edit-dish-modal";
import { EditPricesModal } from "./edit-prices-modal";
import { ManageStockModal } from "./manage-stock-modal";
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
  const alert = useAlert();
  const [items, setItems] = useState<AdminMenuItem[]>(initialItems);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [dietaryFilter, setDietaryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortOrder, setSortOrder] = useState("default");

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AdminMenuItem | null>(null);
  const [pricingItem, setPricingItem] = useState<AdminMenuItem | null>(null);
  const [stockModalItemId, setStockModalItemId] = useState<string | null>(null);

  const [togglingMap, setTogglingMap] = useState<Record<string, boolean>>({});
  const [activatingMap, setActivatingMap] = useState<Record<string, boolean>>({});

  // Active stock item reactive reference
  const activeStockItem = items.find((i) => i.id === stockModalItemId) ?? null;

  // Active outlets set for robust counting
  const activeOutletIds = new Set(outlets.map((o) => o.id));

  // Derive categories
  const categories = [
    "All",
    ...Array.from(new Set(items.map((i) => i.category))),
  ];

  // Filtered and sorted items
  const filteredItems = items
    .filter((item) => {
      const query = search.trim().toLowerCase();
      const matchesSearch =
        query === "" ||
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query);

      const matchesCategory =
        categoryFilter === "All" || item.category === categoryFilter;

      const matchesDietary =
        dietaryFilter === "ALL" ||
        (dietaryFilter === "VEG" && item.isVeg) ||
        (dietaryFilter === "NON_VEG" && !item.isVeg);

      const pausedOutletsForItem = outlets.filter((o) => {
        const a = (item.availability || []).find((x) => x.outletId === o.id);
        return a ? !a.isAvailable : false;
      });
      const hasAnyPaused = pausedOutletsForItem.length > 0;

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && item.isActive) ||
        (statusFilter === "INACTIVE" && !item.isActive) ||
        (statusFilter === "PAUSED_ANY" && hasAnyPaused);

      return matchesSearch && matchesCategory && matchesDietary && matchesStatus;
    })
    .sort((a, b) => {
      if (sortOrder === "name_asc") return a.name.localeCompare(b.name);
      if (sortOrder === "name_desc") return b.name.localeCompare(a.name);
      if (sortOrder === "prep_asc") return a.basePrepMinutes - b.basePrepMinutes;
      if (sortOrder === "prep_desc") return b.basePrepMinutes - a.basePrepMinutes;
      return 0;
    });

  // Calculate summary stats
  const totalItems = items.length;
  const activeItems = items.filter((i) => i.isActive).length;
  const draftItems = items.filter((i) => !i.isActive).length;
  const vegItems = items.filter((i) => i.isVeg).length;
  const nonVegItems = items.filter((i) => !i.isVeg).length;
  const pausedOutletsCount = items.reduce(
    (acc, item) =>
      acc + (item.availability || []).filter((a) => !a.isAvailable && activeOutletIds.has(a.outletId)).length,
    0,
  );

  async function handleToggleStock(
    itemId: string,
    outletId: string,
    currentAvailable: boolean,
  ) {
    const toggleKey = `${itemId}-${outletId}`;
    setTogglingMap((prev) => ({ ...prev, [toggleKey]: true }));

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
          const outletObj = outlets.find((o) => o.id === outletId);
          updatedAvail.push({
            outletId,
            isAvailable: !currentAvailable,
            ...(outletObj ? { outlet: { id: outletObj.id, name: outletObj.name, city: outletObj.city } } : {}),
          });
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

      const msg = `Stock updated to ${!currentAvailable ? "In stock" : "Paused"}.`;
      if (!currentAvailable) {
        alert.success("Outlet Stock Restored", msg);
      } else {
        alert.general("Outlet Stock Paused", msg);
      }
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
      alert.failure("Stock Update Failed", errorMessage(err));
    } finally {
      setTogglingMap((prev) => ({ ...prev, [toggleKey]: false }));
    }
  }

  async function handleBatchToggleStock(itemId: string, targetAvailable: boolean) {
    const targetItem = items.find((i) => i.id === itemId);
    if (!targetItem) return;

    const outletsToUpdate = outlets.filter((o) => {
      const avail = (targetItem.availability || []).find((a) => a.outletId === o.id);
      const current = avail ? avail.isAvailable : true;
      return current !== targetAvailable;
    });

    if (outletsToUpdate.length === 0) return;

    // Optimistically update all
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const currentAvailMap = new Map(
          (item.availability || []).map((a) => [a.outletId, a]),
        );
        outletsToUpdate.forEach((o) => {
          const prevA = currentAvailMap.get(o.id);
          currentAvailMap.set(o.id, {
            ...(prevA ?? { outlet: { id: o.id, name: o.name, city: o.city } }),
            outletId: o.id,
            isAvailable: targetAvailable,
          });
        });
        const newAvail = Array.from(currentAvailMap.values());
        return { ...item, availability: newAvail };
      }),
    );

    try {
      await Promise.all(
        outletsToUpdate.map((o) =>
          requestJson(`/api/admin/menu/${itemId}/availability`, {
            method: "POST",
            body: JSON.stringify({
              outletId: o.id,
              isAvailable: targetAvailable,
            }),
          }),
        ),
      );

      const actionText = targetAvailable ? "restored to In Stock" : "paused";
      const msg = `All ${outlets.length} outlets ${actionText} for "${targetItem.name}".`;
      alert.success("Fleet Stock Updated", msg);
    } catch (err) {
      void refreshMenu();
      alert.failure("Batch Stock Update Failed", errorMessage(err));
    }
  }

  async function handleToggleDishActive(itemId: string, currentActive: boolean) {
    setActivatingMap((prev) => ({ ...prev, [itemId]: true }));
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
      const msg = `Dish "${res.item.name}" ${res.item.isActive ? "activated (now live)" : "deactivated (draft)"}.`;
      if (res.item.isActive) {
        alert.success("Dish Activated", msg);
      } else {
        alert.general("Dish Deactivated", msg);
      }
    } catch (err) {
      alert.failure("Status Change Failed", errorMessage(err));
    } finally {
      setActivatingMap((prev) => ({ ...prev, [itemId]: false }));
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
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-2xl border border-[#dfd4c2] bg-[#fffdfa] p-4 shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#635b50]">
            Total Dishes
          </p>
          <p className="font-mono-tabular mt-2 text-2xl font-black text-[#1f1c18]">
            {totalItems}
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-900">
              Active Live
            </p>
            <span className="flex h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
          </div>
          <p className="font-mono-tabular mt-2 text-2xl font-black text-emerald-800">
            {activeItems}
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-900">
              Draft / Inactive
            </p>
            <FileText className="h-3.5 w-3.5 text-amber-700" />
          </div>
          <p className="font-mono-tabular mt-2 text-2xl font-black text-amber-900">
            {draftItems}
          </p>
        </div>

        <div className="rounded-2xl border border-[#dfd4c2] bg-[#fffdfa] p-4 shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
            Vegetarian
          </p>
          <p className="font-mono-tabular mt-2 text-2xl font-black text-emerald-700">
            {vegItems}
          </p>
        </div>

        <div className="rounded-2xl border border-[#dfd4c2] bg-[#fffdfa] p-4 shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-red-800">
            Non-Veg
          </p>
          <p className="font-mono-tabular mt-2 text-2xl font-black text-red-700">
            {nonVegItems}
          </p>
        </div>

        <div className="col-span-2 rounded-2xl border border-[#dec9ec] bg-gradient-to-br from-[#faf5fd] to-[#f3e8fa] p-4 shadow-2xs sm:col-span-1">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#4a1d5a]">
              Outlet Pauses
            </p>
            <PauseCircle className="h-3.5 w-3.5 text-[#73278c]" />
          </div>
          <p className="font-mono-tabular mt-2 text-2xl font-black text-[#3b1747]">
            {pausedOutletsCount}
          </p>
        </div>
      </div>

      {/* Action Controls & Filters */}
      <div className="flex flex-col gap-4 rounded-[1.75rem] border border-[#dfd4c2] bg-[#fffdfa] p-5 shadow-2xs sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-[260px] flex-1">
            <Search
              className="absolute top-3.5 left-3.5 h-4 w-4 text-[#7a7062]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search dishes by name, description or category…"
              className="h-11 w-full rounded-xl border border-[#dcd2c2] bg-[#faf7f2] pr-10 pl-10 text-sm font-medium text-[#1f1c18] outline-none transition placeholder:font-normal placeholder:text-[#8f8474] focus:border-[#0f352d] focus:bg-white focus:ring-3 focus:ring-[#0f352d]/10"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute top-3.5 right-3 text-[#7a7062] hover:text-[#1f1c18]"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
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

        {/* Dropdowns using design system's SelectMenu */}
        <div className="grid grid-cols-2 gap-3 border-t border-[#ece3d5] pt-3.5 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#635b50]">
              Category
            </label>
            <SelectMenu
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={categories.map((c) => ({
                value: c,
                label: c === "All" ? "All Categories" : c,
                badge:
                  c === "All"
                    ? totalItems.toString()
                    : items.filter((i) => i.category === c).length.toString(),
              }))}
              size="sm"
              fullWidth
            />
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#635b50]">
              Dietary
            </label>
            <SelectMenu
              value={dietaryFilter}
              onChange={setDietaryFilter}
              options={[
                { value: "ALL", label: "All Dietary", badge: totalItems.toString() },
                { value: "VEG", label: "Vegetarian", badge: vegItems.toString() },
                { value: "NON_VEG", label: "Non-Vegetarian", badge: nonVegItems.toString() },
              ]}
              size="sm"
              fullWidth
            />
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#635b50]">
              Status
            </label>
            <SelectMenu
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "ALL", label: "All Statuses", badge: totalItems.toString() },
                { value: "ACTIVE", label: "Active Live", badge: activeItems.toString() },
                { value: "INACTIVE", label: "Draft / Inactive", badge: draftItems.toString() },
                {
                  value: "PAUSED_ANY",
                  label: "Outlet Paused",
                  badge: items.filter((i) => (i.availability || []).some((a) => !a.isAvailable && activeOutletIds.has(a.outletId))).length.toString(),
                },
              ]}
              size="sm"
              fullWidth
            />
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#635b50]">
              Sort Order
            </label>
            <SelectMenu
              value={sortOrder}
              onChange={setSortOrder}
              options={[
                { value: "default", label: "Default Order" },
                { value: "name_asc", label: "Name (A → Z)" },
                { value: "name_desc", label: "Name (Z → A)" },
                { value: "prep_asc", label: "Prep Time (Shortest)" },
                { value: "prep_desc", label: "Prep Time (Longest)" },
              ]}
              size="sm"
              fullWidth
            />
          </div>
        </div>

        {/* Quick filter chips & reset */}
        {(search || categoryFilter !== "All" || dietaryFilter !== "ALL" || statusFilter !== "ALL" || sortOrder !== "default") && (
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="font-bold text-[#635b50]">Active Filters:</span>
            {search && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#faf7f2] border border-[#dcd2c2] px-2.5 py-0.5 text-xs text-[#1f1c18]">
                Search: &ldquo;{search}&rdquo;
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="hover:text-red-600"
                  aria-label="Remove search filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {categoryFilter !== "All" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#0f352d]/10 border border-[#0f352d]/20 px-2.5 py-0.5 text-xs text-[#0f352d] font-bold">
                Category: {categoryFilter}
                <button
                  type="button"
                  onClick={() => setCategoryFilter("All")}
                  className="hover:text-red-600"
                  aria-label="Clear category filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {dietaryFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#faf7f2] border border-[#dcd2c2] px-2.5 py-0.5 text-xs text-[#1f1c18] font-bold">
                Dietary: {dietaryFilter === "VEG" ? "Veg" : "Non-Veg"}
                <button
                  type="button"
                  onClick={() => setDietaryFilter("ALL")}
                  className="hover:text-red-600"
                  aria-label="Clear dietary filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {statusFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#faf7f2] border border-[#dcd2c2] px-2.5 py-0.5 text-xs text-[#1f1c18] font-bold">
                Status: {statusFilter === "ACTIVE" ? "Active" : statusFilter === "INACTIVE" ? "Draft" : "Paused"}
                <button
                  type="button"
                  onClick={() => setStatusFilter("ALL")}
                  className="hover:text-red-600"
                  aria-label="Clear status filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {sortOrder !== "default" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#faf7f2] border border-[#dcd2c2] px-2.5 py-0.5 text-xs text-[#1f1c18]">
                Sorted
                <button
                  type="button"
                  onClick={() => setSortOrder("default")}
                  className="hover:text-red-600"
                  aria-label="Reset sort"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setCategoryFilter("All");
                setDietaryFilter("ALL");
                setStatusFilter("ALL");
                setSortOrder("default");
              }}
              className="text-xs font-bold text-[#0f352d] underline hover:text-[#4a1d5a] ml-1"
            >
              Reset all
            </button>
          </div>
        )}
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

            // Compute outlet stock summary
            const totalOutletsCount = outlets.length;
            const pausedCount = outlets.filter((o) => {
              const a = (item.availability || []).find((x) => x.outletId === o.id);
              return a ? !a.isAvailable : false;
            }).length;
            const inStockCount = totalOutletsCount - pausedCount;
            const allInStock = pausedCount === 0;

            const isActivating = Boolean(activatingMap[item.id]);

            return (
              <article
                key={item.id}
                className={cn(
                  "flex flex-col justify-between overflow-hidden rounded-[1.75rem] border bg-[#fffdfa] shadow-[0_6px_24px_rgba(20,18,14,0.04)] transition hover:border-[#0f352d]/40",
                  item.isActive
                    ? "border-[#dfd4c2]"
                    : "border-[#e3d2b4] bg-[#fcfbfa]",
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
                    <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 bg-gradient-to-b from-black/60 via-black/20 to-transparent p-3.5">
                      <div className="flex items-center gap-2">
                        <DietaryMark isVeg={item.isVeg} />
                        <span className="rounded-lg bg-[#0f352d]/90 px-2.5 py-1 text-[11px] font-bold text-[#f4d6a9] backdrop-blur-xs">
                          {item.category}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Interactive Active Status Switch */}
                        <div
                          className="flex items-center gap-1.5 rounded-lg bg-black/60 px-2 py-1 backdrop-blur-xs text-[11px] font-bold text-white shadow-2xs"
                          title={item.isActive ? "Dish is Live — click switch to make Draft" : "Dish is Draft — click switch to make Live"}
                        >
                          <span className={item.isActive ? "text-emerald-300" : "text-amber-300"}>
                            {item.isActive ? "Live" : "Draft"}
                          </span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={item.isActive}
                            aria-label={`Toggle active status for ${item.name}`}
                            disabled={isActivating}
                            onClick={() => handleToggleDishActive(item.id, item.isActive)}
                            className={cn(
                              "relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50",
                              item.isActive ? "bg-emerald-500" : "bg-neutral-500",
                            )}
                          >
                            <span
                              className={cn(
                                "pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                                item.isActive ? "translate-x-3" : "translate-x-0",
                              )}
                            />
                          </button>
                        </div>

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
                        {/* Meta Row: Spice, Station, Prep, Batch */}
                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                          {item.spiceLevel > 0 && !item.category?.toLowerCase().includes("dessert") ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-[#faf7f2] border border-[#e5dbc9] px-2 py-0.5 font-semibold text-[#544d42]">
                              <Flame className="h-3 w-3 text-[#c99b53]" aria-hidden="true" />
                              {["No spice", "Mild", "Medium", "Hot"][item.spiceLevel] ?? "Medium"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md bg-[#faf7f2] border border-[#e5dbc9] px-2 py-0.5 font-medium text-[#7c7569]">
                              {item.category?.toLowerCase().includes("dessert") ? "Dessert (No spice)" : "No spice"}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 rounded-md bg-[#faf7f2] border border-[#e5dbc9] px-2 py-0.5 font-semibold text-[#544d42]">
                            <Clock className="h-3 w-3 text-[#0f352d]" aria-hidden="true" />
                            {item.basePrepMinutes}m prep
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-md bg-[#faf7f2] border border-[#e5dbc9] px-2 py-0.5 font-semibold text-[#4a1d5a]">
                            Station: <strong>{item.prepStation ?? "MAIN"}</strong>
                          </span>
                          {item.batchCapacity > 1 && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-[#faf7f2] border border-[#e5dbc9] px-2 py-0.5 text-[#544d42]">
                              Batch: {item.batchCapacity}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <p className="mt-3 text-sm leading-relaxed text-[#544d42]">
                      {item.description}
                    </p>

                    {/* Portions & City Prices preview */}
                    <div className="mt-4 rounded-2xl border border-[#e6dccb] bg-[#faf7f2] p-3.5">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-[#4a1d5a]">
                          Portions & Pricing (5% GST Incl.)
                        </p>
                        <button
                          type="button"
                          onClick={() => setPricingItem(item)}
                          className="text-[11px] font-bold text-[#0f352d] underline hover:text-[#4a1d5a]"
                        >
                          Manage pricing
                        </button>
                      </div>

                      <ul className="divide-y divide-[#ece3d5] text-xs">
                        {(item.portions || []).flatMap((portion) =>
                          (portion.prices || []).map((price) => (
                            <li
                              key={`${portion.id}-${price.city}`}
                              className="flex items-center justify-between py-1.5 text-[#544d42]"
                            >
                              <span className="font-semibold text-[#1f1c18]">
                                {portion.name}{" "}
                                <span className="font-normal text-[#7a7062]">
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

                    {/* Operational Allergens */}
                    {item.allergens && item.allergens.length > 0 && (
                      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-[#635b50]">
                        <span className="font-bold text-[#433d35]">Allergens:</span>
                        {item.allergens.map((alg) => (
                          <span
                            key={alg}
                            className="rounded-md border border-[#dfd4c2] bg-[#faf7f2] px-2 py-0.5 text-[11px] font-medium text-[#544d42]"
                          >
                            {alg}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Outlet Stock Availability Summary Pill & Modal Trigger (COMPACT UX) */}
                    <div className="mt-4 rounded-2xl border border-[#e3d8c6] bg-[#faf7f2] p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          {allInStock ? (
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="h-4 w-4" />
                            </div>
                          ) : (
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-100 text-[#73278c]">
                              <PauseCircle className="h-4 w-4" />
                            </div>
                          )}
                          <div className="truncate">
                            <p className="truncate text-xs font-bold text-[#1f1c18]">
                              {allInStock
                                ? `All ${totalOutletsCount} Outlets In Stock`
                                : `${pausedCount} Outlet${pausedCount > 1 ? "s" : ""} Paused (${inStockCount}/${totalOutletsCount} Live)`}
                            </p>
                            <p className="text-[11px] text-[#7a7062]">
                              Real-time stock availability across fleet
                            </p>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="tertiary"
                          className="min-h-8 shrink-0 px-3 text-xs font-bold gap-1"
                          onClick={() => setStockModalItemId(item.id)}
                        >
                          <SlidersHorizontal className="h-3 w-3" />
                          Manage stock
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#ece3d5] bg-[#faf7f2] px-6 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-9 px-3.5 text-xs font-bold"
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
                      Pricing & portions
                    </Button>
                  </div>

                  <button
                    type="button"
                    disabled={isActivating}
                    onClick={() => handleToggleDishActive(item.id, item.isActive)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition disabled:opacity-50",
                      item.isActive
                        ? "border border-[#dcd2c2] bg-white text-[#635b50] hover:border-red-300 hover:text-red-700 hover:bg-red-50"
                        : "border border-emerald-300 bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs",
                    )}
                  >
                    {isActivating
                      ? "Updating…"
                      : item.isActive
                        ? "Deactivate (Make Draft)"
                        : "Activate Dish (Make Live)"}
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
            setItems((prev) => [newItem, ...prev.filter((i) => i.id !== newItem.id)]);
            void refreshMenu();
          }}
        />
      )}

      {editingItem && (
        <EditDishModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onUpdated={() => {
            void refreshMenu();
          }}
        />
      )}

      {pricingItem && (
        <EditPricesModal
          item={pricingItem}
          onClose={() => setPricingItem(null)}
          onPricesUpdated={() => {
            void refreshMenu();
          }}
        />
      )}

      {activeStockItem && (
        <ManageStockModal
          item={activeStockItem}
          outlets={outlets}
          togglingMap={togglingMap}
          onToggleStock={handleToggleStock}
          onBatchToggle={handleBatchToggleStock}
          onClose={() => setStockModalItemId(null)}
        />
      )}
    </div>
  );
}
