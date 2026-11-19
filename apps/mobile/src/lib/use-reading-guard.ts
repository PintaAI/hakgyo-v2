import { useEffect, useState, useSyncExternalStore } from "react";

import { useScreenActive } from "./use-screen-active";
import { createUserRecordStore } from "./user-json-store";

/**
 * Time spent on materials not finished yet, kept on this device per account
 * so leaving and coming back continues the countdown. Capped: the oldest
 * materials drop out, so the record never grows with use.
 */
const MAX_REMEMBERED = 40;
const SAVE_EVERY_SECONDS = 5;
const store = createUserRecordStore(
  "hakgyo:reading-guard:v1",
  (value): value is number => typeof value === "number",
);

function readSpentSeconds(userId: string, courseItemId: string) {
  return store.get(userId, courseItemId) ?? 0;
}

/** Saves the time on a material, newest last, keeping the latest few. */
function saveSpentSeconds(
  userId: string,
  courseItemId: string,
  seconds: number,
) {
  store.update(userId, (records) => {
    const others = Object.entries(records).filter(
      ([key]) => key !== courseItemId,
    );
    const entries = [...others, [courseItemId, seconds] as const];
    return Object.fromEntries(entries.slice(-MAX_REMEMBERED));
  });
}

/** The seconds spent, readable without re-rendering whoever holds it. */
export function createSecondsStore(initial: number) {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set(next: number) {
      if (next === value) return;
      value = next;
      for (const listener of listeners) listener();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export type ReadingGuard = ReturnType<typeof useReadingGuard>;

/**
 * The reading guard of an open material: counts the seconds the screen is
 * in front of the learner (focused, app in the foreground) up to `required`,
 * continuing from earlier visits. Inactive (a finished material) it is
 * always unlocked.
 *
 * The caller re-renders only when `locked` changes; the countdown itself is
 * read with `useReadingGuardRemaining` by what shows it, so the material
 * does not re-render every second.
 */
export function useReadingGuard({
  userId,
  courseItemId,
  requiredSeconds,
  active,
}: {
  userId: string | undefined;
  courseItemId: string;
  requiredSeconds: number;
  active: boolean;
}) {
  const inFront = useScreenActive();

  const [spent] = useState(() =>
    createSecondsStore(userId ? readSpentSeconds(userId, courseItemId) : 0),
  );
  // The session may load after the first render: pick up earlier visits.
  useEffect(() => {
    if (!userId) return;
    const saved = readSpentSeconds(userId, courseItemId);
    spent.set(Math.max(spent.get(), saved));
  }, [courseItemId, spent, userId]);
  const locked = useSyncExternalStore(
    spent.subscribe,
    () => active && spent.get() < requiredSeconds,
  );
  const counting = locked && Boolean(userId) && inFront;

  // Saved now and then, and when the count stops (left, backgrounded,
  // unlocked), so a crash loses at most a few seconds.
  useEffect(() => {
    if (!userId || !active) return;
    const save = () => saveSpentSeconds(userId, courseItemId, spent.get());
    if (!counting) {
      save();
      return;
    }
    if (spent.get() % SAVE_EVERY_SECONDS === 0) save();
    const timer = setInterval(() => {
      spent.set(spent.get() + 1);
      if (spent.get() % SAVE_EVERY_SECONDS === 0) save();
    }, 1000);
    return () => clearInterval(timer);
  }, [active, counting, courseItemId, spent, userId]);

  return { locked, required: requiredSeconds, spent };
}

/** The seconds left on a reading guard, re-rendering only its caller. */
export function useReadingGuardRemaining({
  locked,
  required,
  spent,
}: ReadingGuard) {
  return useSyncExternalStore(spent.subscribe, () =>
    locked ? Math.max(0, required - spent.get()) : 0,
  );
}
