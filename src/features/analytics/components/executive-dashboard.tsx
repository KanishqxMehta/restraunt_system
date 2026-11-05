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
} from "lucide-react";
import type { ExecutiveAnalyticsSummary } from "../types";

function formatRupees(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
}

export function ExecutiveDashboard({ summary }: { summary: ExecutiveAnalyticsSummary }) {
  const [showFormulaModal, setShowFormulaModal] = useState(false);
  const [filterType, setFilterType] = useState<"ALL" | "DINE_IN" | "CLOUD_KITCHEN">("ALL");

  const filteredOutlets = summary.outlets.filter((outlet) => {
    if (filterType === "DINE_IN") return !outlet.isCloudKitchen;
    if (filterType === "CLOUD_KITCHEN") return outlet.isCloudKitchen;
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Target Realization Hero Banner */}
      <section className="relative overflow-hidden rounded-2xl border border-[#ded5c6] bg-gradient-to-br from-[#133d34] via-[#10332c] to-[#3b1747] p-6 text-white shadow-md sm:p-8">
        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-300">
                <Sparkles className="h-3.5 w-3.5" />
                Strategic Objective Tracker
              </span>
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl text-[#fffdfa]">
                ₹1.14 Crore Annual Margin Recovery
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-emerald-100/90">
                Tracking net commission saved on direct orders (15% net margin) plus direct party catering margin captured (30% margin) against aggregator disintermediation.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowFormulaModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white backdrop-blur-xs transition hover:bg-white/20"
            >
              <Info className="h-4 w-4" />
              View financial model
            </button>
          </div>

          {/* Progress bar */}
          <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4 sm:p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <span className="text-xs uppercase tracking-wider text-emerald-200/80">Value Captured To Date</span>
                <p className="text-3xl font-black text-[#fffdfa] sm:text-4xl">
                  {formatRupees(summary.totalValueCapturedPaise)}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs uppercase tracking-wider text-emerald-200/80">Annual Target</span>
                <p className="text-lg font-bold text-emerald-200">
                  {formatRupees(summary.annualTargetPaise)}
                </p>
              </div>
            </div>

            <div className="mt-4 h-3.5 w-full overflow-hidden rounded-full bg-white/10 p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-[#e2d0ee] transition-all duration-700"
                style={{ width: `${Math.max(2, Math.min(100, summary.targetProgressPercent))}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-emerald-200/80">
              <span>Direct delivery savings + Bulk catering captured</span>
              <span className="font-bold text-white">{summary.targetProgressPercent}% of annual benchmark</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4 Core Executive Metric Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Direct Commission Saved */}
        <div className="rounded-2xl border border-[#ded5c6] bg-[#fffdfa] p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#635b50]">
              Direct Channel Savings
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-[#133d34]">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-[#133d34]">
            {formatRupees(summary.commissionSavedPaise)}
          </p>
          <p className="mt-1 text-xs text-[#544d42]">
            <strong className="text-[#133d34]">15% net saved</strong> on {formatRupees(summary.totalDirectGMVPaise)} direct volume ({summary.directOrdersCount} orders) vs 27% aggregator fee.
          </p>
        </div>

        {/* Card 2: Bulk Catering Margin */}
        <div className="rounded-2xl border border-[#ded5c6] bg-[#fffdfa] p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#635b50]">
              Bulk Catering Margin
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f5effa] text-[#4a1d5a]">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-[#4a1d5a]">
            {formatRupees(summary.cateringMarginCapturedPaise)}
          </p>
          <p className="mt-1 text-xs text-[#544d42]">
            <strong className="text-[#4a1d5a]">30% margin captured</strong> on {formatRupees(summary.cateringGMVPaise)} bulk orders ({summary.cateringOrdersCount} events) recovering phone drop-offs.
          </p>
        </div>

        {/* Card 3: First-Party Customer Database (DPDP 2023) */}
        <div className="rounded-2xl border border-[#ded5c6] bg-[#fffdfa] p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#635b50]">
              Customer Database (DPDP)
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-[#25221e]">
            {summary.totalCustomers} <span className="text-sm font-semibold text-[#635b50]">Users</span>
          </p>
          <p className="mt-1 text-xs text-[#544d42]">
            <strong className="text-[#25221e]">{summary.marketingOptInPercent}% opt-in rate</strong> ({summary.marketingOptedInCount} opted-in). First-party contacts owned by Company A.
          </p>
        </div>

        {/* Card 4: Kitchen SLA & On-time Fulfillment */}
        <div className="rounded-2xl border border-[#ded5c6] bg-[#fffdfa] p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#635b50]">
              Kitchen SLA Rate
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-800">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-[#133d34]">
            {summary.onTimeSlaPercent}%
          </p>
          <p className="mt-1 text-xs text-[#544d42]">
            Avg prep <strong className="text-[#133d34]">{summary.avgPrepMinutes}m</strong> · {summary.criticalLateOrders > 0 ? (
              <span className="font-semibold text-rose-700">{summary.criticalLateOrders} late alerts</span>
            ) : (
              <span className="text-emerald-700">Zero critical delays</span>
            )}
          </p>
        </div>
      </section>

      {/* Outlets Performance Table */}
      <section className="rounded-2xl border border-[#ded5c6] bg-[#fffdfa] p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e8ded0] pb-4">
          <div>
            <h3 className="text-lg font-bold text-[#133d34]">Outlet & Cloud Kitchen Performance</h3>
            <p className="text-xs text-[#635b50]">
              Comparative breakdown across dine-in outlets and cloud kitchens in Hyderabad
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-xl border border-[#ded5c6] bg-[#faf8f5] p-1 text-xs font-medium">
            <button
              type="button"
              onClick={() => setFilterType("ALL")}
              className={`rounded-lg px-3 py-1.5 transition ${
                filterType === "ALL" ? "bg-[#133d34] font-bold text-white shadow-xs" : "text-[#544d42] hover:text-[#133d34]"
              }`}
            >
              All Outlets ({summary.outlets.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("DINE_IN")}
              className={`rounded-lg px-3 py-1.5 transition ${
                filterType === "DINE_IN" ? "bg-[#133d34] font-bold text-white shadow-xs" : "text-[#544d42] hover:text-[#133d34]"
              }`}
            >
              Dine-in
            </button>
            <button
              type="button"
              onClick={() => setFilterType("CLOUD_KITCHEN")}
              className={`rounded-lg px-3 py-1.5 transition ${
                filterType === "CLOUD_KITCHEN" ? "bg-[#133d34] font-bold text-white shadow-xs" : "text-[#544d42] hover:text-[#133d34]"
              }`}
            >
              Cloud Kitchens
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#ded5c6] text-[11px] font-bold uppercase tracking-wider text-[#635b50]">
                <th className="py-3 pr-4">Outlet Name</th>
                <th className="py-3 pr-4">Type</th>
                <th className="py-3 pr-4 text-right">Orders</th>
                <th className="py-3 pr-4 text-right">Direct Revenue</th>
                <th className="py-3 pr-4 text-right">Commission Saved</th>
                <th className="py-3 pr-4 text-right">Catering</th>
                <th className="py-3 pr-4 text-right">On-time SLA</th>
                <th className="py-3 text-right">Avg Prep</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0e8dc]">
              {filteredOutlets.map((outlet) => (
                <tr key={outlet.id} className="hover:bg-[#fbf9f4] transition">
                  <td className="py-3.5 pr-4 font-bold text-[#133d34]">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-[#4a1d5a]" />
                      <span>{outlet.name}</span>
                    </div>
                  </td>
                  <td className="py-3.5 pr-4">
                    {outlet.isCloudKitchen ? (
                      <span className="inline-block rounded-full border border-purple-200 bg-[#f5effa] px-2 py-0.5 text-[10px] font-bold text-[#4a1d5a]">
                        Cloud Kitchen
                      </span>
                    ) : (
                      <span className="inline-block rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-[#133d34]">
                        Dine-in Outlet
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 pr-4 text-right font-medium text-[#25221e]">
                    {outlet.totalOrders}
                  </td>
                  <td className="py-3.5 pr-4 text-right font-semibold text-[#133d34]">
                    {formatRupees(outlet.totalRevenuePaise)}
                  </td>
                  <td className="py-3.5 pr-4 text-right font-bold text-emerald-700">
                    {formatRupees(outlet.commissionSavedPaise)}
                  </td>
                  <td className="py-3.5 pr-4 text-right font-medium text-[#4a1d5a]">
                    {outlet.cateringOrders > 0 ? `${outlet.cateringOrders} orders` : "—"}
                  </td>
                  <td className="py-3.5 pr-4 text-right font-bold">
                    <span className={outlet.onTimePercent >= 90 ? "text-emerald-700" : "text-amber-700"}>
                      {outlet.onTimePercent}%
                    </span>
                  </td>
                  <td className="py-3.5 text-right text-[#544d42]">
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
        <div className="rounded-2xl border border-[#ded5c6] bg-[#fffdfa] p-5 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between border-b border-[#e8ded0] pb-3">
            <div>
              <h3 className="text-base font-bold text-[#133d34]">Recent Direct Orders</h3>
              <p className="text-xs text-[#635b50]">Latest paid customer orders across channels</p>
            </div>
            <Link
              href="/kitchen"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#4a1d5a] hover:underline"
            >
              Open Kitchen Board <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-3 divide-y divide-[#f0e8dc]">
            {summary.recentOrders.length === 0 ? (
              <p className="py-8 text-center text-xs text-[#635b50]">No paid orders yet.</p>
            ) : (
              summary.recentOrders.map((order) => (
                <div key={order.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#133d34]">
                        {order.orderNumber}
                      </span>
                      {order.isCatering ? (
                        <span className="rounded-full border border-purple-200 bg-[#f5effa] px-2 py-0.5 text-[10px] font-bold text-[#4a1d5a]">
                          🎉 Bulk Catering ({order.guestCount} guests)
                        </span>
                      ) : (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-[#133d34]">
                          Direct Food Order
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-[#635b50]">
                      {order.outletName} · {order.customerName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[#25221e]">{formatRupees(order.totalPaise)}</p>
                    <p className="text-[11px] font-semibold text-emerald-700">
                      +{formatRupees(order.commissionSavedPaise)} margin saved
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Strategic Channels Summary */}
        <div className="rounded-2xl border border-[#ded5c6] bg-[#fffdfa] p-5 shadow-xs">
          <h3 className="text-base font-bold text-[#133d34]">Channel Margin Health</h3>
          <p className="text-xs text-[#635b50]">Direct channel vs aggregator cost structure</p>

          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5">
              <div className="flex items-center justify-between text-xs font-bold text-[#133d34]">
                <span>Proprietary Direct Web</span>
                <span className="text-emerald-800">12% total cost</span>
              </div>
              <p className="mt-1 text-[11px] text-[#544d42]">
                Includes digital payment gateway fee + third-party rider delivery. Leaves <strong className="text-emerald-800">88% net to restaurant</strong>.
              </p>
            </div>

            <div className="rounded-xl border border-purple-200 bg-[#f5effa] p-3.5">
              <div className="flex items-center justify-between text-xs font-bold text-[#4a1d5a]">
                <span>Party Catering Wizard</span>
                <span className="text-[#3b1747]">30% gross margin</span>
              </div>
              <p className="mt-1 text-[11px] text-[#544d42]">
                100% direct capture of ₹18,000 average bulk orders, eliminating telephone drop-offs.
              </p>
            </div>

            <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3.5">
              <div className="flex items-center justify-between text-xs font-bold text-rose-800">
                <span>Food Delivery Aggregators</span>
                <span className="text-rose-900">27% avg commission</span>
              </div>
              <p className="mt-1 text-[11px] text-[#544d42]">
                Withholds customer contact info; restaurant retains only 73% of gross merchandise value.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Financial Formula Rationale Modal */}
      {showFormulaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#ded5c6] bg-[#fffdfa] p-6 shadow-2xl sm:p-8">
            <div className="flex items-center justify-between border-b border-[#e8ded0] pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-[#133d34]">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <h3 className="text-lg font-bold text-[#133d34]">
                  Financial Model & ₹1.14 Cr Formula
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowFormulaModal(false)}
                className="rounded-lg p-1.5 text-[#635b50] hover:bg-[#f0e8dc]"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs leading-relaxed text-[#544d42]">
              <div className="rounded-xl border border-[#ded5c6] bg-[#fbf9f4] p-4">
                <h4 className="font-bold text-[#133d34]">1. Direct Orders Channel Shift (₹95.04 Lakh/yr)</h4>
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  <li>Total Annual Chain Revenue: <strong>₹96.00 Crore</strong></li>
                  <li>Food Delivery App Sales (55%): <strong>₹52.80 Crore</strong></li>
                  <li>Target Shift to Direct (12% of app volume): <strong>₹6.336 Crore</strong></li>
                  <li>Average Aggregator Commission: <strong>27%</strong></li>
                  <li>Direct Payment & Delivery Costs: <strong>12%</strong></li>
                  <li>Net Points Saved on Direct: <strong>27% - 12% = 15 points (15%)</strong></li>
                  <li>Annual Savings: <strong>15% on ₹6.336 Crore = ₹95.04 Lakh</strong></li>
                </ul>
              </div>

              <div className="rounded-xl border border-[#ded5c6] bg-[#fbf9f4] p-4">
                <h4 className="font-bold text-[#4a1d5a]">2. Party & Bulk Orders Leakage Capture (₹19.44 Lakh/yr)</h4>
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  <li>Phone Line Lost Orders: <strong>30 orders/month</strong></li>
                  <li>Average Ticket Size: <strong>₹18,000 per party order</strong></li>
                  <li>Gross Margin: <strong>30% (₹5,400 margin per order)</strong></li>
                  <li>Annual Value Saved: <strong>30 × ₹5,400 × 12 months = ₹19.44 Lakh</strong></li>
                </ul>
              </div>

              <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4">
                <h4 className="font-bold text-emerald-900">Total Net Bottom-Line Addition:</h4>
                <p className="mt-1 text-sm font-black text-emerald-950">
                  ₹95.04 Lakh + ₹19.44 Lakh = ₹1.1448 Crore / year
                </p>
                <p className="mt-1 text-[11px] text-emerald-800">
                  Calculated automatically on every paid order placed through this direct-ordering platform.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowFormulaModal(false)}
                className="rounded-xl bg-[#133d34] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#0c2a23]"
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
