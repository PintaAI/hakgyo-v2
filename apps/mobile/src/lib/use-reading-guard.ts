import { useIsFocused } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

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

/**
 * The reading guard of an open material: counts the seconds the screen is
 * in front of the learner (focused, app in the foreground) up to `required`,
 * continuing from earlier visits. Inactive (a finished material) it is
 * always unlocked.
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
  const focused = useIsFocused();
  const [foreground, setForeground] = useState(
    AppState.currentState === "active",
  );
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) =>
      setForeground(state === "active"),
    );
    return () => subscription.remove();
  }, []);

  const [spent, setSpent] = useState(() =>
    userId ? readSpentSeconds(userId, courseItemId) : 0,
  );
  // The session may load after the first render: pick up earlier visits.
  useEffect(() => {
    if (!userId) return;
    const saved = readSpentSeconds(userId, courseItemId);
    setSpent((current) => Math.max(current, saved));
  }, [courseItemId, userId]);
  const spentRef = useRef(spent);
  spentRef.current = spent;
  const counting =
    active &&
    Boolean(userId) &&
    focused &&
    foreground &&
    spent < requiredSeconds;

  useEffect(() => {
    if (!counting) return;
    const timer = setInterval(() => setSpent((current) => current + 1), 1000);
    return () => clearInterval(timer);
  }, [counting]);

  // Saved now and then, and when the count stops (left, backgrounded,
  // unlocked), so a crash loses at most a few seconds.
  useEffect(() => {
    if (!userId || !active) return;
    if (!counting || spent % SAVE_EVERY_SECONDS === 0)
      saveSpentSeconds(userId, courseItemId, spentRef.current);
  }, [active, counting, courseItemId, spent, userId]);

  const locked = active && spent < requiredSeconds;
  return {
    locked,
    remaining: locked ? requiredSeconds - spent : 0,
    required: requiredSeconds,
  };
}
