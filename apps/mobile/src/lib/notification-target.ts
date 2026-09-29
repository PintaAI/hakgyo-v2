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
