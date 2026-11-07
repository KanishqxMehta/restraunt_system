"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  Building2,
  ChevronRight,
  Sliders,
  ShoppingBag,
  Clock,
  XCircle,
  Repeat,
  Search,
  RotateCcw,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import type { ExecutiveAnalyticsSummary } from "../types";
import { SelectMenu, type SelectMenuOption } from "@/components/ui/select-menu";
import { Pagination } from "@/components/ui/pagination";
import { Modal } from "@/components/ui/modal";
import { useAlert } from "@/components/ui/alert-toast";
import { cn } from "@/lib/classes";

const STORAGE_KEY = "company_a_analytics_benchmarks_v1";

interface AnalyticsBenchmarks {
  aggregatorCommissionPercent: number;
  directFulfillmentCostPercent: number;
  cateringMarginPercent: number;
  targetPrepMinutes: number;
  targetRepeatRatePercent: number;
  enableSavingsGoal: boolean;
  customSavingsGoalRupees: number;
  loyaltyEarnRupeesPerPoint: number;
  loyaltyRedeemPaisePerPoint: number;
  loyaltyMaxRebatePercent: number;
}

const DEFAULT_BENCHMARKS: AnalyticsBenchmarks = {
  aggregatorCommissionPercent: 27,
  directFulfillmentCostPercent: 12,
  cateringMarginPercent: 30,
  targetPrepMinutes: 25,
  targetRepeatRatePercent: 35,
  enableSavingsGoal: true,
  customSavingsGoalRupees: 100000, // ₹1,00,000 default monthly/quarterly goal, 100% editable by admin
  loyaltyEarnRupeesPerPoint: 10,
  loyaltyRedeemPaisePerPoint: 50,
  loyaltyMaxRebatePercent: 50,
};

function formatRupees(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
}

type SortKey = "ORDERS" | "REVENUE" | "PREP" | "REPEAT" | "CANCELLATIONS";

