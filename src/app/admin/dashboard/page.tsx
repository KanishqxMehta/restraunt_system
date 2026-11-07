import { requirePageViewer } from "@/features/auth/session";
import { getExecutiveAnalytics } from "@/features/analytics/service";
import { WorkspaceShell } from "@/components/workspace-shell";
import { PageHeader } from "@/components/ui/page-header";
import { ExecutiveDashboard } from "@/features/analytics/components/executive-dashboard";

export default async function AdminDashboardPage() {
  const viewer = await requirePageViewer(["CENTRAL_ADMIN"]);
  const summary = await getExecutiveAnalytics(viewer);

  return (
    <WorkspaceShell viewer={viewer}>
      <PageHeader
        eyebrow="Central Analytics & Operations"
        title="Outlet Operations & Business Analytics"
        description="Monitor order volume, preparation times, kitchen SLA compliance, cancellations, repeat customer retention, and configurable commission benchmarks across all outlets."
      />
      <ExecutiveDashboard summary={summary} />
    </WorkspaceShell>
  );
}
