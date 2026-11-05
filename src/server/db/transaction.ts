import "server-only";
import { setTimeout } from "node:timers/promises";
import type { Prisma } from "@/generated/prisma/client";
import { getDatabase } from "./client";
import { isRetryableTransactionError } from "./retry-policy";
import { HttpError } from "@/server/http/errors";
export async function serializable<T>(
  operation: (transaction: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await getDatabase().$transaction(operation, {
        isolationLevel: "Serializable",
        timeout: 15_000,
      });
    } catch (error) {
      if (!isRetryableTransactionError(error)) throw error;
      if (attempt >= 3)
        throw new HttpError(
          409,
          "Checkout changed during another request. Please review and try again.",
        );
      await setTimeout(25 * (attempt + 1));
    }
  }
}
