import { requirePageViewer } from "@/features/auth/session";
import { listCoupons } from "@/features/coupons/service";
import { WorkspaceShell } from "@/components/workspace-shell";
import { PageHeader } from "@/components/ui/page-header";
import { CouponsManager } from "@/features/coupons/components/coupons-manager";

export default async function AdminCouponsPage() {
  const viewer = await requirePageViewer(["CENTRAL_ADMIN"]);
  const { coupons, metrics } = await listCoupons();

  return (
    <WorkspaceShell viewer={viewer}>
      <PageHeader
        eyebrow="Promotions & Direct Acquisition"
        title="Coupons & Promotional Offers"
        description="Create, monitor, and control promotional discount codes for direct customer checkout. Set percentage or flat discounts, enforce minimum order spends, apply margin caps, and toggle active status instantly."
      />
      <CouponsManager initialCoupons={coupons} initialMetrics={metrics} />
    </WorkspaceShell>
  );
}
