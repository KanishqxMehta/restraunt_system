import { redirect } from "next/navigation";
import { getViewer } from "@/features/auth/session";
import { homeForRole } from "@/features/auth/roles";
export default async function Home() {
  const viewer = await getViewer();
  redirect(viewer ? homeForRole(viewer.role) : "/login");
}
