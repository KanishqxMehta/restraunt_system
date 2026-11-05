import { describe, expect, it } from "vitest";
import { isRetryableTransactionError } from "@/server/db/retry-policy";
describe("transaction retry classification", () => {
  it("retries Prisma write conflicts and idempotency uniqueness races", () => {
    expect(isRetryableTransactionError({ code: "P2034" })).toBe(true);
    expect(isRetryableTransactionError({ code: "P2002" })).toBe(true);
  });
  it("retries pg adapter serialization/deadlock failures", () => {
    expect(
      isRetryableTransactionError({
        name: "DriverAdapterError",
        cause: { kind: "TransactionWriteConflict" },
      }),
    ).toBe(true);
  });
  it("does not retry validation, connection or unknown errors", () => {
    for (const error of [
      null,
      new Error("validation"),
      { code: "P1001" },
      { name: "DriverAdapterError", cause: { kind: "DatabaseNotReachable" } },
    ])
      expect(isRetryableTransactionError(error)).toBe(false);
  });
});
