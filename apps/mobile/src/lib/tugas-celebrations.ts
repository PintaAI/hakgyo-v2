import { useIsFocused } from "expo-router";
import { useEffect } from "react";

import { createUserRecordStore } from "./user-json-store";

/**
 * The passed attempt last celebrated for each tugas or event, kept on this
 * device per account, so the confetti plays once per passing attempt rather
 * than on every visit.
 */
const store = createUserRecordStore(
  "hakgyo:tugas-celebrated:v1",
  (value): value is string => typeof value === "string",
);

/**
 * Whether to play the confetti for a passed attempt now: the screen is in
 * front of the learner and this attempt was not celebrated before. Marks it
 * celebrated as soon as it plays. `key` names the tugas (its course item id)
 * or the event (`event:<id>`).
 */
export function useCelebration({
  userId,
  key,
  attemptId,
  passed,
}: {
  userId: string | undefined;
  key: string;
  attemptId: string | undefined;
  passed: boolean;
}) {
  const focused = useIsFocused();
  const celebrated = store.useRecords(userId);
  const celebrate = Boolean(
    focused && userId && attemptId && passed && celebrated[key] !== attemptId,
  );
  const celebratedAttemptId = celebrate ? attemptId : undefined;
  useEffect(() => {
    if (userId && celebratedAttemptId)
      store.set(userId, key, celebratedAttemptId);
  }, [celebratedAttemptId, key, userId]);
  return celebrate;
}
