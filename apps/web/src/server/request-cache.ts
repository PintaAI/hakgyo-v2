import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Per-request memoization for read-only lookups (memberships, course outlines, ...).
 *
 * tRPC query procedures run inside a scope bound to the request context, so every procedure in one
 * HTTP batch or one RSC render shares the same cache. Mutations run outside any scope, so their
 * reads always hit the database and never observe stale results from before a write.
 */
export type RequestCache = Map<string, Promise<unknown>>;

const storage = new AsyncLocalStorage<RequestCache>();

export function createRequestCache(): RequestCache {
  return new Map();
}

export function runWithRequestCache<T>(
  cache: RequestCache | undefined,
  fn: () => T,
): T {
  return cache ? storage.run(cache, fn) : storage.exit(fn);
}

export function memoizeForRequest<T>(
  key: string,
  load: () => Promise<T>,
): Promise<T> {
  const cache = storage.getStore();
  if (!cache) return load();

  const cached = cache.get(key);
  if (cached) return cached as Promise<T>;

  const pending = load();
  cache.set(key, pending);
  pending.catch(() => cache.delete(key));
  return pending;
}