export function ExecutiveDashboard({
  summary,
}: {
  summary: ExecutiveAnalyticsSummary;
}) {
  const alert = useAlert();
  const [selectedOutletId, setSelectedOutletId] = useState<string>("ALL");
  const [filterType, setFilterType] = useState<
    "ALL" | "DINE_IN" | "CLOUD_KITCHEN"
  >("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("ORDERS");
  const [outletPage, setOutletPage] = useState(1);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Admin-configurable benchmarks (persisted in localStorage)
  const [benchmarks, setBenchmarks] = useState<AnalyticsBenchmarks>(() => {
    if (typeof window === "undefined") return DEFAULT_BENCHMARKS;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<AnalyticsBenchmarks>;
        return { ...DEFAULT_BENCHMARKS, ...parsed };
      }
    } catch {
      // Ignore storage errors
    }
    return DEFAULT_BENCHMARKS;
  });
  const [draftBenchmarks, setDraftBenchmarks] =
    useState<AnalyticsBenchmarks>(benchmarks);

  useEffect(() => {
    let ignore = false;
    fetch("/api/admin/loyalty/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!ignore && data?.settings) {
          const s = data.settings;
          setBenchmarks((prev) => ({
            ...prev,
            loyaltyEarnRupeesPerPoint:
              s.earnRupeesPerPoint ?? prev.loyaltyEarnRupeesPerPoint,
            loyaltyRedeemPaisePerPoint:
              s.redeemPaisePerPoint ?? prev.loyaltyRedeemPaisePerPoint,
            loyaltyMaxRebatePercent:
              s.maxRebatePercent ?? prev.loyaltyMaxRebatePercent,
          }));
          setDraftBenchmarks((prev) => ({
            ...prev,
            loyaltyEarnRupeesPerPoint:
              s.earnRupeesPerPoint ?? prev.loyaltyEarnRupeesPerPoint,
            loyaltyRedeemPaisePerPoint:
              s.redeemPaisePerPoint ?? prev.loyaltyRedeemPaisePerPoint,
            loyaltyMaxRebatePercent:
              s.maxRebatePercent ?? prev.loyaltyMaxRebatePercent,
          }));
        }
      })
      .catch(() => {
        // Fallback to local defaults
      });
    return () => {
      ignore = true;
    };
  }, []);

  function handleSaveBenchmarks(e: React.FormEvent) {
    e.preventDefault();
    const sanitized: AnalyticsBenchmarks = {
      aggregatorCommissionPercent: Math.min(
        60,
        Math.max(0, Number(draftBenchmarks.aggregatorCommissionPercent) || 0),
      ),
      directFulfillmentCostPercent: Math.min(
        50,
        Math.max(0, Number(draftBenchmarks.directFulfillmentCostPercent) || 0),
      ),
      cateringMarginPercent: Math.min(
        90,
        Math.max(0, Number(draftBenchmarks.cateringMarginPercent) || 0),
      ),
      targetPrepMinutes: Math.min(
        120,
        Math.max(5, Number(draftBenchmarks.targetPrepMinutes) || 25),
      ),
      targetRepeatRatePercent: Math.min(
        100,
        Math.max(1, Number(draftBenchmarks.targetRepeatRatePercent) || 35),
      ),
      enableSavingsGoal: Boolean(draftBenchmarks.enableSavingsGoal),
      customSavingsGoalRupees: Math.max(
        1000,
        Number(draftBenchmarks.customSavingsGoalRupees) || 100000,
      ),
      loyaltyEarnRupeesPerPoint: Math.min(
        1000,
        Math.max(1, Number(draftBenchmarks.loyaltyEarnRupeesPerPoint) || 10),
      ),
      loyaltyRedeemPaisePerPoint: Math.min(
        1000,
        Math.max(1, Number(draftBenchmarks.loyaltyRedeemPaisePerPoint) || 50),
      ),
      loyaltyMaxRebatePercent: Math.min(
        100,
        Math.max(5, Number(draftBenchmarks.loyaltyMaxRebatePercent) || 50),
      ),
    };
    setBenchmarks(sanitized);
    setDraftBenchmarks(sanitized);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
    } catch {
      // Ignore storage errors
    }

    void fetch("/api/admin/loyalty/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        earnRupeesPerPoint: sanitized.loyaltyEarnRupeesPerPoint,
        redeemPaisePerPoint: sanitized.loyaltyRedeemPaisePerPoint,
        maxRebatePercent: sanitized.loyaltyMaxRebatePercent,
      }),
    });

    setShowSettingsModal(false);
    alert.success(
      "Benchmarks & Loyalty Policy Saved",
      "Dashboard targets and customer loyalty rewards rules have been updated.",
    );
  }

  function handleResetDefaults() {
    setDraftBenchmarks(DEFAULT_BENCHMARKS);
    setBenchmarks(DEFAULT_BENCHMARKS);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
    void fetch("/api/admin/loyalty/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        earnRupeesPerPoint: DEFAULT_BENCHMARKS.loyaltyEarnRupeesPerPoint,
        redeemPaisePerPoint: DEFAULT_BENCHMARKS.loyaltyRedeemPaisePerPoint,
        maxRebatePercent: DEFAULT_BENCHMARKS.loyaltyMaxRebatePercent,
      }),
    });
    alert.general(
      "Default Benchmarks & Loyalty Rules Restored",
      "Restored standard SLA targets and default 1 pt/₹10, ₹0.50/pt loyalty policy.",
    );
  }

  // Scope metrics either to "ALL" or a single selected outlet
  const selectedOutlet =
    selectedOutletId === "ALL"
      ? null
      : summary.outlets.find((o) => o.id === selectedOutletId) ?? null;

  const scopedMetrics = selectedOutlet
    ? {
        label: selectedOutlet.name,
        totalOrdersCount: selectedOutlet.totalOrders,
        totalPaidOrders: selectedOutlet.paidOrders,
        activeKitchenOrdersCount: selectedOutlet.activeKitchenOrders,
        completedOrders: selectedOutlet.completedOrders,
        cancelledOrdersCount: selectedOutlet.cancelledOrders,
        cancellationRatePercent: selectedOutlet.cancellationRatePercent,
        totalRevenuePaise: selectedOutlet.totalRevenuePaise,
        directRegularGMVPaise: selectedOutlet.directRegularRevenuePaise,
        cateringGMVPaise: selectedOutlet.cateringRevenuePaise,
        cateringOrdersCount: selectedOutlet.cateringOrders,
        averageOrderValuePaise: selectedOutlet.averageOrderValuePaise,
        avgPrepMinutes: selectedOutlet.avgPrepMinutes,
        onTimeSlaPercent: selectedOutlet.onTimePercent,
        lateOrdersCount: selectedOutlet.lateOrders,
        orderingCustomersCount: selectedOutlet.uniqueCustomers,
        repeatCustomersCount: selectedOutlet.repeatCustomers,
        repeatCustomerRatePercent: selectedOutlet.repeatCustomerRatePercent,
      }
    : {
        label: `All ${summary.outlets.length} Outlets`,
        totalOrdersCount: summary.totalOrdersCount,
        totalPaidOrders: summary.totalPaidOrders,
        activeKitchenOrdersCount: summary.activeKitchenOrdersCount,
        completedOrders: summary.completedOrders,
        cancelledOrdersCount: summary.cancelledOrdersCount,
        cancellationRatePercent: summary.cancellationRatePercent,
        totalRevenuePaise: summary.totalRevenuePaise,
        directRegularGMVPaise: summary.totalDirectGMVPaise,
        cateringGMVPaise: summary.cateringGMVPaise,
        cateringOrdersCount: summary.cateringOrdersCount,
        averageOrderValuePaise: summary.averageOrderValuePaise,
        avgPrepMinutes: summary.avgPrepMinutes,
        onTimeSlaPercent: summary.onTimeSlaPercent,
        lateOrdersCount: summary.criticalLateOrders,
        orderingCustomersCount: summary.orderingCustomersCount,
        repeatCustomersCount: summary.repeatCustomersCount,
        repeatCustomerRatePercent: summary.repeatCustomerRatePercent,
      };

  // Dynamic commission & margin calculations driven by Admin's benchmarks
  const netDirectSavingsRate = Math.max(
    0,
    (benchmarks.aggregatorCommissionPercent -
      benchmarks.directFulfillmentCostPercent) /
      100,
  );
  const cateringMarginRate = Math.max(0, benchmarks.cateringMarginPercent / 100);

  const dynamicDirectSavingsPaise = Math.round(
    scopedMetrics.directRegularGMVPaise * netDirectSavingsRate,
  );
  const dynamicCateringMarginPaise = Math.round(
    scopedMetrics.cateringGMVPaise * cateringMarginRate,
  );
  const dynamicTotalValuePaise =
    dynamicDirectSavingsPaise + dynamicCateringMarginPaise;

  const customGoalPaise = benchmarks.customSavingsGoalRupees * 100;
  const customGoalProgressPercent =
    customGoalPaise > 0
      ? Math.min(
          100,
          Math.round((dynamicTotalValuePaise / customGoalPaise) * 1000) / 10,
        )
      : 0;

  // Filter and sort outlets for the comparison table
  const filteredOutlets = summary.outlets
    .filter((outlet) => {
      if (filterType === "DINE_IN" && outlet.isCloudKitchen) return false;
      if (filterType === "CLOUD_KITCHEN" && !outlet.isCloudKitchen) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          outlet.name.toLowerCase().includes(q) ||
          outlet.city.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "ORDERS") return b.totalOrders - a.totalOrders;
      if (sortBy === "REVENUE") return b.totalRevenuePaise - a.totalRevenuePaise;
      if (sortBy === "PREP") return a.avgPrepMinutes - b.avgPrepMinutes;
      if (sortBy === "REPEAT")
        return b.repeatCustomerRatePercent - a.repeatCustomerRatePercent;
      if (sortBy === "CANCELLATIONS")
        return b.cancelledOrders - a.cancelledOrders;
      return 0;
    });

  const OUTLETS_PER_PAGE = 10;
  const totalOutletPages = Math.max(
    1,
    Math.ceil(filteredOutlets.length / OUTLETS_PER_PAGE),
  );
  const safeOutletPage = Math.min(Math.max(1, outletPage), totalOutletPages);
  const outletStartIndex = (safeOutletPage - 1) * OUTLETS_PER_PAGE;
  const paginatedOutlets = filteredOutlets.slice(
    outletStartIndex,
    outletStartIndex + OUTLETS_PER_PAGE,
  );

  const filteredRecentOrders =
    selectedOutletId === "ALL"
      ? summary.recentOrders
      : summary.recentOrders.filter((o) => o.outletId === selectedOutletId);

  const outletSelectOptions: SelectMenuOption[] = [
    {
      value: "ALL",
      label: `All Outlets (${summary.outlets.length} locations)`,
      badge: `${summary.totalOrdersCount} orders`,
    },
    ...summary.outlets
      .filter((o) => !o.isCloudKitchen)
      .map((o) => ({
        value: o.id,
        label: `🍽️ ${o.name}`,
        badge: `${o.totalOrders} orders`,
        group: "🍽️ Dine-in Outlets",
      })),
    ...summary.outlets
      .filter((o) => o.isCloudKitchen)
      .map((o) => ({
        value: o.id,
        label: `☁️ ${o.name}`,
        badge: `${o.totalOrders} orders`,
        group: "☁️ Cloud Kitchens",
      })),
  ];

  const sortSelectOptions: SelectMenuOption[] = [
    { value: "ORDERS", label: "Sort: Most Orders" },
    { value: "REVENUE", label: "Sort: Highest Revenue" },
    { value: "PREP", label: "Sort: Fastest Prep Time" },
    { value: "REPEAT", label: "Sort: Repeat Customer %" },
    { value: "CANCELLATIONS", label: "Sort: Cancellations" },
  ];

  return (
    <div className="space-y-7">
      {/* Top Filter & Admin Benchmark Control Bar */}
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#dfd4c2] bg-[#fffdfa] p-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-[#0f352d]" aria-hidden="true" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#635b50]">
              Scope:
            </span>
            <SelectMenu
              ariaLabel="Filter analytics by outlet"
              value={selectedOutletId}
              onChange={setSelectedOutletId}
              options={outletSelectOptions}
              searchPlaceholder="Search outlet name..."
            />
          </div>

          {selectedOutletId !== "ALL" && (
            <button
              type="button"
              onClick={() => setSelectedOutletId("ALL")}
              className="inline-flex items-center gap-1 rounded-lg border border-[#dfd4c2] bg-[#faf7f2] px-2.5 py-1 text-xs font-bold text-[#4a1d5a] hover:bg-[#f0e8dc]"
            >
              <RotateCcw className="h-3 w-3" />
              <span>View Chain Total</span>
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-[11px] font-medium text-[#635b50]">
            Benchmarks: <strong>{benchmarks.aggregatorCommissionPercent}%</strong>{" "}
            aggregator vs{" "}
            <strong>{benchmarks.directFulfillmentCostPercent}%</strong> direct ·
            Prep SLA <strong>≤{benchmarks.targetPrepMinutes}m</strong>
          </span>
          <button
            type="button"
            onClick={() => {
              setDraftBenchmarks(benchmarks);
              setShowSettingsModal(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#0f352d]/25 bg-[#eef6f4] px-3.5 py-2 text-xs font-bold text-[#0f352d] transition hover:bg-[#dcedea]"
          >
            <Sliders className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Configure Rates & Loyalty</span>
          </button>
        </div>
      </section>

      {/* 4 Primary Business & Operational KPI Cards */}
      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Orders & Direct Revenue */}
        <div className="rounded-[1.75rem] border border-[#dfd4c2] bg-[#fffdfa] p-6 shadow-xs transition hover:border-[#0f352d]/40">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#635b50]">
              Orders & Direct Revenue
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#d6e8e2] bg-[#eef6f4] text-[#0f352d]">
              <ShoppingBag className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2.5">
            <p className="font-mono-tabular text-3xl font-black text-[#0f352d]">
              {scopedMetrics.totalPaidOrders}
            </p>
            <span className="text-xs font-bold text-[#635b50]">
              paid orders ({formatRupees(scopedMetrics.totalRevenuePaise)})
            </span>
          </div>
          <p className="mt-2 text-xs leading-5 text-[#544d42]">
            Avg order{" "}
            <strong className="text-[#0f352d]">
              {formatRupees(scopedMetrics.averageOrderValuePaise)}
            </strong>{" "}
            ·{" "}
            <strong className="text-[#0f352d]">
              {scopedMetrics.activeKitchenOrdersCount}
            </strong>{" "}
            live in kitchen ·{" "}
            <strong className="text-[#4a1d5a]">
              {scopedMetrics.cateringOrdersCount}
            </strong>{" "}
            bulk catering.
          </p>
        </div>

        {/* Card 2: Prep Time & Kitchen SLA */}
        <div className="rounded-[1.75rem] border border-[#dfd4c2] bg-[#fffdfa] p-6 shadow-xs transition hover:border-[#0f352d]/40">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#635b50]">
              Prep Time & SLA
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#a7f3d0] bg-[#ecfdf5] text-[#065f46]">
              <Clock className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2.5">
            <p className="font-mono-tabular text-3xl font-black text-[#0f352d]">
              {scopedMetrics.avgPrepMinutes}m
            </p>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-bold",
                scopedMetrics.avgPrepMinutes <= benchmarks.targetPrepMinutes
                  ? "bg-emerald-50 text-emerald-800"
                  : "bg-amber-50 text-amber-800",
              )}
            >
              Target ≤{benchmarks.targetPrepMinutes}m
            </span>
          </div>
          <p className="mt-2 text-xs leading-5 text-[#544d42]">
            <strong className="text-[#0f352d]">
              {scopedMetrics.onTimeSlaPercent}% on-time
            </strong>{" "}
            completion ·{" "}
            {scopedMetrics.lateOrdersCount > 0 ? (
              <span className="font-bold text-rose-700">
                {scopedMetrics.lateOrdersCount} late order
                {scopedMetrics.lateOrdersCount === 1 ? "" : "s"}
              </span>
            ) : (
              <span className="font-bold text-emerald-700">
                0 late alerts
              </span>
            )}
          </p>
        </div>

        {/* Card 3: Cancellations & Order Health */}
        <div className="rounded-[1.75rem] border border-[#dfd4c2] bg-[#fffdfa] p-6 shadow-xs transition hover:border-[#3b1747]/40">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#635b50]">
              Cancellations
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-700">
              <XCircle className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2.5">
            <p className="font-mono-tabular text-3xl font-black text-[#1f1c18]">
              {scopedMetrics.cancellationRatePercent}%
            </p>
            <span className="text-xs font-bold text-[#635b50]">
              ({scopedMetrics.cancelledOrdersCount} of{" "}
              {scopedMetrics.totalOrdersCount} orders)
            </span>
          </div>
          <p className="mt-2 text-xs leading-5 text-[#544d42]">
            {scopedMetrics.cancellationRatePercent <= 5 ? (
              <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" /> Healthy fulfillment
                rate
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-bold text-amber-800">
                <AlertTriangle className="h-3.5 w-3.5" /> Review stock & prep
                delays
              </span>
            )}{" "}
            · {scopedMetrics.completedOrders} fulfilled.
          </p>
        </div>

        {/* Card 4: Repeat Customers & First-Party Data */}
        <div className="rounded-[1.75rem] border border-[#dfd4c2] bg-[#fffdfa] p-6 shadow-xs transition hover:border-[#c99b53]/50">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#635b50]">
              Repeat Customers
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#e3d2b4] bg-[#fcf6eb] text-[#9e712a]">
              <Repeat className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2.5">
            <p className="font-mono-tabular text-3xl font-black text-[#1f1c18]">
              {scopedMetrics.repeatCustomerRatePercent}%
            </p>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-bold",
                scopedMetrics.repeatCustomerRatePercent >=
                  benchmarks.targetRepeatRatePercent
                  ? "bg-emerald-50 text-emerald-800"
                  : "bg-[#f7f2fa] text-[#4a1d5a]",
              )}
            >
              Target {benchmarks.targetRepeatRatePercent}%
            </span>
          </div>
          <p className="mt-2 text-xs leading-5 text-[#544d42]">
            <strong className="text-[#1f1c18]">
              {scopedMetrics.repeatCustomersCount} repeat
            </strong>{" "}
            of {scopedMetrics.orderingCustomersCount} ordering customers ·{" "}
            <strong className="text-[#0f352d]">
              {summary.marketingOptInPercent}%
            </strong>{" "}
            DPDP opt-in ({summary.totalCustomers} profiles).
          </p>
        </div>
      </section>

      {/* Outlet-by-Outlet Performance Table (Orders, Prep Time, Cancellations, Repeat Customers) */}
      <section className="overflow-hidden rounded-[2rem] border border-[#dfd4c2] bg-[#fffdfa] p-6 shadow-xs sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#ece3d5] pb-5">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#4a1d5a]">
              Per-Outlet Breakdown
            </span>
            <h2 className="font-display mt-0.5 text-xl font-bold text-[#0f352d]">
              Orders, Prep Time, Cancellations & Repeat Customers by Outlet
            </h2>
            <p className="mt-0.5 text-xs text-[#635b50]">
              Click any outlet row to scope the dashboard KPIs, or filter and
              sort across all {summary.outlets.length} locations
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search input */}
            <label className="flex h-9 items-center gap-2 rounded-xl border border-[#dfd4c2] bg-[#faf7f2] px-3 text-xs">
              <Search className="h-3.5 w-3.5 text-[#7a6f60]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setOutletPage(1);
                }}
                placeholder="Search outlet..."
                className="w-32 bg-transparent font-medium text-[#1f1c18] outline-none placeholder:text-[#8f8474] sm:w-40"
              />
            </label>

            {/* Format filter */}
            <div className="flex items-center gap-1 rounded-xl border border-[#dfd4c2] bg-[#faf7f2] p-1 text-xs font-bold">
              {(
                [
                  ["ALL", `All (${summary.outlets.length})`],
                  [
                    "DINE_IN",
                    `Dine-in (${summary.outlets.filter((o) => !o.isCloudKitchen).length})`,
                  ],
                  [
                    "CLOUD_KITCHEN",
                    `Cloud (${summary.outlets.filter((o) => o.isCloudKitchen).length})`,
                  ],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    setFilterType(val);
                    setOutletPage(1);
                  }}
                  className={cn(
                    "rounded-lg px-2.5 py-1 transition",
                    filterType === val
                      ? "bg-[#0f352d] text-white shadow-2xs"
                      : "text-[#544d42] hover:text-[#0f352d]",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Sort selector */}
            <SelectMenu
              ariaLabel="Sort outlets by"
              value={sortBy}
              onChange={(val) => {
                setSortBy(val as SortKey);
                setOutletPage(1);
              }}
              options={sortSelectOptions}
              align="right"
              searchable={false}
            />
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#dfd4c2] text-[11px] font-bold uppercase tracking-wider text-[#635b50]">
                <th className="py-3.5 pr-4">Outlet</th>
                <th className="py-3.5 pr-4">Format</th>
                <th className="py-3.5 pr-4 text-right">Orders</th>
                <th className="py-3.5 pr-4 text-right">Direct Revenue</th>
                <th className="py-3.5 pr-4 text-right">Avg Prep Time</th>
                <th className="py-3.5 pr-4 text-right">On-Time SLA</th>
                <th className="py-3.5 pr-4 text-right">Cancellations</th>
                <th className="py-3.5 pr-4 text-right">Repeat Customers</th>
                <th className="py-3.5 text-right">
                  Est. Saved (
                  {Math.max(
                    0,
                    benchmarks.aggregatorCommissionPercent -
                      benchmarks.directFulfillmentCostPercent,
                  )}
                  %)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ece3d5]">
              {filteredOutlets.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="py-10 text-center text-xs text-[#635b50]"
                  >
                    No outlets match your filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedOutlets.map((outlet) => {
                  const isSelected = selectedOutletId === outlet.id;
                  const outletDirectSaved = Math.round(
                    outlet.directRegularRevenuePaise * netDirectSavingsRate,
                  );
                  const outletCatSaved = Math.round(
                    outlet.cateringRevenuePaise * cateringMarginRate,
                  );
                  const outletTotalSaved = outletDirectSaved + outletCatSaved;

                  return (
                    <tr
                      key={outlet.id}
                      onClick={() =>
                        setSelectedOutletId(
                          isSelected ? "ALL" : outlet.id,
                        )
                      }
                      className={cn(
                        "cursor-pointer transition",
                        isSelected
                          ? "bg-[#eef6f4]"
                          : "hover:bg-[#faf7f2]/80",
                      )}
                    >
                      <td className="py-4 pr-4 font-bold text-[#0f352d]">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#dec9ec] bg-[#f7f2fa] text-[#4a1d5a]">
                            <Building2
                              className="h-4 w-4"
                              aria-hidden="true"
                            />
                          </span>
                          <div>
                            <span className="block">{outlet.name}</span>
                            {outlet.activeKitchenOrders > 0 && (
                              <span className="text-[10px] font-semibold text-emerald-700">
                                {outlet.activeKitchenOrders} active in kitchen
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 pr-4">
                        {outlet.isCloudKitchen ? (
                          <span className="inline-block rounded-full border border-[#dec9ec] bg-[#f7f2fa] px-2.5 py-0.5 text-[10px] font-bold text-[#4a1d5a]">
                            ☁️ Cloud Kitchen
                          </span>
                        ) : (
                          <span className="inline-block rounded-full border border-[#d6e8e2] bg-[#eef6f4] px-2.5 py-0.5 text-[10px] font-bold text-[#0f352d]">
                            🍽️ Dine-in
                          </span>
                        )}
                      </td>
                      <td className="font-mono-tabular py-4 pr-4 text-right">
                        <span className="font-bold text-[#1f1c18]">
                          {outlet.paidOrders}
                        </span>
                        {outlet.cateringOrders > 0 && (
                          <span className="block text-[10px] font-semibold text-[#4a1d5a]">
                            incl. {outlet.cateringOrders} catering
                          </span>
                        )}
                      </td>
                      <td className="font-mono-tabular py-4 pr-4 text-right">
                        <span className="font-bold text-[#0f352d]">
                          {formatRupees(outlet.totalRevenuePaise)}
                        </span>
                        {outlet.averageOrderValuePaise > 0 && (
                          <span className="block text-[10px] text-[#635b50]">
                            AOV {formatRupees(outlet.averageOrderValuePaise)}
                          </span>
                        )}
                      </td>
                      <td className="font-mono-tabular py-4 pr-4 text-right">
                        <span
                          className={cn(
                            "font-bold",
                            outlet.avgPrepMinutes <=
                              benchmarks.targetPrepMinutes
                              ? "text-[#0f352d]"
                              : "text-amber-800",
                          )}
                        >
                          {outlet.avgPrepMinutes}m
                        </span>
                        <span className="block text-[10px] text-[#635b50]">
                          min {outlet.minimumPrepMinutes}m
                        </span>
                      </td>
                      <td className="font-mono-tabular py-4 pr-4 text-right font-bold">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-[11px]",
                            outlet.onTimePercent >= 90
                              ? "bg-emerald-50 text-emerald-800"
                              : "bg-amber-50 text-amber-800",
                          )}
                        >
                          {outlet.onTimePercent}%
                        </span>
                      </td>
                      <td className="font-mono-tabular py-4 pr-4 text-right">
                        <span
                          className={cn(
                            "font-bold",
                            outlet.cancelledOrders > 0
                              ? "text-rose-700"
                              : "text-[#544d42]",
                          )}
                        >
                          {outlet.cancelledOrders}
                        </span>
                        <span className="block text-[10px] text-[#635b50]">
                          {outlet.cancellationRatePercent}% rate
                        </span>
                      </td>
                      <td className="font-mono-tabular py-4 pr-4 text-right">
                        <span className="font-bold text-[#0f352d]">
                          {outlet.repeatCustomerRatePercent}%
                        </span>
                        <span className="block text-[10px] text-[#635b50]">
                          {outlet.repeatCustomers}/{outlet.uniqueCustomers}{" "}
                          customers
                        </span>
                      </td>
                      <td className="font-mono-tabular py-4 text-right font-extrabold text-emerald-700">
                        {formatRupees(outletTotalSaved)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={safeOutletPage}
          totalPages={totalOutletPages}
          totalItems={filteredOutlets.length}
          pageSize={OUTLETS_PER_PAGE}
          itemName="outlets"
          onPageChange={setOutletPage}
          className="mt-4"
        />
      </section>

      {/* Bottom Split: Recent Orders Feed + Admin-Configurable Commission & Savings Estimator */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Orders Stream */}
        <div className="rounded-[2rem] border border-[#dfd4c2] bg-[#fffdfa] p-6 shadow-xs lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ece3d5] pb-4">
            <div>
              <h3 className="font-display text-lg font-bold text-[#0f352d]">
                Recent Orders ({scopedMetrics.label})
              </h3>
              <p className="text-xs text-[#635b50]">
                Live order feed including status, preparation time, and channel
                type
              </p>
            </div>
            <Link
              href="/kitchen"
              className="inline-flex items-center gap-1 rounded-xl border border-[#dec9ec] bg-[#f7f2fa] px-3 py-1.5 text-xs font-bold text-[#4a1d5a] transition hover:bg-[#ede0f5]"
            >
              Open Kitchen KDS{" "}
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-3 divide-y divide-[#ece3d5]">
            {filteredRecentOrders.length === 0 ? (
              <p className="py-10 text-center text-xs text-[#635b50]">
                No orders recorded for this outlet yet.
              </p>
            ) : (
              filteredRecentOrders.slice(0, 10).map((order) => {
                const dynamicOrderSaved =
                  order.status === "CANCELLED"
                    ? 0
                    : order.isCatering
                      ? Math.round(order.totalPaise * cateringMarginRate)
                      : Math.round(order.totalPaise * netDirectSavingsRate);

                return (
                  <div
                    key={order.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3.5"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-extrabold text-[#0f352d]">
                          {order.orderNumber}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                            order.status === "CANCELLED"
                              ? "bg-rose-100 text-rose-800"
                              : order.status === "READY" ||
                                  order.status === "HANDED_OFF"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-900",
                          )}
                        >
                          {order.status.replace("_", " ")}
                        </span>
                        {order.isCatering ? (
                          <span className="rounded-full border border-[#dec9ec] bg-[#f7f2fa] px-2.5 py-0.5 text-[10px] font-bold text-[#4a1d5a]">
                            🎉 Bulk Catering ({order.guestCount} guests)
                          </span>
                        ) : (
                          <span className="rounded-full border border-[#d6e8e2] bg-[#eef6f4] px-2.5 py-0.5 text-[10px] font-bold text-[#0f352d]">
                            Direct Order
                          </span>
                        )}
                        {order.prepMinutes && order.status !== "CANCELLED" && (
                          <span className="text-[11px] font-medium text-[#635b50]">
                            · Prep ~{order.prepMinutes}m
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-[#635b50]">
                        {order.outletName} · {order.customerName}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={cn(
                          "font-mono-tabular font-extrabold",
                          order.status === "CANCELLED"
                            ? "text-stone-400 line-through"
                            : "text-[#1f1c18]",
                        )}
                      >
                        {formatRupees(order.totalPaise)}
                      </p>
                      {order.status !== "CANCELLED" && (
                        <p className="font-mono-tabular text-[11px] font-bold text-emerald-700">
                          +{formatRupees(dynamicOrderSaved)} net saved
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Admin-Configurable Commission & Margin Simulator */}
        <div className="flex flex-col justify-between rounded-[2rem] border border-[#dfd4c2] bg-[#fffdfa] p-6 shadow-xs">
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <TrendingUp
                  className="h-5 w-5 text-[#0f352d]"
                  aria-hidden="true"
                />
                <h3 className="font-display text-lg font-bold text-[#0f352d]">
                  Commission & Margin Simulator
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDraftBenchmarks(benchmarks);
                  setShowSettingsModal(true);
                }}
                className="rounded-lg border border-[#dfd4c2] bg-[#faf7f2] px-2.5 py-1 text-[11px] font-bold text-[#0f352d] hover:bg-[#f0e8dc]"
              >
                Edit Rates
              </button>
            </div>
            <p className="mt-1 text-xs text-[#635b50]">
              Calculated on live orders in{" "}
              <strong>{scopedMetrics.label}</strong> using your configured cost
              structure
            </p>

            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-[#d6e8e2] bg-[#eef6f4]/70 p-4">
                <div className="flex items-center justify-between text-xs font-bold text-[#0f352d]">
                  <span>Direct Ordering Net Savings</span>
                  <span className="rounded-md bg-[#0f352d] px-2 py-0.5 text-[10px] text-[#f4d6a9]">
                    {Math.max(
                      0,
                      benchmarks.aggregatorCommissionPercent -
                        benchmarks.directFulfillmentCostPercent,
                    )}
                    % saved
                  </span>
                </div>
                <p className="font-mono-tabular mt-2 text-2xl font-black text-[#0f352d]">
                  {formatRupees(dynamicDirectSavingsPaise)}
                </p>
                <p className="mt-1 text-[11px] leading-4 text-[#4e473d]">
                  {benchmarks.aggregatorCommissionPercent}% aggregator fee minus{" "}
                  {benchmarks.directFulfillmentCostPercent}% direct payment &
                  delivery cost on{" "}
                  {formatRupees(scopedMetrics.directRegularGMVPaise)} direct
                  sales.
                </p>
              </div>

              <div className="rounded-2xl border border-[#dec9ec] bg-[#f7f2fa] p-4">
                <div className="flex items-center justify-between text-xs font-bold text-[#4a1d5a]">
                  <span>Bulk Catering Margin</span>
                  <span className="rounded-md bg-[#3b1747] px-2 py-0.5 text-[10px] text-[#f4d6a9]">
                    {benchmarks.cateringMarginPercent}% margin
                  </span>
                </div>
                <p className="font-mono-tabular mt-2 text-2xl font-black text-[#4a1d5a]">
                  {formatRupees(dynamicCateringMarginPaise)}
                </p>
                <p className="mt-1 text-[11px] leading-4 text-[#4e473d]">
                  {benchmarks.cateringMarginPercent}% gross margin on{" "}
                  {formatRupees(scopedMetrics.cateringGMVPaise)} across{" "}
                  {scopedMetrics.cateringOrdersCount} catering events.
                </p>
              </div>

              {benchmarks.enableSavingsGoal && (
                <div className="rounded-2xl border border-[#e3d2b4] bg-[#fcf6eb] p-4">
                  <div className="flex items-center justify-between text-xs font-bold text-[#1f1c18]">
                    <span>Custom Target Progress</span>
                    <span className="font-mono-tabular text-[#0f352d]">
                      {customGoalProgressPercent}%
                    </span>
                  </div>
                  <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-[#e5d5b5]">
                    <div
                      className="h-full rounded-full bg-[#0f352d] transition-all duration-500"
                      style={{
                        width: `${Math.max(2, Math.min(100, customGoalProgressPercent))}%`,
                      }}
                    />
                  </div>
                  <p className="mt-2 text-[11px] text-[#544d42]">
                    <strong>{formatRupees(dynamicTotalValuePaise)}</strong>{" "}
                    captured toward your{" "}
                    <strong>{formatRupees(customGoalPaise)}</strong> configured
                    target.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2">
            <Link
              href="/admin/menu"
              className="flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-[#dfd4c2] bg-[#faf7f2] px-4 text-xs font-bold text-[#0f352d] transition hover:bg-[#f2ebe0]"
            >
              <span>Manage Central Menu & Pricing</span>
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
            <Link
              href="/admin/outlets"
              className="flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-[#dfd4c2] bg-[#faf7f2] px-4 text-xs font-bold text-[#0f352d] transition hover:bg-[#f2ebe0]"
            >
              <span>Manage Outlets & Prep Baselines</span>
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* Admin Benchmark & Target Settings Modal */}
      {showSettingsModal && (
        <Modal
          title="Configure Analytics Benchmarks & Loyalty Policy"
          subtitle="Review your chain's commission rates, SLA targets, and customer loyalty rewards"
          onClose={() => setShowSettingsModal(false)}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-5">
            {/* Royal Rewards Loyalty Program Settings & Rules Card (Editable) */}
            <div className="rounded-2xl border border-[#dec9ec] bg-gradient-to-br from-[#faf6fd] to-[#f4ebfa] p-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-bold text-[#4a1d5a]">
                  <Sparkles className="h-4 w-4 text-[#7e3aa3]" aria-hidden="true" />
                  <span>Royal Rewards Loyalty Program Settings (Editable)</span>
                </span>
                <span className="rounded-full border border-[#dec9ec] bg-white/80 px-2.5 py-0.5 text-[10px] font-bold text-[#4a1d5a]">
                  Active · Configurable
                </span>
              </div>
              <p className="mt-1 text-[11px] text-[#635b50]">
                Configure customer rewards on direct orders to encourage repeat visits. Changes apply immediately to checkout and customer wallets.
              </p>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-[#dec9ec]/60 bg-white/90 p-3 shadow-2xs">
                  <label className="block text-[11px] font-bold uppercase text-[#4a1d5a]">
                    Spend Per Point (₹)
                  </label>
                  <p className="mb-1 text-[10px] text-[#7a6f60]">
                    ₹ spent to earn 1 pt (e.g. ₹10)
                  </p>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    step={1}
                    value={draftBenchmarks.loyaltyEarnRupeesPerPoint}
                    onChange={(e) =>
                      setDraftBenchmarks((prev) => ({
                        ...prev,
                        loyaltyEarnRupeesPerPoint: Number(e.target.value),
                      }))
                    }
                    className="h-9 w-full rounded-lg border border-[#dfd4c2] bg-[#faf7f2] px-2.5 text-xs font-bold text-[#0f352d]"
                  />
                  <span className="mt-1 block text-[10px] font-semibold text-emerald-800">
                    = {Math.round(100 / Math.max(1, draftBenchmarks.loyaltyEarnRupeesPerPoint))} pts per ₹100 spent
                  </span>
                </div>

                <div className="rounded-xl border border-[#dec9ec]/60 bg-white/90 p-3 shadow-2xs">
                  <label className="block text-[11px] font-bold uppercase text-[#4a1d5a]">
                    Point Value (Paise)
                  </label>
                  <p className="mb-1 text-[10px] text-[#7a6f60]">
                    Discount per point (50p = ₹0.50)
                  </p>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    step={5}
                    value={draftBenchmarks.loyaltyRedeemPaisePerPoint}
                    onChange={(e) =>
                      setDraftBenchmarks((prev) => ({
                        ...prev,
                        loyaltyRedeemPaisePerPoint: Number(e.target.value),
                      }))
                    }
                    className="h-9 w-full rounded-lg border border-[#dfd4c2] bg-[#faf7f2] px-2.5 text-xs font-bold text-[#4a1d5a]"
                  />
                  <span className="mt-1 block text-[10px] font-semibold text-[#4a1d5a]">
                    = ₹{(draftBenchmarks.loyaltyRedeemPaisePerPoint / 100).toFixed(2)} / pt (100 pts = ₹{Math.round(draftBenchmarks.loyaltyRedeemPaisePerPoint)})
                  </span>
                </div>

                <div className="rounded-xl border border-[#dec9ec]/60 bg-white/90 p-3 shadow-2xs">
                  <label className="block text-[11px] font-bold uppercase text-[#4a1d5a]">
                    Max Order Rebate (%)
                  </label>
                  <p className="mb-1 text-[10px] text-[#7a6f60]">
                    Max cart total discount cap
                  </p>
                  <input
                    type="number"
                    min={5}
                    max={100}
                    step={5}
                    value={draftBenchmarks.loyaltyMaxRebatePercent}
                    onChange={(e) =>
                      setDraftBenchmarks((prev) => ({
                        ...prev,
                        loyaltyMaxRebatePercent: Number(e.target.value),
                      }))
                    }
                    className="h-9 w-full rounded-lg border border-[#dfd4c2] bg-[#faf7f2] px-2.5 text-xs font-bold text-[#0f352d]"
                  />
                  <span className="mt-1 block text-[10px] font-semibold text-[#0f352d]">
                    Up to {draftBenchmarks.loyaltyMaxRebatePercent}% of payable total
                  </span>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between rounded-xl border border-[#dec9ec]/60 bg-white/70 px-3 py-2 text-[11px] text-[#4a1d5a]">
                <span>Customer Wallet: Active on <code className="rounded bg-[#f0e4f7] px-1 py-0.5 font-bold">/account</code> & checkout</span>
                <span className="font-bold">Live Append-Only Ledger</span>
              </div>
            </div>

            <form onSubmit={handleSaveBenchmarks} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-[#0f352d]">
                    Aggregator Commission (%)
                  </label>
                  <p className="mb-1.5 text-[11px] text-[#635b50]">
                    Avg fee charged by delivery apps
                  </p>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    step={0.5}
                    value={draftBenchmarks.aggregatorCommissionPercent}
                    onChange={(e) =>
                      setDraftBenchmarks((prev) => ({
                        ...prev,
                        aggregatorCommissionPercent: Number(e.target.value),
                      }))
                    }
                    className="h-10 w-full rounded-xl border border-[#dfd4c2] bg-[#faf7f2] px-3 text-sm font-bold text-[#0f352d]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0f352d]">
                    Direct Fulfillment Cost (%)
                  </label>
                  <p className="mb-1.5 text-[11px] text-[#635b50]">
                    Payment gateway + 3PL rider cost
                  </p>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    step={0.5}
                    value={draftBenchmarks.directFulfillmentCostPercent}
                    onChange={(e) =>
                      setDraftBenchmarks((prev) => ({
                        ...prev,
                        directFulfillmentCostPercent: Number(e.target.value),
                      }))
                    }
                    className="h-10 w-full rounded-xl border border-[#dfd4c2] bg-[#faf7f2] px-3 text-sm font-bold text-[#0f352d]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0f352d]">
                    Bulk Catering Margin (%)
                  </label>
                  <p className="mb-1.5 text-[11px] text-[#635b50]">
                    Gross margin on party orders
                  </p>
                  <input
                    type="number"
                    min={0}
                    max={90}
                    step={1}
                    value={draftBenchmarks.cateringMarginPercent}
                    onChange={(e) =>
                      setDraftBenchmarks((prev) => ({
                        ...prev,
                        cateringMarginPercent: Number(e.target.value),
                      }))
                    }
                    className="h-10 w-full rounded-xl border border-[#dfd4c2] bg-[#faf7f2] px-3 text-sm font-bold text-[#0f352d]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0f352d]">
                    Target Prep Time SLA (mins)
                  </label>
                  <p className="mb-1.5 text-[11px] text-[#635b50]">
                    Benchmark kitchen prep duration
                  </p>
                  <input
                    type="number"
                    min={5}
                    max={120}
                    step={1}
                    value={draftBenchmarks.targetPrepMinutes}
                    onChange={(e) =>
                      setDraftBenchmarks((prev) => ({
                        ...prev,
                        targetPrepMinutes: Number(e.target.value),
                      }))
                    }
                    className="h-10 w-full rounded-xl border border-[#dfd4c2] bg-[#faf7f2] px-3 text-sm font-bold text-[#0f352d]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0f352d]">
                    Target Repeat Customer Rate (%)
                  </label>
                  <p className="mb-1.5 text-[11px] text-[#635b50]">
                    Retention benchmark for direct orders
                  </p>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    step={1}
                    value={draftBenchmarks.targetRepeatRatePercent}
                    onChange={(e) =>
                      setDraftBenchmarks((prev) => ({
                        ...prev,
                        targetRepeatRatePercent: Number(e.target.value),
                      }))
                    }
                    className="h-10 w-full rounded-xl border border-[#dfd4c2] bg-[#faf7f2] px-3 text-sm font-bold text-[#0f352d]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0f352d]">
                    Custom Savings Goal (₹)
                  </label>
                  <p className="mb-1.5 text-[11px] text-[#635b50]">
                    Your target savings milestone
                  </p>
                  <input
                    type="number"
                    min={1000}
                    step={5000}
                    disabled={!draftBenchmarks.enableSavingsGoal}
                    value={draftBenchmarks.customSavingsGoalRupees}
                    onChange={(e) =>
                      setDraftBenchmarks((prev) => ({
                        ...prev,
                        customSavingsGoalRupees: Number(e.target.value),
                      }))
                    }
                    className="h-10 w-full rounded-xl border border-[#dfd4c2] bg-[#faf7f2] px-3 text-sm font-bold text-[#0f352d] disabled:opacity-50"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2.5 rounded-xl border border-[#ece3d5] bg-[#faf7f2] p-3 text-xs font-bold text-[#0f352d]">
                <input
                  type="checkbox"
                  checked={draftBenchmarks.enableSavingsGoal}
                  onChange={(e) =>
                    setDraftBenchmarks((prev) => ({
                      ...prev,
                      enableSavingsGoal: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded accent-[#0f352d]"
                />
                <span>Display savings goal progress bar on dashboard</span>
              </label>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#ece3d5] pt-4">
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="rounded-xl border border-[#dfd4c2] px-3.5 py-2 text-xs font-bold text-[#635b50] hover:bg-[#faf7f2]"
                >
                  Reset to Defaults
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSettingsModal(false)}
                    className="rounded-xl border border-[#dfd4c2] px-4 py-2 text-xs font-bold text-[#544d42] hover:bg-[#faf7f2]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-[#0f352d] px-5 py-2 text-xs font-bold text-white hover:bg-[#08231d]"
                  >
                    Save Benchmarks & Loyalty Settings
                  </button>
                </div>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
