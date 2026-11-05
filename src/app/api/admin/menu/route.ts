import { requireViewer } from "@/features/auth/session";
import {
  listAdminMenuWithOutlets,
  createMenuItem,
} from "@/features/menu/admin-service";
import { createMenuItemSchema } from "@/features/menu/validation";
import { apiError } from "@/server/http/errors";
import { readJson, requireSameOrigin } from "@/server/http/request";

export async function GET() {
  try {
    const viewer = await requireViewer(["CENTRAL_ADMIN"]);
    const { items, outlets } = await listAdminMenuWithOutlets(viewer);
    return Response.json(
      { items, outlets },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const viewer = await requireViewer(["CENTRAL_ADMIN"]);
    const input = await readJson(request, createMenuItemSchema);
    const item = await createMenuItem(viewer, input);
    return Response.json({ item }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
