import { requireViewer } from "@/features/auth/session";
import {
  listAllOutletsWithStats,
  createOutlet,
} from "@/features/outlets/admin-service";
import { createOutletSchema } from "@/features/outlets/validation";
import { apiError } from "@/server/http/errors";
import { readJson, requireSameOrigin } from "@/server/http/request";

export async function GET() {
  try {
    const viewer = await requireViewer(["CENTRAL_ADMIN"]);
    const outlets = await listAllOutletsWithStats(viewer);
    return Response.json({ outlets }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const viewer = await requireViewer(["CENTRAL_ADMIN"]);
    const input = await readJson(request, createOutletSchema);
    const outlet = await createOutlet(viewer, input);
    return Response.json({ outlet }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
