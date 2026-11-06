import { requirePageViewer } from "@/features/auth/session";
import { listOutlets } from "@/features/outlets/repository";
import { PartyCateringExperience } from "@/features/catering/components/party-catering-experience";

export default async function PartyOrdersPage() {
  const viewer = await requirePageViewer(["CUSTOMER"]);
  const outlets = await listOutlets(viewer);

  return <PartyCateringExperience outlets={outlets} />;
}
