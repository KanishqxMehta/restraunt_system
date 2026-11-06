import { requirePageViewer } from "@/features/auth/session";
import { listAllOutletsWithStats } from "@/features/outlets/admin-service";
import { WorkspaceShell } from "@/components/workspace-shell";
import { PageHeader } from "@/components/ui/page-header";
import { AdminOutletsBoard } from "@/features/outlets/components/admin-outlets-board";

export default async function AdminOutletsPage() {
  const viewer = await requirePageViewer(["CENTRAL_ADMIN"]);
  const outlets = await listAllOutletsWithStats(viewer);

  return (
    <WorkspaceShell viewer={viewer}>
      <PageHeader
        eyebrow="Fleet & Kitchen Management"
        title="Outlet Network & Cloud Kitchens"
        description="Manage the 14 flagship dine-in outlets and 3 cloud kitchens across Hyderabad. Provision new kitchen hubs, calibrate delivery radiuses, manage FSSAI compliance licences, and control order acceptance."
      />
      <AdminOutletsBoard initialOutlets={outlets} />
    </WorkspaceShell>
  );
}
