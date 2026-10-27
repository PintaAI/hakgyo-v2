export function getAssessmentDeadline(
  startedAt: Date,
  timeLimitMinutes: number | null,
  eventClosesAt?: Date | null,
): Date | null {
  const attemptDeadline =
    timeLimitMinutes === null
      ? null
      : new Date(startedAt.getTime() + timeLimitMinutes * 60_000);
  if (!eventClosesAt) return attemptDeadline;
  if (!attemptDeadline) return eventClosesAt;
  return attemptDeadline < eventClosesAt ? attemptDeadline : eventClosesAt;
}

/** When an event stops taking answers: its planned close, or an earlier manual close. */
export function eventCloseTime(event: {
  closesAt: Date | null;
  closedAt?: Date | null;
}) {
  if (!event.closedAt) return event.closesAt;
  if (!event.closesAt) return event.closedAt;
  return event.closedAt < event.closesAt ? event.closedAt : event.closesAt;
}

/** The deadline is exclusive: a save at the exact deadline is late. */
export function isAssessmentExpired(
  startedAt: Date,
  timeLimitMinutes: number | null,
  now: Date,
  eventClosesAt?: Date | null,
): boolean {
  const deadline = getAssessmentDeadline(
    startedAt,
    timeLimitMinutes,
    eventClosesAt,
  );
  return deadline !== null && now.getTime() >= deadline.getTime();
}
