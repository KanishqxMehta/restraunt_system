import { requirePageViewer } from "@/features/auth/session";
import { listKitchenOrders } from "@/features/orders/repository";
import { listOutlets } from "@/features/outlets/repository";
import { getDatabase } from "@/server/db/client";
import { WorkspaceShell } from "@/components/workspace-shell";
import { PageHeader } from "@/components/ui/page-header";
import { KitchenBoard } from "@/features/orders/components/kitchen-board";
import { RefreshStatus } from "@/features/orders/components/refresh-status";
import { KitchenStockControl } from "@/features/orders/components/kitchen-stock-control";

export default async function KitchenPage() {
  const viewer = await requirePageViewer(["KITCHEN_STAFF", "CENTRAL_ADMIN"]);
  const [orders, outlets] = await Promise.all([
    listKitchenOrders(viewer),
    listOutlets(viewer),
  ]);
  const outletNames = outlets.map((outlet) => outlet.name).join(" · ");
  const activeOutlet = outlets[0];

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
          {activeOutlet && viewer.role === "KITCHEN_STAFF" && (
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
        canAdvance={viewer.role === "KITCHEN_STAFF"}
      />
    </WorkspaceShell>
  );
}
