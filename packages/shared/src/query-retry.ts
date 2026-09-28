const NON_RETRYABLE_CODES = new Set([
  "BAD_REQUEST",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
]);

/**
 * React Query `retry` for tRPC calls: up to two retries, none for errors a
 * retry cannot fix (bad input, auth, missing data).
 */
export function shouldRetryQuery(failureCount: number, error: unknown) {
  const code =
    typeof error === "object" &&
    error !== null &&
    "data" in error &&
    typeof error.data === "object" &&
    error.data !== null &&
    "code" in error.data
      ? error.data.code
      : undefined;

  return failureCount < 2 && !NON_RETRYABLE_CODES.has(String(code));
}
