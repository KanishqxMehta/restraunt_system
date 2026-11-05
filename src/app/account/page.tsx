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
      <PageHeader
        eyebrow="Your account"
        title={`Welcome, ${viewer.name}`}
        description="Your order history is private to your account. Open an order to check its status or finish a test payment."
      />
      <OrderList orders={orders} showDetails />
    </WorkspaceShell>
  );
}
