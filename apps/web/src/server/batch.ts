import { randomBytes } from "node:crypto";

/** Splits `items` into consecutive slices of at most `size` elements. */
export function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

/**
 * Like `Promise.allSettled(items.map(fn))`, but runs at most `limit` calls at
 * once so large batches don't flood R2 or the connection pool.
 */
export async function settleWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results = new Array<PromiseSettledResult<R>>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      try {
        results[index] = {
          status: "fulfilled",
          value: await fn(items[index]!, index),
        };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
  return results;
}

/**
 * Collision-resistant id shaped like Prisma's `cuid()` default ("c" followed
 * by 24 lowercase base-36 characters). Used when rows are inserted with
 * `createMany` and their ids are needed up front to link child rows.
 */
export function createId() {
  const time = Date.now().toString(36).padStart(9, "0").slice(-9);
  const random = Array.from(randomBytes(15), (byte) =>
    (byte % 36).toString(36),
  ).join("");
  return `c${time}${random}`;
}
