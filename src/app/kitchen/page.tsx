import Link from "next/link";
import { ShieldCheck, ExternalLink } from "lucide-react";
import { requirePageViewer } from "@/features/auth/session";
import { listKitchenOrders } from "@/features/orders/repository";
import { listOutlets } from "@/features/outlets/repository";
import { getDatabase } from "@/server/db/client";
import { WorkspaceShell } from "@/components/workspace-shell";
import { PageHeader } from "@/components/ui/page-header";
import { KitchenBoard } from "@/features/orders/components/kitchen-board";
import { RefreshStatus } from "@/features/orders/components/refresh-status";
import { KitchenStockControl } from "@/features/orders/components/kitchen-stock-control";

export default async function KitchenPage({
  searchParams,
}: {
  searchParams?: Promise<{ outlet?: string }>;
}) {
  const viewer = await requirePageViewer(["KITCHEN_STAFF", "CENTRAL_ADMIN"]);
  const params = await searchParams;
  const requestedOutletId = params?.outlet;

  const [orders, outlets] = await Promise.all([
    listKitchenOrders(viewer),
    listOutlets(viewer),
  ]);

  const activeOutlet =
    outlets.find((o) => o.id === requestedOutletId) ?? outlets[0];
  const outletNames = outlets.map((outlet) => outlet.name).join(" · ");
  const canAdvance =
    viewer.role === "KITCHEN_STAFF" || viewer.role === "CENTRAL_ADMIN";

  let stockItems: {
    id: string;
    name: string;
    category: string;
    isVeg: boolean;
    isAvailable: boolean;
  }[] = [];

  if (activeOutlet) {
    const rawItems = await getDatabase().menuItem.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        category: true,
        isVeg: true,
        availability: {
          where: { outletId: activeOutlet.id },
          select: { isAvailable: true },
        },
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
    stockItems = rawItems.map((i) => ({
      id: i.id,
      name: i.name,
      category: i.category,
      isVeg: i.isVeg,
      isAvailable: i.availability[0]?.isAvailable ?? true,
    }));
  }

  return (
    <WorkspaceShell viewer={viewer}>
      {/* Central Admin Master Operations Clearance Banner */}
      {viewer.role === "CENTRAL_ADMIN" && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#c99b53]/50 bg-gradient-to-r from-[#fbf8f2] via-[#faf4e6] to-[#f5ebd6] p-4 text-xs shadow-xs">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0f352d] text-[#c99b53] shadow-xs">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[#0f352d] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white">
                  Admin Clearance Mode
                </span>
                <strong className="text-sm font-bold text-[#0f352d]">
                  Master Operations Clearance Active
                </strong>
              </div>
              <p className="mt-0.5 text-[11px] text-[#5c4930]">
                You have unrestricted authority to advance stages, adjust SLA promise times, and 86 items across all 17 kitchens without logging out of Central Admin.
                {activeOutlet && (
                  <span className="ml-1 font-semibold text-[#0f352d]">
                    Focused Outlet: <strong>{activeOutlet.name}</strong>
                  </span>
                )}
              </p>
            </div>
          </div>
          <Link
            href="/admin/outlets"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#c99b53] bg-white px-3.5 py-2 text-xs font-bold text-[#0f352d] shadow-2xs hover:bg-[#faf6ee] transition"
          >
            <span>Fleet &amp; Staff Creds</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4 rounded-[2rem] border border-[#dfd4c2] bg-[#fffdfa] p-6 shadow-xs sm:p-8">
        <div className="[&>header]:mb-0">
          <PageHeader
            eyebrow="Outlet workspace · Live KDS"
            title="Kitchen display"
            description={
              (outletNames || "No outlet assigned") +
              (viewer.role === "CENTRAL_ADMIN" ? " · Network view" : "")
            }
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {activeOutlet && canAdvance && (
            <KitchenStockControl
              outletId={activeOutlet.id}
              outletName={activeOutlet.name}
              initialItems={stockItems}
            />
          )}
          <RefreshStatus />
        </div>
      </div>

      <KitchenBoard
        tickets={orders}
        outlets={outlets}
        canAdvance={canAdvance}
        initialSelectedOutletId={requestedOutletId}
      />
    </WorkspaceShell>
  );
}
