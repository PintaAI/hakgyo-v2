import { QueryClient } from "@tanstack/react-query";

const NON_RETRYABLE_CODES = new Set([
  "BAD_REQUEST",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
]);

function shouldRetry(failureCount: number, error: unknown) {
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

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        // Server state is hydrated from SQLite and refreshed only by an
        // explicit sync checkpoint or a screen-level manual retry.
        staleTime: Infinity,
        gcTime: 1000 * 60 * 60 * 24 * 30,
        refetchOnMount: false,
        refetchOnReconnect: false,
        refetchOnWindowFocus: false,
        retry: shouldRetry,
      },
    },
  });
