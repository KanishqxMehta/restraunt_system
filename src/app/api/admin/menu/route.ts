import { requireViewer } from "@/features/auth/session";
import { listAdminMenu } from "@/features/menu/repository";
import { apiError } from "@/server/http/errors";
export async function GET() {
  try {
    const viewer = await requireViewer(["CENTRAL_ADMIN"]);
    return Response.json(
      { items: await listAdminMenu(viewer) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
