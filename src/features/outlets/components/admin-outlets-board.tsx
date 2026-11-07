"use client";

import { useState } from "react";
import {
  Store,
  Plus,
  Search,
  MapPin,
  ShieldCheck,
  Clock,
  Navigation,
  ChefHat,
  Flame,
  AlertTriangle,
  Edit2,
  Trash2,
  PauseCircle,
  PlayCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateOutletModal } from "./create-outlet-modal";
import { EditOutletModal, type OutletDetail } from "./edit-outlet-modal";
import { cn } from "@/lib/classes";

export interface OutletWithStats extends OutletDetail {
  slug: string;
  activeTicketCount: number;
  lifetimeOrderCount: number;
  availableDishesCount: number;
  createdAt: string;
}

interface AdminOutletsBoardProps {
  initialOutlets: OutletWithStats[];
}

export function AdminOutletsBoard({ initialOutlets }: AdminOutletsBoardProps) {
  const [outlets, setOutlets] = useState<OutletWithStats[]>(initialOutlets);
  const [filter, setFilter] = useState<"ALL" | "DINE_IN" | "CLOUD" | "ACTIVE" | "PAUSED">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingOutlet, setEditingOutlet] = useState<OutletWithStats | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  async function refreshOutlets() {
    try {
      const res = await fetch("/api/admin/outlets");
      if (res.ok) {
        const data = await res.json();
        setOutlets(data.outlets);
      }
    } catch {
      // Keep existing outlets on fetch error
    }
  }

  async function handleToggleStatus(outlet: OutletWithStats) {
    setIsUpdating(outlet.id);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/outlets/${outlet.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !outlet.isActive }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to toggle outlet status");
      }
      setOutlets((prev) =>
        prev.map((o) => (o.id === outlet.id ? { ...o, isActive: !o.isActive } : o)),
      );
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Error updating outlet");
    } finally {
      setIsUpdating(null);
    }
  }

  async function handleDeleteOutlet(outlet: OutletWithStats) {
    if (outlet.activeTicketCount > 0) {
      alert(
        `Cannot delete "${outlet.name}" because it currently has ${outlet.activeTicketCount} active tickets in preparation. Pause the outlet instead.`,
      );
      return;
    }

    const confirmed = confirm(
      `Are you sure you want to permanently decommission "${outlet.name}"? This action cannot be undone.`,
    );
    if (!confirmed) return;

    setIsUpdating(outlet.id);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/outlets/${outlet.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete outlet");
      }
      setOutlets((prev) => prev.filter((o) => o.id !== outlet.id));
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Error deleting outlet");
    } finally {
      setIsUpdating(null);
    }
  }

  // Filter & Search logic
  const filtered = outlets.filter((o) => {
    if (filter === "DINE_IN" && o.isCloudKitchen) return false;
    if (filter === "CLOUD" && !o.isCloudKitchen) return false;
    if (filter === "ACTIVE" && !o.isActive) return false;
    if (filter === "PAUSED" && o.isActive) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        o.name.toLowerCase().includes(q) ||
        o.address.toLowerCase().includes(q) ||
        o.fssaiLicense.includes(q) ||
        o.city.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const dineInCount = outlets.filter((o) => !o.isCloudKitchen).length;
  const cloudCount = outlets.filter((o) => o.isCloudKitchen).length;
  const pausedCount = outlets.filter((o) => !o.isActive).length;

  return (
    <div className="space-y-6">
      {/* Action Error Banner */}
      {actionError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-800 shadow-sm flex items-center justify-between">
          <span>{actionError}</span>
          <button
            onClick={() => setActionError(null)}
            className="text-red-900 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Stats Ribbon */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-2xl border border-[#ded2bf] bg-[#fffdfa] p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#7a6f60]">
            <Store className="h-4 w-4 text-[#0f352d]" />
            <span>Total Fleet</span>
          </div>
          <p className="mt-2 text-2xl font-black text-[#0f352d]">{outlets.length}</p>
          <p className="mt-1 text-[11px] text-[#7a6f60]">Hyderabad chain network</p>
        </div>

        <div className="rounded-2xl border border-[#ded2bf] bg-[#fffdfa] p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#7a6f60]">
            <ChefHat className="h-4 w-4 text-[#c99b53]" />
            <span>Dine-in Outlets</span>
          </div>
          <p className="mt-2 text-2xl font-black text-[#0f352d]">{dineInCount}</p>
          <p className="mt-1 text-[11px] text-[#7a6f60]">Flagship dine-in locations</p>
        </div>

        <div className="rounded-2xl border border-[#ded2bf] bg-[#fffdfa] p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#7a6f60]">
            <Flame className="h-4 w-4 text-[#4a1d5a]" />
            <span>Cloud Kitchens</span>
          </div>
          <p className="mt-2 text-2xl font-black text-[#4a1d5a]">{cloudCount}</p>
          <p className="mt-1 text-[11px] text-[#7a6f60]">Delivery-only cloud hubs</p>
        </div>

        <div className="rounded-2xl border border-[#ded2bf] bg-[#fffdfa] p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#7a6f60]">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span>Paused Outlets</span>
          </div>
          <p className="mt-2 text-2xl font-black text-amber-700">{pausedCount}</p>
          <p className="mt-1 text-[11px] text-[#7a6f60]">Orders temporarily held</p>
        </div>
      </div>

      {/* Control Bar: Search, Filters, and New Outlet Action */}
      <div className="flex flex-col gap-4 rounded-2xl border border-[#ded2bf] bg-[#fffdfa] p-4 shadow-xs md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { key: "ALL", label: `All (${outlets.length})` },
              { key: "DINE_IN", label: `Dine-in (${dineInCount})` },
              { key: "CLOUD", label: `Cloud Kitchens (${cloudCount})` },
              { key: "ACTIVE", label: `Active (${outlets.length - pausedCount})` },
              { key: "PAUSED", label: `Paused (${pausedCount})` },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setFilter(t.key)}
              className={cn(
                "rounded-xl px-3 py-1.5 text-xs font-bold transition-all",
                filter === t.key
                  ? "bg-[#0f352d] text-white shadow-xs"
                  : "bg-[#f5efe4] text-[#544d42] hover:bg-[#ede5d6]",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#7a6f60]" />
            <input
              type="text"
              placeholder="Search outlet, address, FSSAI..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-[#ded2bf] bg-[#faf7f2] py-2 pl-9 pr-3 text-xs font-semibold text-[#1f1c18] placeholder-[#7a6f60] focus:border-[#0f352d] focus:outline-hidden"
            />
          </div>

          <Button
            type="button"
            variant="primary"
            onClick={() => setIsCreateOpen(true)}
            className="shrink-0 flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>Add Outlet</span>
          </Button>
        </div>
      </div>

      {/* Outlets Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#ded2bf] bg-[#fffdfa] p-12 text-center shadow-xs">
          <Store className="mx-auto h-12 w-12 text-[#b8ab96]" />
          <h3 className="mt-3 font-display text-lg font-bold text-[#0f352d]">
            No outlets found
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-[#7a6f60]">
            No outlets match your active search query or filter tags.
          </p>
          {(searchQuery || filter !== "ALL") && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setFilter("ALL");
              }}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0f352d] px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-[#15463b] transition"
            >
              <span>Reset All Filters</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((outlet) => (
            <div
              key={outlet.id}
              className={cn(
                "group relative flex flex-col justify-between rounded-2xl border p-5 transition-all shadow-xs",
                outlet.isActive
                  ? "border-[#ded2bf] bg-[#fffdfa] hover:border-[#0f352d]/40 hover:shadow-md"
                  : "border-amber-200 bg-amber-50/40 opacity-85",
              )}
            >
              <div>
                {/* Header: Name + Badges */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-display text-base font-bold text-[#0f352d] group-hover:text-[#185346] transition-colors">
                      {outlet.name}
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span
                        className={cn(
                          "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                          outlet.isCloudKitchen
                            ? "border border-[#e4d3f1] bg-[#f7f2fa] text-[#4a1d5a]"
                            : "border border-[#ded2bf] bg-[#faf7f2] text-[#0f352d]",
                        )}
                      >
                        {outlet.isCloudKitchen ? "☁️ Cloud Kitchen" : "🍽️ Dine-in"}
                      </span>

                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                          outlet.isActive
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : "bg-amber-100 text-amber-800 border border-amber-200",
                        )}
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            outlet.isActive ? "bg-emerald-600 animate-pulse" : "bg-amber-600",
                          )}
                        />
                        {outlet.isActive ? "Accepting Orders" : "Orders Paused"}
                      </span>
                    </div>
                  </div>

                  {/* Explicit Action Button with Visible Text: "Pause Outlet" / "Resume Outlet" */}
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(outlet)}
                    disabled={isUpdating === outlet.id}
                    title={outlet.isActive ? "Click to Pause Kitchen Orders" : "Click to Resume Kitchen Orders"}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-bold transition shadow-2xs",
                      outlet.isActive
                        ? "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 hover:border-amber-400"
                        : "border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 hover:border-emerald-400",
                    )}
                  >
                    {outlet.isActive ? (
                      <>
                        <PauseCircle className="h-3.5 w-3.5 text-amber-700" />
                        <span>Pause Outlet</span>
                      </>
                    ) : (
                      <>
                        <PlayCircle className="h-3.5 w-3.5 text-emerald-700" />
                        <span>Resume Outlet</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Address */}
                <p className="mt-3 flex items-start gap-1.5 text-xs text-[#544d42] leading-5">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-[#c99b53] mt-0.5" />
                  <span>{outlet.address}</span>
                </p>

                {/* FSSAI Badge */}
                <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-[#e8dfcf] bg-[#fbf9f5] px-2.5 py-1 text-[11px] font-medium text-[#544d42]">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#0f352d]" />
                  <span>FSSAI: <strong className="font-mono">{outlet.fssaiLicense}</strong></span>
                </div>

                {/* Operational Details Grid */}
                <div className="mt-4 grid grid-cols-2 gap-2 border-t border-[#ece3d5] pt-3 text-xs text-[#544d42]">
                  <div className="flex items-center gap-1.5">
                    <Navigation className="h-3.5 w-3.5 text-[#c99b53]" />
                    <span>Radius: <strong>{outlet.deliveryRadiusKm} km</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-[#c99b53]" />
                    <span>Prep: <strong>{outlet.minimumPrepMinutes}m + {outlet.packingMinutes}m</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ChefHat className="h-3.5 w-3.5 text-[#0f352d]" />
                    <span>Live in prep: <strong className="text-[#0f352d]">{outlet.activeTicketCount}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Store className="h-3.5 w-3.5 text-[#0f352d]" />
                    <span>Active dishes: <strong>{outlet.availableDishesCount}</strong></span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 flex items-center justify-end gap-2 border-t border-[#ece3d5] pt-3">
                <Button
                  type="button"
                  variant="tertiary"
                  onClick={() => setEditingOutlet(outlet)}
                  className="px-2.5 py-1 text-xs font-bold text-[#0f352d] hover:bg-[#faf7f2] flex items-center gap-1"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>Edit</span>
                </Button>

                <Button
                  type="button"
                  variant="tertiary"
                  onClick={() => handleDeleteOutlet(outlet)}
                  disabled={isUpdating === outlet.id}
                  className="px-2.5 py-1 text-xs font-bold text-red-700 hover:bg-red-50 flex items-center gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Decommission</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <CreateOutletModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={refreshOutlets}
      />

      <EditOutletModal
        outlet={editingOutlet}
        isOpen={Boolean(editingOutlet)}
        onClose={() => setEditingOutlet(null)}
        onUpdated={refreshOutlets}
      />
    </div>
  );
}
