export class ClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}
export async function requestJson<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new ClientError(
      typeof body.error === "string"
        ? body.error
        : "We couldn't complete that request. Please try again.",
      response.status,
    );
  return body as T;
}
export function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Please check your connection and try again.";
}
