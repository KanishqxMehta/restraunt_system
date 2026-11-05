import { requirePageViewer } from "@/features/auth/session";
import { listOutlets } from "@/features/outlets/repository";
import { WorkspaceShell } from "@/components/workspace-shell";
import { PageHeader } from "@/components/ui/page-header";
import { PartyCateringExperience } from "@/features/catering/components/party-catering-experience";

export default async function PartyOrdersPage() {
  const viewer = await requirePageViewer(["CUSTOMER"]);
  const outlets = await listOutlets(viewer);

  return (
    <WorkspaceShell viewer={viewer}>
      <PageHeader
        eyebrow="Direct Bulk Catering"
        title="Party & Bulk Dum Handis"
        description="Celebrate with authentic slow-dum biryani sealed in earthen handis. Select your guest headcount, dietary ratio, and event slot. Bypasses aggregator fees."
      />
      <PartyCateringExperience outlets={outlets} />
    </WorkspaceShell>
  );
}
