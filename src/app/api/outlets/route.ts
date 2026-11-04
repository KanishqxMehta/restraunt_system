import { requireViewer } from "@/features/auth/session";
import { listOutlets } from "@/features/outlets/repository";
import { apiError } from "@/server/http/errors";
export async function GET() {
  try {
    return Response.json(
      { outlets: await listOutlets(await requireViewer()) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
