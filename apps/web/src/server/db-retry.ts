/**
 * Retries a whole transaction when Postgres aborts it for a transient
 * concurrency reason: a serialization failure (40001) or a deadlock (40P01).
 *
 * Prisma surfaces these differently depending on where they happen:
 * - P2034 for serialization failures in model queries and at commit.
 * - P2010 (raw queries) or P2039 (driver adapter errors) with the original
 *   SQLSTATE in `meta.driverAdapterError.cause.originalCode`; deadlocks are
 *   never mapped to P2034.
 *
 * `run` must execute the complete transaction (e.g. `() => db.$transaction(...)`)
 * so every attempt starts from a fresh snapshot.
 */
const RETRYABLE_SQLSTATES = new Set(["40001", "40P01"]);

function errorCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error
    ? error.code
    : undefined;
}

function driverSqlState(error: unknown) {
  if (typeof error !== "object" || error === null || !("meta" in error)) {
    return undefined;
  }
  const meta = error.meta as
    { driverAdapterError?: { cause?: { originalCode?: unknown } } } | undefined;
  return meta?.driverAdapterError?.cause?.originalCode;
}

export function isTransientTransactionError(error: unknown) {
  const code = errorCode(error);
  if (code === "P2034") return true;
  if (code === "P2010" || code === "P2039") {
    const sqlState = driverSqlState(error);
    return typeof sqlState === "string" && RETRYABLE_SQLSTATES.has(sqlState);
  }
  return false;
}

export function isUniqueConstraintError(error: unknown) {
  return errorCode(error) === "P2002";
}

export async function withTransactionRetry<T>(
  run: () => Promise<T>,
  options: {
    retries?: number;
    /** Extra errors worth retrying, e.g. P2002 for idempotent create paths. */
    shouldRetry?: (error: unknown) => boolean;
  } = {},
): Promise<T> {
  const retries = options.retries ?? 3;
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      const retryable =
        isTransientTransactionError(error) ||
        (options.shouldRetry?.(error) ?? false);
      if (!retryable || attempt >= retries) throw error;
      // Jittered backoff so colliding transactions don't retry in lockstep.
      const delayMs = 20 * 2 ** attempt + Math.random() * 50;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}
