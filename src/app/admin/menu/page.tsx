import { requirePageViewer } from "@/features/auth/session";
import { listAdminMenuWithOutlets } from "@/features/menu/admin-service";
import { WorkspaceShell } from "@/components/workspace-shell";
import { PageHeader } from "@/components/ui/page-header";
import { AdminMenuBoard } from "@/features/menu/components/admin-menu-board";

export default async function AdminMenuPage() {
  const viewer = await requirePageViewer(["CENTRAL_ADMIN"]);
  const { items, outlets } = await listAdminMenuWithOutlets(viewer);

  return (
    <WorkspaceShell viewer={viewer}>
      <PageHeader
        eyebrow="Central workspace"
        title="One menu. Every outlet."
        description="Authoritative central menu management with city pricing, dietary attributes, time-based service windows, and real-time per-outlet stock controls. All prices include 5% GST."
      />
      <AdminMenuBoard initialItems={items} outlets={outlets} />
    </WorkspaceShell>
  );
}
