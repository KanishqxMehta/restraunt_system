import Link from "next/link";
import { UtensilsCrossed, Sparkles, ShieldCheck } from "lucide-react";
import { requirePageViewer } from "@/features/auth/session";
import { listOrders } from "@/features/orders/repository";
import { WorkspaceShell } from "@/components/workspace-shell";
import { PageHeader } from "@/components/ui/page-header";
import { OrderList } from "@/features/orders/components/order-list";

export default async function AccountPage() {
  const viewer = await requirePageViewer(["CUSTOMER"]);
  const orders = await listOrders(viewer);

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
