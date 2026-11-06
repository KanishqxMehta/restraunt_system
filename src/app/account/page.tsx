import Link from "next/link";
import { UtensilsCrossed, Sparkles, ShieldCheck, Award, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { requirePageViewer } from "@/features/auth/session";
import { listOrders } from "@/features/orders/repository";
import { getOrCreateLoyaltyAccount } from "@/features/loyalty/service";
import { WorkspaceShell } from "@/components/workspace-shell";
import { PageHeader } from "@/components/ui/page-header";
import { OrderList } from "@/features/orders/components/order-list";

export default async function AccountPage() {
  const viewer = await requirePageViewer(["CUSTOMER"]);
  const orders = await listOrders(viewer);
  const loyalty = await getOrCreateLoyaltyAccount(viewer.id);

  return (
    <WorkspaceShell viewer={viewer}>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <PageHeader
          eyebrow="Your account & order history"
          title={`Welcome, ${viewer.name}`}
          description="Your order history is private to your account. Open any order below to inspect live kitchen stages, view SMS/WhatsApp dispatch logs, or finish a test payment."
        />
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <Link
            href="/order"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#0f352d] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#08231d]"
          >
            <UtensilsCrossed className="h-3.5 w-3.5 text-[#f4d6a9]" aria-hidden="true" />
            New food order
          </Link>
          <Link
            href="/party-orders"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#d8bfe8] bg-[#f7f2fa] px-4 py-2.5 text-xs font-bold text-[#3b1747] transition hover:bg-[#ede0f5]"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Book party handis
          </Link>
        </div>
      </div>

      {/* Royal Rewards Loyalty Wallet */}
      <div className="mb-8 overflow-hidden rounded-3xl border border-amber-200/90 bg-gradient-to-br from-[#fffdfa] via-amber-50/30 to-[#fdfaf5] p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-amber-200/60 pb-5">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-200 bg-amber-100 text-[#b48028] shadow-inner">
              <Award className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <span className="block text-xs font-bold uppercase tracking-[0.2em] text-[#0f352d]">
                Direct Loyalty Program
              </span>
              <h2 className="font-display text-2xl font-black text-[#0f352d]">
                Royal Rewards Wallet
              </h2>
            </div>
          </div>

          <div className="flex items-baseline gap-2 rounded-2xl border border-amber-200 bg-white px-5 py-2.5 shadow-2xs">
            <span className="font-mono text-3xl font-black text-[#b48028]">
              {loyalty.pointsBalance}
            </span>
            <span className="text-xs font-bold text-[#544d42]">
              Points (≈ ₹{loyalty.rupeeValue} discount)
            </span>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#ded2bf] bg-white/80 p-4">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-[#7a6f60]">
              Direct Earning Rule
            </span>
            <p className="mt-1 text-sm font-black text-[#0f352d]">
              1 Point per ₹10 spent
            </p>
            <p className="mt-0.5 text-xs text-[#7a6f60]">
              Earn rewards on every direct order
            </p>
          </div>

          <div className="rounded-2xl border border-[#ded2bf] bg-white/80 p-4">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-[#7a6f60]">
              Redemption Rate
            </span>
            <p className="mt-1 text-sm font-black text-[#b48028]">
              100 Points = ₹50 OFF
            </p>
            <p className="mt-0.5 text-xs text-[#7a6f60]">
              Apply at checkout in 1 tap
            </p>
          </div>

          <div className="rounded-2xl border border-[#ded2bf] bg-white/80 p-4">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-[#7a6f60]">
              Lifetime Earned
            </span>
            <p className="mt-1 text-sm font-black text-[#0f352d]">
              {loyalty.lifetimeEarned} Points
            </p>
            <p className="mt-0.5 text-xs text-[#7a6f60]">
              Redeemed: {loyalty.lifetimeRedeemed} pts
            </p>
          </div>
        </div>

        {loyalty.transactions.length > 0 && (
          <div className="mt-5 border-t border-amber-200/60 pt-4">
            <span className="block text-xs font-bold uppercase tracking-wider text-[#544d42]">
              Recent Points Ledger
            </span>
            <div className="mt-2.5 space-y-2">
              {loyalty.transactions.slice(0, 3).map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-xl border border-[#ece3d5] bg-white/70 px-3.5 py-2 text-xs"
                >
                  <div className="flex items-center gap-2">
                    {tx.points > 0 ? (
                      <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-amber-600" />
                    )}
                    <span className="font-semibold text-[#1f1c18]">
                      {tx.description}
                    </span>
                  </div>
                  <span
                    className={
                      tx.points > 0
                        ? "font-bold text-emerald-700"
                        : "font-bold text-amber-700"
                    }
                  >
                    {tx.points > 0 ? `+${tx.points}` : tx.points} pts
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {orders.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e3d8c6] bg-[#fffdfa] px-5 py-3.5 text-xs text-[#575046] shadow-2xs">
          <span className="font-bold text-[#0f352d]">
            Showing {orders.length} {orders.length === 1 ? "order" : "orders"} in
            your private ledger
          </span>
          <span className="inline-flex items-center gap-1.5 text-[#4a1d5a] font-semibold">
            <ShieldCheck className="h-4 w-4 text-[#0f352d]" aria-hidden="true" />
            DPDP 2023 Protected Customer Record
          </span>
        </div>
      )}

      <OrderList orders={orders} showDetails />
    </WorkspaceShell>
  );
}
