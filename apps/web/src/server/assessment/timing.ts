import { sectionedAttemptDeadline, type TimelineSection } from "@hakgyo/shared";

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

/** Sections as the deadline sees them: only the ones with questions count. */
export type DeadlineSection = TimelineSection;

/** Prisma select of an assessment's sections for `attemptDeadline` and the section timeline. */
export const timedSectionsSelect = {
  where: { questions: { some: {} } },
  orderBy: { position: "asc" },
  select: { id: true, timeLimitSeconds: true, allowEarlyFinish: true },
} as const;

/**
 * The deadline of an attempt. With sections that all have a timer, it is the sum of their times
 * plus intro allowances (the section timeline ends each section earlier); otherwise the event's
 * duration or the assessment's time limit. An event's close (planned or early) always caps it.
 */
export function attemptDeadline(input: {
  startedAt: Date;
  timeLimitMinutes: number | null;
  event: {
    durationMinutes: number;
    closesAt: Date | null;
    closedAt?: Date | null;
  } | null;
  sections: readonly DeadlineSection[];
}) {
  const close = input.event ? eventCloseTime(input.event) : null;
  const sectioned = sectionedAttemptDeadline(input.sections, input.startedAt);
  if (sectioned) {
    return close && close < sectioned ? close : sectioned;
  }
  return getAssessmentDeadline(
    input.startedAt,
    input.event?.durationMinutes ?? input.timeLimitMinutes,
    close,
  );
}

export { sectionedDurationMinutes } from "~/lib/assessment-sections";
