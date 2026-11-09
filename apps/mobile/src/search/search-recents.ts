import Storage from "expo-sqlite/kv-store";
import { useCallback, useSyncExternalStore } from "react";

/**
 * Cari's history on this device, per account: the last searches and the
 * results opened from them. Both lists are capped, newest first, so they
 * never grow with use. Opened results are kept as search document keys and
 * looked up in the current corpus, so a result that no longer exists (a
 * removed lesson, an ended class) simply drops out.
 */
export type SearchRecents = { queries: string[]; opened: string[] };

export const MAX_RECENT_QUERIES = 8;
export const MAX_RECENT_OPENED = 10;
/** Shorter searches are typing, not something to come back to. */
const MIN_QUERY_LENGTH = 2;

const EMPTY: SearchRecents = Object.freeze({ queries: [], opened: [] });
const cache = new Map<string, SearchRecents>();
const listeners = new Set<() => void>();
const storageKey = (userId: string) => `hakgyo:search-recents:v1:${userId}`;

/** `value` first, without earlier copies (`same` decides), at most `max`. */
export function pushRecent(
  list: readonly string[],
  value: string,
  max: number,
  same: (a: string, b: string) => boolean = (a, b) => a === b,
) {
  return [value, ...list.filter((item) => !same(item, value))].slice(0, max);
}

const sameQuery = (a: string, b: string) =>
  a.toLocaleLowerCase("id") === b.toLocaleLowerCase("id");

function strings(value: unknown, max: number) {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .slice(0, max)
    : [];
}

function read(userId: string): SearchRecents {
  const cached = cache.get(userId);
  if (cached) return cached;
  let recents = EMPTY;
  try {
    const raw = Storage.getItemSync(storageKey(userId));
    const saved: unknown = raw ? JSON.parse(raw) : null;
    if (saved && typeof saved === "object") {
      const record = saved as Record<string, unknown>;
      recents = {
        queries: strings(record.queries, MAX_RECENT_QUERIES),
        opened: strings(record.opened, MAX_RECENT_OPENED),
      };
    }
  } catch {
    // Unreadable: start empty.
  }
  cache.set(userId, recents);
  return recents;
}

function write(userId: string, next: SearchRecents) {
  cache.set(userId, next);
  try {
    if (!next.queries.length && !next.opened.length)
      Storage.removeItemSync(storageKey(userId));
    else Storage.setItemSync(storageKey(userId), JSON.stringify(next));
  } catch {
    // Kept for this session.
  }
  for (const listener of listeners) listener();
}

export function rememberQuery(userId: string, query: string) {
  const text = query.trim().replace(/\s+/g, " ");
  if (text.length < MIN_QUERY_LENGTH) return;
  const current = read(userId);
  write(userId, {
    ...current,
    queries: pushRecent(current.queries, text, MAX_RECENT_QUERIES, sameQuery),
  });
}

export function rememberOpened(userId: string, documentKey: string) {
  const current = read(userId);
  write(userId, {
    ...current,
    opened: pushRecent(current.opened, documentKey, MAX_RECENT_OPENED),
  });
}

export function forgetQuery(userId: string, query: string) {
  const current = read(userId);
  write(userId, {
    ...current,
    queries: current.queries.filter((item) => !sameQuery(item, query)),
  });
}

export function clearSearchRecents(userId: string) {
  write(userId, { queries: [], opened: [] });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSearchRecents(userId: string | undefined) {
  const getSnapshot = useCallback(
    () => (userId ? read(userId) : EMPTY),
    [userId],
  );
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
