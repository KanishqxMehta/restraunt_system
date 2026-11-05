/** Prisma can report serialization conflicts either directly or through its pg adapter. */
export function isRetryableTransactionError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  if ("code" in error && ["P2034", "P2002"].includes(String(error.code)))
    return true;
  if (
    !("name" in error) ||
    error.name !== "DriverAdapterError" ||
    !("cause" in error)
  )
    return false;
  const cause = error.cause;
  return Boolean(
    cause &&
    typeof cause === "object" &&
    "kind" in cause &&
    cause.kind === "TransactionWriteConflict",
  );
}
