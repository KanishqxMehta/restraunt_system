import { requireViewer } from "@/features/auth/session";
import { apiError } from "@/server/http/errors";
export async function GET() {
  try {
    return Response.json(
      { user: await requireViewer() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
