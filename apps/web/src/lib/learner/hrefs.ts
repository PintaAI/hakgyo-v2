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

/** Where an assessment event opens: its in-progress attempt, otherwise the event page. */
export function assessmentEventHref(event: {
  id: string;
  course: { id: string };
  courseItem: { id: string };
  entry: { destination: "DETAIL" | "ATTEMPT" };
  attempts: readonly { id: string }[];
}) {
  const attempt = event.attempts[0];
  return event.entry.destination === "ATTEMPT" && attempt
    ? `/learn/${event.course.id}/items/${event.courseItem.id}/attempts/${attempt.id}`
    : `/learn/assessments/${event.id}`;
}
