import { getCustomerMenu } from "@/features/menu/customer-repository";
import { apiError, HttpError } from "@/server/http/errors";
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    if (!id || id.length > 128) throw new HttpError(400, "Invalid outlet.");
    return Response.json(await getCustomerMenu(id), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}
