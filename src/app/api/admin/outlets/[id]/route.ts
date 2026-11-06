import { requireViewer } from "@/features/auth/session";
import {
  updateOutlet,
  deleteOutlet,
} from "@/features/outlets/admin-service";
import { updateOutletSchema } from "@/features/outlets/validation";
import { apiError } from "@/server/http/errors";
import { readJson, requireSameOrigin } from "@/server/http/request";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    requireSameOrigin(request);
    const viewer = await requireViewer(["CENTRAL_ADMIN"]);
    const { id } = await context.params;
    const input = await readJson(request, updateOutletSchema);
    const outlet = await updateOutlet(viewer, id, input);
    return Response.json({ outlet });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    requireSameOrigin(request);
    const viewer = await requireViewer(["CENTRAL_ADMIN"]);
    const { id } = await context.params;
    await deleteOutlet(viewer, id);
    return Response.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
