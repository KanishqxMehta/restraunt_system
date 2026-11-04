import { requirePageViewer } from "@/features/auth/session";
import { listKitchenOrders } from "@/features/orders/repository";
import { listOutlets } from "@/features/outlets/repository";
import { WorkspaceShell } from "@/components/workspace-shell";
import { PageHeader } from "@/components/ui/page-header";
import { OrderList } from "@/features/orders/components/order-list";
export default async function KitchenPage() {
  const viewer = await requirePageViewer(["KITCHEN_STAFF", "CENTRAL_ADMIN"]);
  const [orders, outlets] = await Promise.all([
    listKitchenOrders(viewer),
    listOutlets(viewer),
  ]);
  return (
    <WorkspaceShell viewer={viewer}>
      <PageHeader
        eyebrow="Outlet workspace"
        title="Kitchen foundation"
        description={`${outlets.map((outlet) => outlet.name).join(" · ") || "No outlet assigned"}. This is a read-only preview; live tickets and stage controls arrive in the kitchen iteration.`}
      />
      <OrderList orders={orders} />
    </WorkspaceShell>
  );
}
