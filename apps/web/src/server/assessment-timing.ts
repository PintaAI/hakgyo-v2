export function getAssessmentDeadline(
  startedAt: Date,
  timeLimitMinutes: number | null,
): Date | null {
  if (timeLimitMinutes === null) return null;
  return new Date(startedAt.getTime() + timeLimitMinutes * 60_000);
}

/** The deadline is exclusive: a save at the exact deadline is late. */
export function isAssessmentExpired(
  startedAt: Date,
  timeLimitMinutes: number | null,
  now: Date,
): boolean {
  const deadline = getAssessmentDeadline(startedAt, timeLimitMinutes);
  return deadline !== null && now.getTime() >= deadline.getTime();
}
