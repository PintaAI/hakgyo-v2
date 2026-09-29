/**
 * Where a tapped push should take the learner. `data` is the payload the
 * server's Expo sender attaches (`notificationId`, `path`, `mobilePath`).
 */
export type NotificationTarget =
  | { kind: "none"; notificationId?: string }
  | { kind: "cohort"; notificationId?: string; cohortId: string }
  | { kind: "route"; notificationId?: string; path: string };

export function getNotificationTarget(data: unknown): NotificationTarget {
  const record =
    data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const notificationId =
    typeof record.notificationId === "string"
      ? record.notificationId
      : undefined;
  const path = record.mobilePath;
  // Only in-app absolute routes; "/" would just reopen the current screen.
  if (
    typeof path !== "string" ||
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path === "/"
  ) {
    return { kind: "none", notificationId };
  }
  // Meetings open the Belajar tab on their cohort, like the sidebar does.
  const cohort = /^\/learn\?cohortId=([^&#]+)$/.exec(path);
  if (cohort?.[1]) {
    return {
      kind: "cohort",
      notificationId,
      cohortId: decodeURIComponent(cohort[1]),
    };
  }
  return { kind: "route", notificationId, path };
}

/** Entity ids the server attaches to a push (see `triggers.ts`). */
export type PushedEntity = {
  eventId?: string;
  meetingId?: string;
  attemptId?: string;
  cohortId?: string;
  courseId?: string;
};

export function getPushedEntity(data: unknown): PushedEntity {
  const record =
    data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const read = (key: keyof PushedEntity) =>
    typeof record[key] === "string" ? record[key] : undefined;
  return {
    eventId: read("eventId"),
    meetingId: read("meetingId"),
    attemptId: read("attemptId"),
    cohortId: read("cohortId"),
    courseId: read("courseId"),
  };
}

type NoticeLike =
  | { id: string; kind: "COURSE_ADDED"; courseId: string }
  | { id: string; kind: "COHORT_ADDED"; cohortId: string }
  | { id: string; kind: `MEETING_${string}`; meetingId: string }
  | { id: string; kind: `EVENT_${string}`; eventId: string }
  | { id: string; kind: "ATTEMPT_GRADED"; attemptId: string }
  | { id: string; kind: string };

/**
 * Pembaruan notices about the same change as a tapped push, so opening the
 * push also clears them. Cohort/course ids only identify enrollment pushes;
 * meeting pushes carry a cohort id too but must not clear "added" notices.
 */
export function matchingNoticeIds(
  notices: readonly NoticeLike[],
  entity: PushedEntity,
): string[] {
  const isEnrollment =
    !entity.eventId && !entity.meetingId && !entity.attemptId;
  return notices
    .filter((notice) => {
      if ("eventId" in notice) return notice.eventId === entity.eventId;
      if ("meetingId" in notice) return notice.meetingId === entity.meetingId;
      if ("attemptId" in notice) return notice.attemptId === entity.attemptId;
      if (!isEnrollment) return false;
      if ("cohortId" in notice) return notice.cohortId === entity.cohortId;
      if ("courseId" in notice && notice.kind === "COURSE_ADDED") {
        return notice.courseId === entity.courseId;
      }
      return false;
    })
    .map((notice) => notice.id);
}

/** Unread sidebar indicators for the pushed event or meeting. */
export function matchingIndicatorKeys(
  items: ReadonlyArray<{
    key: string;
    kind: string;
    entityId: string;
    unread: boolean;
  }>,
  entity: PushedEntity,
): string[] {
  return items
    .filter(
      (item) =>
        item.unread &&
        ((item.kind === "ASSESSMENT" && item.entityId === entity.eventId) ||
          (item.kind === "MEETING" && item.entityId === entity.meetingId)),
    )
    .map((item) => item.key);
}
