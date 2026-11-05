import { requirePageViewer } from "@/features/auth/session";
import { listKitchenOrders } from "@/features/orders/repository";
import { listOutlets } from "@/features/outlets/repository";
import { WorkspaceShell } from "@/components/workspace-shell";
import { PageHeader } from "@/components/ui/page-header";
import { KitchenBoard } from "@/features/orders/components/kitchen-board";
import { RefreshStatus } from "@/features/orders/components/refresh-status";

export default async function KitchenPage() {
  const viewer = await requirePageViewer(["KITCHEN_STAFF", "CENTRAL_ADMIN"]);
  const [orders, outlets] = await Promise.all([
    listKitchenOrders(viewer),
    listOutlets(viewer),
  ]);
  const outletNames = outlets.map((outlet) => outlet.name).join(" · ");

  return (
    <WorkspaceShell viewer={viewer}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          eyebrow="Outlet workspace"
          title="Kitchen display"
          description={
            (outletNames || "No outlet assigned") +
            (viewer.role === "CENTRAL_ADMIN" ? " · Network view" : "")
          }
        />
        <RefreshStatus />
      </div>
      <KitchenBoard
        tickets={orders}
        canAdvance={viewer.role === "KITCHEN_STAFF"}
      />
    </WorkspaceShell>
  );
}
