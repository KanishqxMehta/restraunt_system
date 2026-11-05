import {
  locationSchema,
  eligibleOutlets,
} from "@/features/outlets/serviceability";
import { outletSelection } from "@/features/menu/customer-repository";
import { getDatabase } from "@/server/db/client";
import { readJson, requireSameOrigin } from "@/server/http/request";
import { apiError } from "@/server/http/errors";
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const location = await readJson(request, locationSchema);
    const outlets = await getDatabase().outlet.findMany({
      select: outletSelection,
      where: { isActive: true },
    });
    return Response.json(
      { outlets: eligibleOutlets(outlets, location, new Date()) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
