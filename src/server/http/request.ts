import { z } from "zod";
import { HttpError } from "./errors";

export function requireSameOrigin(request: Request): void {
  const expected = process.env.BETTER_AUTH_URL;
  if (!expected || request.headers.get("origin") !== new URL(expected).origin) {
    throw new HttpError(403, "This request must come from our ordering site.");
  }
}

export async function readJson<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<z.output<T>> {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new HttpError(415, "Send JSON data.");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Request body is required.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 32_768) {
        await reader.cancel();
        throw new HttpError(413, "Request is too large.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  let data: unknown;
  try {
    data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "Invalid JSON data.");
  }
  const result = schema.safeParse(data);
  if (!result.success) throw new HttpError(400, result.error.issues[0].message);
  return result.data;
}
