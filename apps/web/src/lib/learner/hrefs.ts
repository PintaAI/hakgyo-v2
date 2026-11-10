/** Where a learning item opens: its in-progress attempt, otherwise the item page. */
export function learningItemHref(
  courseId: string,
  courseItemId: string,
  attempt?: { id: string; status: string } | null,
) {
  const base = `/learn/${courseId}/items/${courseItemId}`;
  return attempt?.status === "IN_PROGRESS"
    ? `${base}/attempts/${attempt.id}`
    : base;
}

/**
 * The page of one event attempt. Events picked from the course keep the course item route;
 * events from the organization's library (no course item) use the event's own attempt route.
 */
export function assessmentEventAttemptHref(
  event: {
    id: string;
    course: { id: string };
    courseItem: { id: string } | null;
  },
  attemptId: string,
) {
  return event.courseItem
    ? `/learn/${event.course.id}/items/${event.courseItem.id}/attempts/${attemptId}`
    : `/learn/assessments/${event.id}/attempts/${attemptId}`;
}

/** Where an assessment event opens: its in-progress attempt, otherwise the event page. */
export function assessmentEventHref(event: {
  id: string;
  course: { id: string };
  courseItem: { id: string } | null;
  entry: { destination: "DETAIL" | "ATTEMPT" };
  attempts: readonly { id: string }[];
}) {
  const attempt = event.attempts[0];
  return event.entry.destination === "ATTEMPT" && attempt
    ? assessmentEventAttemptHref(event, attempt.id)
    : `/learn/assessments/${event.id}`;
}
