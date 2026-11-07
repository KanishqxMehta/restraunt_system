"use client";

import { useEffect, useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Sliders,
  AlertTriangle,
  Flame,
  BellRing,
  CheckCircle2,
  Clock,
  Search,
  Store,
  ChevronLeft,
  ChevronRight,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { InputField } from "@/components/ui/input-field";
import { SelectMenu } from "@/components/ui/select-menu";
import { useAlert } from "@/components/ui/alert-toast";
import { DietaryMark } from "@/features/menu/components/dietary-mark";
import { ClientError, errorMessage, requestJson } from "@/lib/http-client";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/classes";
import type { listKitchenOrders } from "../repository";
import { snapshotAddons } from "../snapshots";
import { kitchenStages, stageActions, type KitchenStage } from "../stages";

type Ticket = Awaited<ReturnType<typeof listKitchenOrders>>[number];

const laneLabels: Record<KitchenStage, string> = {
  NEW: "New orders",
  PREPARING: "Preparing",
  READY: "Ready for pickup",
};

const laneStyles: Record<
  KitchenStage,
  {
    accent: string;
    badgeBg: string;
    icon: typeof BellRing;
  }
> = {
  NEW: {
    accent: "from-[#c99b53] to-[#9e712a]",
    badgeBg: "border-amber-300 bg-amber-50 text-amber-950",
    icon: BellRing,
  },
  PREPARING: {
    accent: "from-[#3b1747] to-[#5e2570]",
    badgeBg: "border-[#dec9ec] bg-[#f7f2fa] text-[#3b1747]",
    icon: Flame,
  },
  READY: {
    accent: "from-[#0f352d] to-[#1a574a]",
    badgeBg: "border-emerald-300 bg-emerald-50 text-emerald-950",
    icon: CheckCircle2,
  },
};

function duration(ms: number) {
  const seconds = Math.floor(Math.abs(ms) / 1000);
  return (
    Math.floor(seconds / 60) +
    "m " +
    String(seconds % 60).padStart(2, "0") +
    "s"
  );
}

const PAGE_SIZE = 10;

export function KitchenBoard({
  tickets,
  outlets = [],
  canAdvance,
}: {
  tickets: Ticket[];
  outlets?: { id: string; name: string; isCloudKitchen?: boolean }[];
  canAdvance: boolean;
}) {
  const [now, setNow] = useState<number | null>(null);
  const [selectedOutletId, setSelectedOutletId] = useState<string>("ALL");
  const [outletCategory, setOutletCategory] = useState<"ALL" | "DINE_IN" | "CLOUD">("ALL");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"ALL" | "CRITICAL_LATE" | "CATERING">("ALL");
  const [pageByStage, setPageByStage] = useState<Record<KitchenStage, number>>({
    NEW: 1,
    PREPARING: 1,
    READY: 1,
  });

  const scrollRibbon = (offset: number) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  // Filter by Outlet
  const outletFiltered =
    selectedOutletId === "ALL"
      ? tickets
      : tickets.filter((t) => t.outlet.id === selectedOutletId);

  // Filter by Search Query & Tag
  const filteredTickets = outletFiltered.filter((t) => {
    if (filterMode === "CRITICAL_LATE" && !t.isCriticalLate) return false;
    if (filterMode === "CATERING" && !t.isCatering) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        t.orderNumber.toLowerCase().includes(q) ||
        t.outlet.name.toLowerCase().includes(q) ||
        (t.specialInstructions &&
          t.specialInstructions.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const criticalLateCount = outletFiltered.filter((t) => t.isCriticalLate).length;
  const cateringCount = outletFiltered.filter((t) => t.isCatering).length;

  const visibleOutlets = outlets.filter((o) => {
    if (outletCategory === "DINE_IN") return !o.isCloudKitchen;
    if (outletCategory === "CLOUD") return o.isCloudKitchen;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Multi-Outlet Switcher Ribbon (for Admin & Multi-Outlet Staff) */}
      {outlets.length > 1 && (
        <div className="flex flex-col gap-2 rounded-2xl border border-[#ded2bf] bg-[#fffdfa] p-3 shadow-xs">
          {/* Top Bar: Title, Category Segment Tabs, and Compact Dropdown Select */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#7a6f60]">
                <Store className="h-3.5 w-3.5 text-[#0f352d]" />
                <span>Kitchen Display Filter</span>
              </span>

              {/* Category Segment Tabs */}
              <div className="flex items-center rounded-lg border border-[#e5dcce] bg-[#faf7f2] p-0.5 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setOutletCategory("ALL")}
                  className={cn(
                    "rounded-md px-2 py-0.5 transition",
                    outletCategory === "ALL"
                      ? "bg-[#0f352d] text-white shadow-xs"
                      : "text-[#6b6255] hover:text-[#0f352d]",
                  )}
                >
                  All ({outlets.length})
                </button>
                <button
                  type="button"
                  onClick={() => setOutletCategory("DINE_IN")}
                  className={cn(
                    "rounded-md px-2 py-0.5 transition",
                    outletCategory === "DINE_IN"
                      ? "bg-[#0f352d] text-white shadow-xs"
                      : "text-[#6b6255] hover:text-[#0f352d]",
                  )}
                >
                  🍽️ Dine-in ({outlets.filter((o) => !o.isCloudKitchen).length})
                </button>
                <button
                  type="button"
                  onClick={() => setOutletCategory("CLOUD")}
                  className={cn(
                    "rounded-md px-2 py-0.5 transition",
                    outletCategory === "CLOUD"
                      ? "bg-[#0f352d] text-white shadow-xs"
                      : "text-[#6b6255] hover:text-[#0f352d]",
                  )}
                >
                  ☁️ Cloud ({outlets.filter((o) => o.isCloudKitchen).length})
                </button>
              </div>
            </div>

            {/* Quick Custom Pop Menu: Instant jump to any of 15+ outlets */}
            <div className="flex items-center gap-2">
              <SelectMenu
                ariaLabel="Select Kitchen Outlet"
                value={selectedOutletId}
                onChange={(val) => {
                  setSelectedOutletId(val);
                  setPageByStage({ NEW: 1, PREPARING: 1, READY: 1 });
                }}
                align="right"
                searchPlaceholder="Search kitchen outlet..."
                options={[
                  {
                    value: "ALL",
                    label: "All Kitchens",
                    badge: `${tickets.length} tickets`,
                  },
                  ...outlets
                    .filter((o) => !o.isCloudKitchen)
                    .map((o) => {
                      const count = tickets.filter(
                        (t) => t.outlet.id === o.id,
                      ).length;
                      return {
                        value: o.id,
                        label: `🍽️ ${o.name}`,
                        badge: `${count} tickets`,
                        group: "🍽️ Flagship Dine-in Outlets",
                      };
                    }),
                  ...outlets
                    .filter((o) => o.isCloudKitchen)
                    .map((o) => {
                      const count = tickets.filter(
                        (t) => t.outlet.id === o.id,
                      ).length;
                      return {
                        value: o.id,
                        label: `☁️ ${o.name}`,
                        badge: `${count} tickets`,
                        group: "☁️ Cloud Kitchens",
                      };
                    }),
                ]}
              />
            </div>
          </div>

          {/* Single-Line Horizontally Scrollable Track with Left/Right Nav Buttons */}
          <div className="relative flex items-center gap-1">
            <button
              type="button"
              onClick={() => scrollRibbon(-220)}
              title="Scroll left"
              aria-label="Scroll left"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#ded2bf] bg-[#faf7f2] text-[#544d42] transition hover:bg-[#ede5d6]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div
              ref={scrollContainerRef}
              className="flex flex-1 items-center gap-1.5 overflow-x-auto scroll-smooth py-1 scrollbar-none"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              <button
                type="button"
                onClick={() => {
                  setSelectedOutletId("ALL");
                  setPageByStage({ NEW: 1, PREPARING: 1, READY: 1 });
                }}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition",
                  selectedOutletId === "ALL"
                    ? "bg-[#0f352d] text-white shadow-xs"
                    : "bg-[#f5efe4] text-[#544d42] hover:bg-[#ede5d6]",
                )}
              >
                <span>All Kitchens</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.2 text-[10px]",
                    selectedOutletId === "ALL"
                      ? "bg-white/20 text-white"
                      : "bg-[#e2d8c7] text-[#332e26]",
                  )}
                >
                  {tickets.length}
                </span>
              </button>

              {visibleOutlets.map((outlet) => {
                const count = tickets.filter((t) => t.outlet.id === outlet.id).length;
                const isSelected = selectedOutletId === outlet.id;
                return (
                  <button
                    key={outlet.id}
                    type="button"
                    onClick={() => {
                      setSelectedOutletId(outlet.id);
                      setPageByStage({ NEW: 1, PREPARING: 1, READY: 1 });
                    }}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition",
                      isSelected
                        ? "bg-[#0f352d] text-white shadow-xs"
                        : "bg-[#f5efe4] text-[#544d42] hover:bg-[#ede5d6]",
                    )}
                  >
                    <span>
                      {outlet.isCloudKitchen ? "☁️" : "🍽️"} {outlet.name}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.2 text-[10px]",
                        isSelected
                          ? "bg-white/20 text-white"
                          : "bg-[#e2d8c7] text-[#332e26]",
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => scrollRibbon(220)}
              title="Scroll right"
              aria-label="Scroll right"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#ded2bf] bg-[#faf7f2] text-[#544d42] transition hover:bg-[#ede5d6]"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Control Strip: Search & Urgency / Category Quick Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#ded2bf] bg-[#fffdfa] p-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { key: "ALL", label: `All Orders (${outletFiltered.length})` },
              { key: "CRITICAL_LATE", label: `🚨 10+ Min Late (${criticalLateCount})` },
              { key: "CATERING", label: `🎉 Bulk Catering (${cateringCount})` },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setFilterMode(t.key);
                setPageByStage({ NEW: 1, PREPARING: 1, READY: 1 });
              }}
              className={cn(
                "rounded-xl px-3 py-1 text-xs font-bold transition",
                filterMode === t.key
                  ? "bg-[#3b1747] text-[#f4d6a9] shadow-xs"
                  : "bg-[#f5efe4] text-[#544d42] hover:bg-[#ede5d6]",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#7a6f60]" />
          <input
            type="text"
            placeholder="Search ticket # or notes..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPageByStage({ NEW: 1, PREPARING: 1, READY: 1 });
            }}
            className="w-full rounded-xl border border-[#ded2bf] bg-[#faf7f2] py-1.5 pl-8 pr-3 text-xs font-semibold text-[#1f1c18] placeholder-[#7a6f60] focus:border-[#0f352d] focus:outline-hidden"
          />
        </div>
      </div>

      {/* 3-Column Kanban Board with Fixed Viewport Height & Independent Internal Scrolling */}
      <div className="grid items-start gap-6 lg:grid-cols-3">
        {kitchenStages.map((stage) => {
          // Sort stage orders by urgency: Critical Late -> Late -> Earliest promised
          const stageOrders = filteredTickets
            .filter((ticket) => ticket.status === stage)
            .sort((a, b) => {
              if (a.isCriticalLate && !b.isCriticalLate) return -1;
              if (!a.isCriticalLate && b.isCriticalLate) return 1;
              if (a.isLate && !b.isLate) return -1;
              if (!a.isLate && b.isLate) return 1;
              return a.promisedReadyAt.getTime() - b.promisedReadyAt.getTime();
            });

          const totalOrders = stageOrders.length;
          const currentPage = pageByStage[stage] || 1;
          const totalPages = Math.ceil(totalOrders / PAGE_SIZE) || 1;
          const paginatedOrders = stageOrders.slice(
            (currentPage - 1) * PAGE_SIZE,
            currentPage * PAGE_SIZE,
          );

          const style = laneStyles[stage];
          const Icon = style.icon;

          return (
            <section
              key={stage}
              aria-label={laneLabels[stage]}
              className="flex flex-col h-[calc(100vh-16rem)] min-h-[580px] max-h-[850px] overflow-hidden rounded-[1.75rem] border border-[#dfd4c2] bg-[#f4ede2]/90 shadow-xs"
            >
              {/* Lane Top Accent */}
              <div
                className={cn("h-1.5 w-full shrink-0 bg-gradient-to-r", style.accent)}
              />

              {/* Fixed Sticky Header */}
              <header className="shrink-0 flex items-center justify-between gap-2 border-b border-[#e4dac9] bg-[#fffdfa] px-5 py-3.5">
                <div className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4 text-[#0f352d]" aria-hidden="true" />
                  <h2 className="font-display text-base font-bold tracking-tight text-[#0f352d]">
                    {laneLabels[stage]}
                  </h2>
                </div>
                <span
                  className={cn(
                    "font-mono-tabular rounded-full border px-3 py-0.5 text-xs font-extrabold",
                    style.badgeBg,
                  )}
                >
                  {totalOrders}
                </span>
              </header>

              {/* Scrollable Card Container */}
              <div className="flex-1 overflow-y-auto space-y-4 p-4 scrollbar-thin">
                {totalOrders === 0 && (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#d6c9b6] bg-[#faf7f2]/80 px-4 py-12 text-center text-xs">
                    {filterMode === "CRITICAL_LATE" ? (
                      <>
                        <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="h-5 w-5" />
                        </div>
                        <p className="font-bold text-[#0f352d]">Zero 10+ Min Delays</p>
                        <p className="mt-1 text-[11px] text-[#7a6f60]">Kitchen SLA is 100% compliant in this lane.</p>
                      </>
                    ) : filterMode === "CATERING" ? (
                      <>
                        <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-[#f7f2fa] text-[#4a1d5a]">
                          <Store className="h-5 w-5" />
                        </div>
                        <p className="font-bold text-[#0f352d]">No Catering Tickets</p>
                        <p className="mt-1 text-[11px] text-[#7a6f60]">No bulk orders currently queued here.</p>
                      </>
                    ) : searchQuery.trim() ? (
                      <>
                        <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-[#f5efe4] text-[#7a6f60]">
                          <Search className="h-4 w-4" />
                        </div>
                        <p className="font-bold text-[#0f352d]">No Match</p>
                        <p className="mt-1 text-[11px] text-[#7a6f60]">No ticket matches &ldquo;{searchQuery}&rdquo;.</p>
                      </>
                    ) : (
                      <>
                        <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                          <CheckCircle2 className="h-5 w-5" />
                        </div>
                        <p className="font-bold text-[#0f352d]">Lane All Clear</p>
                        <p className="mt-1 text-[11px] text-[#7a6f60]">Standing by for incoming order tickets.</p>
                      </>
                    )}
                  </div>
                )}
                {paginatedOrders.map((ticket) => (
                  <KitchenTicket
                    key={ticket.id}
                    ticket={ticket}
                    stage={stage}
                    now={now}
                    canAdvance={canAdvance}
                  />
                ))}
              </div>

              {/* Sticky Footer: Lane Batch Paging when > PAGE_SIZE */}
              {totalPages > 1 && (
                <footer className="shrink-0 flex items-center justify-between border-t border-[#e4dac9] bg-[#fffdfa] px-4 py-2.5 text-xs text-[#544d42]">
                  <button
                    type="button"
                    onClick={() =>
                      setPageByStage((prev) => ({
                        ...prev,
                        [stage]: Math.max(1, currentPage - 1),
                      }))
                    }
                    disabled={currentPage === 1}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#ded2bf] px-2.5 py-1 text-[11px] font-bold text-[#0f352d] disabled:opacity-40 hover:bg-[#faf7f2] transition cursor-pointer"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    <span>Prev</span>
                  </button>

                  <span className="font-mono text-[11px] font-semibold text-[#7a6f60]">
                    Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, totalOrders)} of {totalOrders}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setPageByStage((prev) => ({
                        ...prev,
                        [stage]: Math.min(totalPages, currentPage + 1),
                      }))
                    }
                    disabled={currentPage === totalPages}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#ded2bf] px-2.5 py-1 text-[11px] font-bold text-[#0f352d] disabled:opacity-40 hover:bg-[#faf7f2] transition cursor-pointer"
                  >
                    <span>Next</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </footer>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function KitchenTicket({
  ticket,
  stage,
  now,
  canAdvance,
}: {
  ticket: Ticket;
  stage: KitchenStage;
  now: number | null;
  canAdvance: boolean;
}) {
  const router = useRouter();
  const alert = useAlert();
  const [refreshing, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [overriding, setOverriding] = useState(false);
  const [confirmingCatering, setConfirmingCatering] = useState(false);
  const [cateringNotes, setCateringNotes] = useState(
    "Handis allocated; slot locked",
  );
  const [cateringSaving, setCateringSaving] = useState(false);
  const [cateringError, setCateringError] = useState("");

  const isUnconfirmedCatering = Boolean(
    ticket.isCatering && ticket.cateringStatus !== "CONFIRMED",
  );

  async function handleConfirmCatering(actionKey: "CONFIRM" | "DECLINE") {
    setCateringSaving(true);
    setCateringError("");
    try {
      await requestJson(
        "/api/kitchen/catering/" + encodeURIComponent(ticket.id) + "/confirm",
        {
          method: "POST",
          body: JSON.stringify({
            action: actionKey,
            notes: cateringNotes.trim(),
          }),
        },
      );
      setConfirmingCatering(false);
      if (actionKey === "CONFIRM") {
        alert.success(
          "Party Catering Confirmed",
          `Order ${ticket.orderNumber} (${ticket.guestCount ?? 20} guests) confirmed. Kitchen preparation stages are now unlocked.`,
        );
      } else {
        alert.general(
          "Party Catering Declined",
          `Order ${ticket.orderNumber} was declined and removed from the active kitchen queue.`,
        );
      }
      startTransition(() => router.refresh());
    } catch (err) {
      const msg = errorMessage(err);
      setCateringError(msg);
      alert.failure("Catering Review Failed", msg);
    } finally {
      setCateringSaving(false);
    }
  }

  // Override Form State
  const [extraMinutes, setExtraMinutes] = useState(10);
  const [overrideReason, setOverrideReason] = useState(
    "Station backlog / Dum batch release",
  );
  const [overrideSaving, setOverrideSaving] = useState(false);
  const [overrideError, setOverrideError] = useState("");

  const remaining =
    now === null ? null : ticket.promisedReadyAt.getTime() - now;
  const late =
    stage !== "READY" && (remaining === null ? ticket.isLate : remaining < 0);
  const criticalLate =
    stage !== "READY" &&
    (remaining === null
      ? ticket.isCriticalLate
      : remaining <= -10 * 60 * 1000);

  const age =
    now === null ? null : Math.max(0, now - ticket.queuedAt.getTime());
  const pickupWait =
    now === null || ticket.readyAt === null
      ? null
      : Math.max(0, now - ticket.readyAt.getTime());
  const action = stageActions[stage];

  async function advance() {
    if (saving || refreshing) return;
    if (isUnconfirmedCatering) {
      const msg =
        "Bulk or party orders cannot change state until confirmed by the Catering Manager. Click 'Review & Confirm' above first.";
      alert.failure("State Change Blocked", msg);
      return;
    }
    setConfirming(false);
    setSaving(true);
    try {
      await requestJson(
        "/api/kitchen/orders/" + encodeURIComponent(ticket.id) + "/stage",
        {
          method: "POST",
          body: JSON.stringify({ expectedStage: stage }),
        },
      );
      const nextStageLabel =
        action.next === "PREPARING"
          ? "Preparing"
          : action.next === "READY"
            ? "Ready for pickup"
            : "Handed off to rider";
      alert.success(
        "Order Stage Updated",
        `Ticket ${ticket.orderNumber} moved to "${nextStageLabel}".`,
      );
      startTransition(() => router.refresh());
    } catch (err) {
      const msg = errorMessage(err);
      alert.failure("Stage Change Failed", msg);
      if (err instanceof ClientError && [404, 409].includes(err.status)) {
        startTransition(() => router.refresh());
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleOverride(e: React.FormEvent) {
    e.preventDefault();
    if (isUnconfirmedCatering) {
      const msg =
        "Confirm the bulk catering order before adjusting preparation promises.";
      setOverrideError(msg);
      alert.failure("Catering Confirmation Required", msg);
      return;
    }
    if (!overrideReason.trim()) {
      setOverrideError("Please provide an override reason.");
      alert.failure("Reason Required", "Please provide an override reason.");
      return;
    }
    setOverrideSaving(true);
    setOverrideError("");

    try {
      await requestJson(
        "/api/kitchen/orders/" +
          encodeURIComponent(ticket.id) +
          "/override-promise",
        {
          method: "POST",
          body: JSON.stringify({
            extraMinutes: Number(extraMinutes),
            reason: overrideReason.trim(),
          }),
        },
      );
      setOverriding(false);
      alert.general(
        "Promise Time Adjusted",
        `Extended ${ticket.orderNumber} by +${extraMinutes} min (${overrideReason.trim()}). Customer notified.`,
      );
      startTransition(() => router.refresh());
    } catch (err) {
      const msg = errorMessage(err);
      setOverrideError(msg);
      alert.failure("Promise Override Failed", msg);
    } finally {
      setOverrideSaving(false);
    }
  }

  return (
    <article
      className={cn(
        "min-w-0 rounded-2xl border p-4 transition-all shadow-xs",
        criticalLate
          ? "border-2 border-red-600 bg-red-50/70 ring-2 ring-red-400/50"
          : late
            ? "border-red-400 bg-red-50/35"
            : "border-[#dfd4c2] bg-[#fffdfa] hover:border-[#0f352d]/45 hover:shadow-md",
      )}
    >
      {/* Critical 10+ Min Lateness Alert Banner */}
      {criticalLate && (
        <div className="mb-3 flex animate-pulse items-center justify-center gap-1.5 rounded-xl bg-red-600 px-3 py-1.5 text-center text-xs font-bold tracking-wider uppercase text-white">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          10+ Min Late · Manager Alert
        </div>
      )}

      {/* Catering Banner */}
      {ticket.isCatering && (
        <div className="mb-3 space-y-2 rounded-xl border border-[#dec9ec] bg-[#f7f2fa] p-2.5 text-xs text-[#3b1747] shadow-2xs">
          <div className="flex items-center justify-between font-bold">
            <span>🎉 Bulk Catering · {ticket.guestCount ?? 20} Guests</span>
            {ticket.eventDate && (
              <span className="font-mono font-semibold text-[#6b21a8]">
                Slot: {formatTime(new Date(ticket.eventDate))}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between border-t border-[#dec9ec]/50 pt-1.5">
            <span
              className={cn(
                "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                ticket.cateringStatus === "CONFIRMED"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-900",
              )}
            >
              {ticket.cateringStatus === "CONFIRMED"
                ? `Confirmed by ${ticket.cateringConfirmedBy || "Manager"}`
                : "Needs Catering Review"}
            </span>

            {ticket.cateringStatus !== "CONFIRMED" && (
              <button
                type="button"
                onClick={() => setConfirmingCatering(true)}
                className="rounded-lg bg-[#3b1747] px-2.5 py-1 text-[11px] font-bold text-[#f4d6a9] transition hover:bg-[#250e2d]"
              >
                Review & Confirm
              </button>
            )}
          </div>
          {ticket.cateringStatus === "CONFIRMED" && ticket.cateringNotes && (
            <p className="text-[11px] text-[#4a1d5a] italic">
              &ldquo;{ticket.cateringNotes}&rdquo;
            </p>
          )}
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-mono text-xl font-black tracking-tight break-all text-[#0f352d]">
            {ticket.orderNumber}
          </h3>
          <p className="mt-0.5 text-xs font-semibold text-[#635b50]">
            {ticket.outlet.name}
          </p>
        </div>

        {/* AI & Override Status Badges */}
        <div className="flex flex-col items-end gap-1">
          {ticket.estimateSource === "GEMINI_AI" && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[#a7f3d0] bg-[#ecfdf5] px-2.5 py-0.5 text-[11px] font-bold text-[#065f46]">
              <Sparkles className="h-3 w-3 text-[#059669]" aria-hidden="true" />{" "}
              Gemini AI
            </span>
          )}
          {ticket.estimateSource === "MANAGER_OVERRIDE" && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[#dec9ec] bg-[#f7f2fa] px-2.5 py-0.5 text-[11px] font-bold text-[#4a1d5a]">
              <Sliders className="h-3 w-3 text-[#6b21a8]" aria-hidden="true" />{" "}
              Override
            </span>
          )}
        </div>
      </div>

      {ticket.managerOverrideReason && (
        <p className="mt-2.5 rounded-xl border border-[#dec9ec] bg-[#faf6fd] p-2.5 text-xs text-[#3b1747]">
          <strong className="text-[#4a1d5a]">Supervisor note:</strong>{" "}
          {ticket.managerOverrideReason}
        </p>
      )}

      {ticket.specialInstructions && (
        <p className="mt-2.5 rounded-xl border border-[#dec9ec] bg-[#faf6fd] p-2.5 text-xs text-[#522960]">
          <strong className="text-[#3b1747]">Event note:</strong>{" "}
          {ticket.specialInstructions}
        </p>
      )}

      {/* Timer & Due Display */}
      <div
        className={cn(
          "font-mono-tabular mt-3.5 flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-bold",
          criticalLate
            ? "bg-red-700 text-white"
            : late
              ? "border border-red-300 bg-red-100 text-red-900"
              : "border border-[#a7f3d0]/70 bg-[#eef6f4] text-[#0f352d]",
        )}
      >
        <span className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {stage === "READY"
            ? pickupWait === null
              ? "Waiting for pickup"
              : "Pickup wait " + duration(pickupWait)
            : remaining === null
              ? "Due " + formatTime(ticket.promisedReadyAt)
              : late
                ? "Late by " + duration(remaining)
                : "Due in " + duration(remaining)}
        </span>
        <span className="text-xs font-normal opacity-85">
          Promised {formatTime(ticket.promisedReadyAt)}
        </span>
      </div>

      {stage !== "READY" && age !== null && (
        <p className="mt-2 text-xs text-[#655c50]">
          Accepted {duration(age)} ago
        </p>
      )}

      {/* Items List */}
      <ul className="my-4 divide-y divide-[#ece3d5] rounded-xl border border-[#ece3d5] bg-[#faf7f2] px-3.5 py-1">
        {ticket.items.map((item, index) => {
          const addons = snapshotAddons(item.addons);
          return (
            <li key={index} className="py-2.5">
              <p className="text-sm font-extrabold text-[#1f1c18]">
                {item.quantity} × {item.name}
              </p>
              <p className="text-xs font-medium text-[#575046]">
                {item.portionName}
                {addons.length > 0 &&
                  " · " + addons.map((addon) => addon.name).join(", ")}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                <DietaryMark isVeg={item.isVeg} />
                {item.allergens.length > 0 && (
                  <p className="text-[11px] font-semibold text-amber-900">
                    Allergens: {item.allergens.join(", ")}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {canAdvance && (
          <Button
            variant={isUnconfirmedCatering ? "secondary" : "primary"}
            className={cn(
              "min-h-11 flex-1 font-bold",
              isUnconfirmedCatering &&
                "border-amber-300 bg-amber-50/80 text-amber-950 hover:border-amber-400 hover:bg-amber-100/80",
            )}
            disabled={saving || refreshing}
            onClick={() => {
              if (isUnconfirmedCatering) {
                const msg =
                  "Bulk or party orders cannot change state until confirmed by the Catering Manager. Click 'Review & Confirm' above first.";
                alert.failure("State Change Blocked", msg);
                return;
              }
              if (stage === "READY") {
                setConfirming(true);
              } else {
                void advance();
              }
            }}
          >
            {saving || refreshing ? (
              "Updating…"
            ) : isUnconfirmedCatering ? (
              <>
                <Lock className="h-3.5 w-3.5 text-amber-800" aria-hidden="true" />
                <span>Confirm Catering First</span>
              </>
            ) : (
              action.label
            )}
          </Button>
        )}

        {stage !== "READY" && canAdvance && (
          <button
            type="button"
            onClick={() => {
              if (isUnconfirmedCatering) {
                const msg =
                  "Confirm the bulk catering order before adjusting preparation promises.";
                alert.failure("State Change Blocked", msg);
                return;
              }
              setOverriding(true);
            }}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-[#d8bfe8] bg-[#f7f2fa] px-3.5 py-2 text-xs font-bold text-[#3b1747] shadow-2xs transition hover:bg-[#ede0f5]"
            title="Adjust promised preparation time"
          >
            <Sliders className="h-3.5 w-3.5" aria-hidden="true" />
            Adjust
          </button>
        )}
      </div>

      {/* Rider Handoff Modal */}
      {confirming && (
        <Modal
          title="Confirm rider handoff"
          onClose={() => setConfirming(false)}
        >
          <p className="mb-6 text-sm leading-6 text-[#4e473d]">
            Confirm that the delivery partner has collected{" "}
            <strong className="font-mono text-[#0f352d]">
              {ticket.orderNumber}
            </strong>
            .
          </p>
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void advance()}>
              Confirm collected
            </Button>
          </div>
        </Modal>
      )}

      {/* Manager Override Modal */}
      {overriding && (
        <Modal
          title={`Adjust promise: ${ticket.orderNumber}`}
          onClose={() => setOverriding(false)}
        >
          <form onSubmit={handleOverride} className="space-y-4">
            <p className="text-xs leading-5 text-[#544d42]">
              Kitchen supervisors can adjust the promised ready time if
              unexpected delays occur. The customer&apos;s live tracking screen
              will update immediately.
            </p>

            {overrideError && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800"
              >
                {overrideError}
              </div>
            )}

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#0f352d]">
                Extend ready time from now by:
              </label>
              <div className="mb-3 flex gap-2">
                {[5, 10, 15, 20].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setExtraMinutes(mins)}
                    className={cn(
                      "flex-1 rounded-xl border py-2 text-xs font-bold transition",
                      extraMinutes === mins
                        ? "border-[#3b1747] bg-[#3b1747] text-white shadow-xs"
                        : "border-[#dfd4c2] bg-[#faf7f2] text-[#544d42] hover:bg-[#f7f2fa] hover:text-[#4a1d5a]",
                    )}
                  >
                    +{mins} min
                  </button>
                ))}
              </div>
              <InputField
                label="Custom minutes from now"
                type="number"
                min={1}
                max={180}
                value={extraMinutes}
                onChange={(e) => setExtraMinutes(Number(e.target.value))}
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#433d35]">
                Reason for delay:
              </label>
              <SelectMenu
                ariaLabel="Select reason for delay"
                size="md"
                fullWidth
                searchable={false}
                className="mb-3"
                value={overrideReason}
                onChange={setOverrideReason}
                options={[
                  {
                    value: "Station backlog / Dum batch release",
                    label: "Station backlog / Dum batch release",
                  },
                  {
                    value: "Hand-crafted dum pot slow to seal",
                    label: "Hand-crafted dum pot slow to seal",
                  },
                  {
                    value: "Ingredient restocking from storage",
                    label: "Ingredient restocking from storage",
                  },
                  {
                    value: "Peak rush container packaging backlog",
                    label: "Peak rush container packaging backlog",
                  },
                  {
                    value: "Delivery partner rider delayed",
                    label: "Delivery partner rider delayed",
                  },
                ]}
              />
              <InputField
                label="Or custom explanation"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                required
              />
            </div>

            <div className="flex justify-end gap-3 border-t border-[#ece3d5] pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setOverriding(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={overrideSaving}>
                {overrideSaving ? "Saving…" : "Update promised time"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Catering Manager Review Modal */}
      {confirmingCatering && (
        <Modal
          title={`Confirm Catering: ${ticket.orderNumber}`}
          onClose={() => setConfirmingCatering(false)}
        >
          <div className="space-y-4">
            {cateringError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800">
                {cateringError}
              </div>
            )}
            <div className="rounded-2xl border border-[#ded2bf] bg-[#faf7f2] p-4 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="font-bold text-[#7a6f60]">Guest Count:</span>
                <span className="font-black text-[#0f352d]">{ticket.guestCount ?? 20} Guests</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-[#7a6f60]">Scheduled Slot:</span>
                <span className="font-mono font-bold text-[#3b1747]">
                  {ticket.eventDate ? formatTime(new Date(ticket.eventDate)) : "Standard"}
                </span>
              </div>
              {ticket.specialInstructions && (
                <div className="pt-2 border-t border-[#ece3d5]">
                  <span className="font-bold text-[#7a6f60]">Customer Instructions:</span>
                  <p className="mt-0.5 italic text-[#544d42]">{ticket.specialInstructions}</p>
                </div>
              )}
            </div>

            <InputField
              label="Catering Manager Note"
              value={cateringNotes}
              onChange={(e) => setCateringNotes(e.target.value)}
              placeholder="e.g. 5kg and 10kg handis assigned; chef confirmed"
            />

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#ece3d5]">
              <Button
                type="button"
                variant="secondary"
                onClick={() => handleConfirmCatering("DECLINE")}
                disabled={cateringSaving}
                className="text-red-700 hover:bg-red-50"
              >
                Decline
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => handleConfirmCatering("CONFIRM")}
                disabled={cateringSaving}
              >
                {cateringSaving ? "Confirming..." : "Confirm Catering Order"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </article>
  );
}
