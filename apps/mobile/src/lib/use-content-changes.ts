import { useMemo } from "react";

import { SYNC_NOTICE_MAX_AGE_MS } from "../sync/notices";
import { useSyncNotices } from "../sync/hooks";
import { authClient } from "./auth-client";
import {
  courseContentChanges,
  type ContentSeen,
  type CourseContentChanges,
} from "./content-changes";
import { createUserRecordStore } from "./user-json-store";

function isSeen(value: unknown): value is ContentSeen {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as Record<string, unknown>).seenAt === "number"
  );
}

/**
 * When each activity was last opened on this device. Notices older than 30
 * days are dropped, so older records are dropped with every write.
 */
const store = createUserRecordStore("hakgyo:content-seen:v1", isSeen);

/** Records that the learner opened an activity, clearing its mark. */
export function markContentSeen(
  userId: string,
  courseItemId: string,
  now = Date.now(),
) {
  store.update(userId, (records) => {
    const next: Record<string, ContentSeen> = {};
    for (const [id, record] of Object.entries(records)) {
      if (now - record.seenAt < SYNC_NOTICE_MAX_AGE_MS) next[id] = record;
    }
    next[courseItemId] = { seenAt: now };
    return next;
  });
}

/** The changed chapters and activities of a course, following changes. */
export function useCourseContentChanges(
  courseId: string,
  outline: Parameters<typeof courseContentChanges>[2],
): CourseContentChanges {
  const { data: session } = authClient.useSession();
  const seen = store.useRecords(session?.user.id);
  // Every organization: the course's own notices are picked out below.
  const { notices } = useSyncNotices();
  return useMemo(
    () => courseContentChanges(notices, courseId, outline, seen),
    [courseId, notices, outline, seen],
  );
}
