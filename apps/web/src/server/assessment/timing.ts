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
