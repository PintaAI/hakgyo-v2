import Storage from "expo-sqlite/kv-store";
import { useCallback, useSyncExternalStore } from "react";

/**
 * A small record per course kept on this device for each account (Belajar's
 * archive choices, claimed badges), shared by every screen that reads it.
 */
export function createUserCourseStore<T>(
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

  /** Sets (or, with `undefined`, clears) the record of a course. */
  function set(userId: string, courseId: string, value: T | undefined) {
    const next = { ...read(userId) };
    if (value === undefined) delete next[courseId];
    else next[courseId] = value;
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
