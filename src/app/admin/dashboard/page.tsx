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
        eyebrow="Central Leadership & Marketing"
        title="Executive Margin & Operations"
        description="Live commission savings counter, bulk catering recovery, first-party DPDP customer database metrics, and kitchen SLA compliance across all Hyderabad outlets."
      />
      <ExecutiveDashboard summary={summary} />
    </WorkspaceShell>
  );
}
