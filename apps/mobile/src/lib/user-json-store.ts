import Storage from "expo-sqlite/kv-store";
import { useCallback, useSyncExternalStore } from "react";

/**
 * Small records kept on this device for each account, under an id (a course
 * for archive choices and claimed badges, a game for the last source played),
 * shared by every screen that reads them.
 */
export function createUserRecordStore<T>(
  prefix: string,
  isValue: (value: unknown) => value is T,
) {
  const empty: Readonly<Record<string, T>> = Object.freeze({});
  const cache = new Map<string, Readonly<Record<string, T>>>();
  const listeners = new Set<() => void>();
  const storageKey = (userId: string) => `${prefix}:${userId}`;

  function read(userId: string): Readonly<Record<string, T>> {
    const cached = cache.get(userId);
    if (cached) return cached;
    let records = empty;
    try {
      const raw = Storage.getItemSync(storageKey(userId));
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      if (parsed && typeof parsed === "object") {
        records = Object.fromEntries(
          Object.entries(parsed).filter(([, value]) => isValue(value)),
        );
      }
    } catch {
      // Unreadable: start empty.
    }
    cache.set(userId, records);
    return records;
  }

  /** Sets (or, with `undefined`, clears) the record under `key`. */
  function set(userId: string, key: string, value: T | undefined) {
    const next = { ...read(userId) };
    if (value === undefined) delete next[key];
    else next[key] = value;
    cache.set(userId, next);
    try {
      if (Object.keys(next).length === 0)
        Storage.removeItemSync(storageKey(userId));
      else Storage.setItemSync(storageKey(userId), JSON.stringify(next));
    } catch {
      // Kept in memory for this session; the next write tries again.
    }
    for (const listener of listeners) listener();
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  /** Every record of the account, following changes. */
  function useRecords(userId: string | undefined) {
    const getSnapshot = useCallback(
      () => (userId ? read(userId) : empty),
      [userId],
    );
    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  }

  return { set, useRecords };
}
