"use client";

import { useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  ShieldCheck,
  Users,
  Building2,
  ChevronRight,
  Info,
  DollarSign,
  Sparkles,
  Award,
  ArrowUpRight,
} from "lucide-react";
import type { ExecutiveAnalyticsSummary } from "../types";
import { cn } from "@/lib/classes";

function formatRupees(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
}

export function ExecutiveDashboard({
  summary,
}: {
  summary: ExecutiveAnalyticsSummary;
}) {
  const [showFormulaModal, setShowFormulaModal] = useState(false);
  const [filterType, setFilterType] = useState<
    "ALL" | "DINE_IN" | "CLOUD_KITCHEN"
  >("ALL");

  const filteredOutlets = summary.outlets.filter((outlet) => {
    if (filterType === "DINE_IN") return !outlet.isCloudKitchen;
    if (filterType === "CLOUD_KITCHEN") return outlet.isCloudKitchen;
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Target Realization Hero Banner */}
      <section className="relative overflow-hidden rounded-[2.25rem] border border-[#1d4c41] bg-gradient-to-br from-[#0b2922] via-[#123d33] to-[#341440] p-6 text-white shadow-[0_18px_48px_rgba(15,53,45,0.18)] sm:p-9">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 -right-20 h-72 w-72 rounded-full bg-[#c99b53]/15 blur-3xl"
        />
        <div className="relative z-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f4d6a9]/35 bg-white/10 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#f4d6a9]">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Strategic Disintermediation Tracker
              </span>
              <h2 className="font-display mt-3 text-3xl font-bold tracking-tight text-[#fffdfa] sm:text-4xl">
                ₹1.14 Crore Annual Margin Recovery
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-200/90">
                Tracking net commission saved on direct orders (15% net margin
                recovery) plus direct party catering margin captured (30%
                margin) against third-party aggregator disintermediation.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowFormulaModal(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-[#f4d6a9]/35 bg-white/10 px-4 py-2.5 text-xs font-bold text-[#f4d6a9] backdrop-blur-xs transition hover:bg-white/20"
            >
              <Info className="h-4 w-4" aria-hidden="true" />
              View financial model
            </button>
          </div>

          {/* Progress Bar Bento Card */}
          <div className="mt-7 rounded-2xl border border-white/15 bg-black/25 p-5 backdrop-blur-xs sm:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#f4d6a9]">
                  Value Captured To Date
                </span>
                <p className="font-mono-tabular mt-1 text-3xl font-black text-white sm:text-4xl">
                  {formatRupees(summary.totalValueCapturedPaise)}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-stone-300">
                  Annual Benchmark
                </span>
                <p className="font-mono-tabular mt-1 text-xl font-bold text-[#f4d6a9]">
                  {formatRupees(summary.annualTargetPaise)}
                </p>
              </div>
            </div>

            <div className="mt-4 h-4 w-full overflow-hidden rounded-full bg-white/12 p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#34d399] via-[#f4d6a9] to-[#d8b4fe] transition-all duration-700"
                style={{
                  width: `${Math.max(2, Math.min(100, summary.targetProgressPercent))}%`,
                }}
              />
            </div>
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-200">
              <span>
                Direct channel commission savings + Bulk catering captured
              </span>
              <span className="font-mono-tabular font-bold text-[#f4d6a9]">
                {summary.targetProgressPercent}% of annual benchmark
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 4 Core Executive Metric Cards */}
      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Direct Commission Saved */}
        <div className="rounded-[1.75rem] border border-[#dfd4c2] bg-[#fffdfa] p-6 shadow-xs transition hover:border-[#0f352d]/40">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#635b50]">
              Direct Channel Savings
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#d6e8e2] bg-[#eef6f4] text-[#0f352d]">
              <TrendingUp className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>
          <p className="font-mono-tabular mt-4 text-3xl font-black text-[#0f352d]">
            {formatRupees(summary.commissionSavedPaise)}
          </p>
          <p className="mt-2 text-xs leading-5 text-[#544d42]">
            <strong className="text-[#0f352d]">15% net saved</strong> on{" "}
            {formatRupees(summary.totalDirectGMVPaise)} direct volume (
            {summary.directOrdersCount} orders) vs 27% aggregator fee.
          </p>
        </div>

        {/* Card 2: Bulk Catering Margin */}
        <div className="rounded-[1.75rem] border border-[#dfd4c2] bg-[#fffdfa] p-6 shadow-xs transition hover:border-[#3b1747]/40">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#635b50]">
              Bulk Catering Margin
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#dec9ec] bg-[#f7f2fa] text-[#4a1d5a]">
              <DollarSign className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>
          <p className="font-mono-tabular mt-4 text-3xl font-black text-[#4a1d5a]">
            {formatRupees(summary.cateringMarginCapturedPaise)}
          </p>
          <p className="mt-2 text-xs leading-5 text-[#544d42]">
            <strong className="text-[#4a1d5a]">30% margin captured</strong> on{" "}
            {formatRupees(summary.cateringGMVPaise)} bulk orders (
            {summary.cateringOrdersCount} events) recovering phone drop-offs.
          </p>
        </div>

        {/* Card 3: First-Party Customer Database (DPDP 2023) */}
        <div className="rounded-[1.75rem] border border-[#dfd4c2] bg-[#fffdfa] p-6 shadow-xs transition hover:border-[#c99b53]/50">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#635b50]">
              Customer Database (DPDP)
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#e3d2b4] bg-[#fcf6eb] text-[#9e712a]">
              <Users className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>
          <p className="font-mono-tabular mt-4 text-3xl font-black text-[#1f1c18]">
            {summary.totalCustomers}{" "}
            <span className="font-sans text-sm font-semibold text-[#635b50]">
              Users
            </span>
          </p>
          <p className="mt-2 text-xs leading-5 text-[#544d42]">
            <strong className="text-[#1f1c18]">
              {summary.marketingOptInPercent}% opt-in rate
            </strong>{" "}
            ({summary.marketingOptedInCount} opted-in). First-party contacts
            owned by Company A.
          </p>
        </div>

        {/* Card 4: Kitchen SLA & On-time Fulfillment */}
        <div className="rounded-[1.75rem] border border-[#dfd4c2] bg-[#fffdfa] p-6 shadow-xs transition hover:border-[#0f352d]/40">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#635b50]">
              Kitchen SLA Rate
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#a7f3d0] bg-[#ecfdf5] text-[#065f46]">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>
          <p className="font-mono-tabular mt-4 text-3xl font-black text-[#0f352d]">
            {summary.onTimeSlaPercent}%
          </p>
          <p className="mt-2 text-xs leading-5 text-[#544d42]">
            Avg prep{" "}
            <strong className="text-[#0f352d]">{summary.avgPrepMinutes}m</strong>{" "}
            ·{" "}
            {summary.criticalLateOrders > 0 ? (
              <span className="font-bold text-rose-700">
                {summary.criticalLateOrders} late alerts
              </span>
            ) : (
              <span className="font-bold text-emerald-700">
                Zero critical delays
              </span>
            )}
          </p>
        </div>
      </section>

      {/* Outlets Performance Table */}
      <section className="overflow-hidden rounded-[2rem] border border-[#dfd4c2] bg-[#fffdfa] p-6 shadow-xs sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#ece3d5] pb-5">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#4a1d5a]">
              Network Telemetry
            </span>
            <h3 className="font-display mt-0.5 text-xl font-bold text-[#0f352d]">
              Outlet & Cloud Kitchen Performance
            </h3>
            <p className="mt-0.5 text-xs text-[#635b50]">
              Comparative breakdown across dine-in outlets and cloud kitchens in
              Hyderabad
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-2xl border border-[#dfd4c2] bg-[#faf7f2] p-1 text-xs font-bold">
            {(
              [
                ["ALL", `All Outlets (${summary.outlets.length})`],
                ["DINE_IN", "Dine-in"],
                ["CLOUD_KITCHEN", "Cloud Kitchens"],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setFilterType(val)}
                className={cn(
                  "rounded-xl px-3.5 py-1.5 transition",
                  filterType === val
                    ? "bg-[#0f352d] text-white shadow-2xs"
                    : "text-[#544d42] hover:text-[#0f352d]",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#dfd4c2] text-[11px] font-bold uppercase tracking-wider text-[#635b50]">
                <th className="py-3.5 pr-4">Outlet Name</th>
                <th className="py-3.5 pr-4">Format</th>
                <th className="py-3.5 pr-4 text-right">Orders</th>
                <th className="py-3.5 pr-4 text-right">Direct Revenue</th>
                <th className="py-3.5 pr-4 text-right">Commission Saved</th>
                <th className="py-3.5 pr-4 text-right">Catering</th>
                <th className="py-3.5 pr-4 text-right">On-time SLA</th>
                <th className="py-3.5 text-right">Avg Prep</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ece3d5]">
              {filteredOutlets.map((outlet) => (
                <tr
                  key={outlet.id}
                  className="transition hover:bg-[#faf7f2]/80"
                >
                  <td className="py-4 pr-4 font-bold text-[#0f352d]">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#dec9ec] bg-[#f7f2fa] text-[#4a1d5a]">
                        <Building2 className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span>{outlet.name}</span>
                    </div>
                  </td>
                  <td className="py-4 pr-4">
                    {outlet.isCloudKitchen ? (
                      <span className="inline-block rounded-full border border-[#dec9ec] bg-[#f7f2fa] px-2.5 py-0.5 text-[10px] font-bold text-[#4a1d5a]">
                        Cloud Kitchen
                      </span>
                    ) : (
                      <span className="inline-block rounded-full border border-[#d6e8e2] bg-[#eef6f4] px-2.5 py-0.5 text-[10px] font-bold text-[#0f352d]">
                        Dine-in Outlet
                      </span>
                    )}
                  </td>
                  <td className="font-mono-tabular py-4 pr-4 text-right font-semibold text-[#1f1c18]">
                    {outlet.totalOrders}
                  </td>
                  <td className="font-mono-tabular py-4 pr-4 text-right font-bold text-[#0f352d]">
                    {formatRupees(outlet.totalRevenuePaise)}
                  </td>
                  <td className="font-mono-tabular py-4 pr-4 text-right font-extrabold text-emerald-700">
                    {formatRupees(outlet.commissionSavedPaise)}
                  </td>
                  <td className="py-4 pr-4 text-right font-semibold text-[#4a1d5a]">
                    {outlet.cateringOrders > 0
                      ? `${outlet.cateringOrders} orders`
                      : "—"}
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
                  <td className="font-mono-tabular py-4 text-right font-medium text-[#544d42]">
                    {outlet.avgPrepMinutes}m
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recent Orders & Channels Activity */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent High-Value Orders */}
        <div className="rounded-[2rem] border border-[#dfd4c2] bg-[#fffdfa] p-6 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between border-b border-[#ece3d5] pb-4">
            <div>
              <h3 className="font-display text-lg font-bold text-[#0f352d]">
                Recent Direct Orders
              </h3>
              <p className="text-xs text-[#635b50]">
                Latest paid customer orders across channels
              </p>
            </div>
            <Link
              href="/kitchen"
              className="inline-flex items-center gap-1 rounded-xl border border-[#dec9ec] bg-[#f7f2fa] px-3 py-1.5 text-xs font-bold text-[#4a1d5a] transition hover:bg-[#ede0f5]"
            >
              Open Kitchen Board{" "}
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-3 divide-y divide-[#ece3d5]">
            {summary.recentOrders.length === 0 ? (
              <p className="py-10 text-center text-xs text-[#635b50]">
                No paid orders yet.
              </p>
            ) : (
              summary.recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3.5"
                >
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-extrabold text-[#0f352d]">
                        {order.orderNumber}
                      </span>
                      {order.isCatering ? (
                        <span className="rounded-full border border-[#dec9ec] bg-[#f7f2fa] px-2.5 py-0.5 text-[10px] font-bold text-[#4a1d5a]">
                          🎉 Bulk Catering ({order.guestCount} guests)
                        </span>
                      ) : (
                        <span className="rounded-full border border-[#d6e8e2] bg-[#eef6f4] px-2.5 py-0.5 text-[10px] font-bold text-[#0f352d]">
                          Direct Food Order
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-[#635b50]">
                      {order.outletName} · {order.customerName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono-tabular font-extrabold text-[#1f1c18]">
                      {formatRupees(order.totalPaise)}
                    </p>
                    <p className="font-mono-tabular text-[11px] font-bold text-emerald-700">
                      +{formatRupees(order.commissionSavedPaise)} margin saved
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Strategic Channels Summary */}
        <div className="rounded-[2rem] border border-[#dfd4c2] bg-[#fffdfa] p-6 shadow-xs">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-[#c99b53]" aria-hidden="true" />
            <h3 className="font-display text-lg font-bold text-[#0f352d]">
              Channel Margin Health
            </h3>
          </div>
          <p className="mt-0.5 text-xs text-[#635b50]">
            Direct channel vs aggregator cost structure
          </p>

          <div className="mt-5 space-y-3.5">
            <div className="rounded-2xl border border-[#a7f3d0] bg-[#ecfdf5]/60 p-4">
              <div className="flex items-center justify-between text-xs font-bold text-[#0f352d]">
                <span>Proprietary Direct Web</span>
                <span className="rounded-md bg-[#0f352d] px-2 py-0.5 text-[10px] text-[#f4d6a9]">
                  12% total cost
                </span>
              </div>
              <p className="mt-1.5 text-xs leading-5 text-[#4e473d]">
                Includes digital payment gateway fee + third-party rider
                delivery. Leaves{" "}
                <strong className="text-emerald-900">
                  88% net to restaurant
                </strong>
                .
              </p>
            </div>

            <div className="rounded-2xl border border-[#dec9ec] bg-[#f7f2fa] p-4">
              <div className="flex items-center justify-between text-xs font-bold text-[#4a1d5a]">
                <span>Party Catering Wizard</span>
                <span className="rounded-md bg-[#3b1747] px-2 py-0.5 text-[10px] text-[#f4d6a9]">
                  30% gross margin
                </span>
              </div>
              <p className="mt-1.5 text-xs leading-5 text-[#4e473d]">
                100% direct capture of ₹18,000 average bulk orders, eliminating
                telephone drop-offs.
              </p>
            </div>

            <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4">
              <div className="flex items-center justify-between text-xs font-bold text-rose-900">
                <span>Food Delivery Aggregators</span>
                <span className="rounded-md bg-rose-200/80 px-2 py-0.5 text-[10px] text-rose-950">
                  27% avg commission
                </span>
              </div>
              <p className="mt-1.5 text-xs leading-5 text-[#4e473d]">
                Withholds customer contact info; restaurant retains only 73% of
                gross merchandise value.
              </p>
            </div>
          </div>

          <Link
            href="/admin/menu"
            className="mt-5 flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-[#dfd4c2] bg-[#faf7f2] px-4 text-xs font-bold text-[#0f352d] transition hover:bg-[#f2ebe0]"
          >
            <span>Manage Central Menu & Pricing</span>
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* Financial Formula Rationale Modal */}
      {showFormulaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#140d18]/60 p-4 backdrop-blur-xs">
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-[#dfd4c2] bg-[#fffdfa] p-6 shadow-2xl sm:p-8">
            <div className="flex items-center justify-between border-b border-[#ece3d5] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef6f4] text-[#0f352d]">
                  <TrendingUp className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="font-display text-xl font-bold text-[#0f352d]">
                  Financial Model & ₹1.14 Cr Formula
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowFormulaModal(false)}
                className="rounded-full border border-[#e2d8c7] p-2 text-[#635b50] hover:bg-[#f0e8dc]"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 space-y-4 text-xs leading-relaxed text-[#544d42]">
              <div className="rounded-2xl border border-[#dfd4c2] bg-[#faf7f2] p-4">
                <h4 className="font-display text-sm font-bold text-[#0f352d]">
                  1. Direct Orders Channel Shift (₹95.04 Lakh/yr)
                </h4>
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  <li>
                    Total Annual Chain Revenue: <strong>₹96.00 Crore</strong>
                  </li>
                  <li>
                    Food Delivery App Sales (55%): <strong>₹52.80 Crore</strong>
                  </li>
                  <li>
                    Target Shift to Direct (12% of app volume):{" "}
                    <strong>₹6.336 Crore</strong>
                  </li>
                  <li>
                    Average Aggregator Commission: <strong>27%</strong>
                  </li>
                  <li>
                    Direct Payment & Delivery Costs: <strong>12%</strong>
                  </li>
                  <li>
                    Net Points Saved on Direct:{" "}
                    <strong>27% - 12% = 15 points (15%)</strong>
                  </li>
                  <li>
                    Annual Savings:{" "}
                    <strong>15% on ₹6.336 Crore = ₹95.04 Lakh</strong>
                  </li>
                </ul>
              </div>

              <div className="rounded-2xl border border-[#dec9ec] bg-[#f7f2fa] p-4">
                <h4 className="font-display text-sm font-bold text-[#4a1d5a]">
                  2. Party & Bulk Orders Leakage Capture (₹19.44 Lakh/yr)
                </h4>
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  <li>
                    Phone Line Lost Orders: <strong>30 orders/month</strong>
                  </li>
                  <li>
                    Average Ticket Size:{" "}
                    <strong>₹18,000 per party order</strong>
                  </li>
                  <li>
                    Gross Margin:{" "}
                    <strong>30% (₹5,400 margin per order)</strong>
                  </li>
                  <li>
                    Annual Value Saved:{" "}
                    <strong>30 × ₹5,400 × 12 months = ₹19.44 Lakh</strong>
                  </li>
                </ul>
              </div>

              <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4">
                <h4 className="font-bold text-emerald-900">
                  Total Net Bottom-Line Addition:
                </h4>
                <p className="font-mono-tabular mt-1 text-base font-black text-emerald-950">
                  ₹95.04 Lakh + ₹19.44 Lakh = ₹1.1448 Crore / year
                </p>
                <p className="mt-1 text-[11px] text-emerald-800">
                  Calculated automatically on every paid order placed through
                  this direct-ordering platform.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowFormulaModal(false)}
                className="rounded-xl bg-[#0f352d] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#08231d]"
              >
                Close Model
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
