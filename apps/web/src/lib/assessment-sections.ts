import { sectionedAttemptDeadline, type TimelineSection } from "@hakgyo/shared";

/** Minutes an attempt of timed sections can take (sections plus intros), or null. */
export function sectionedDurationMinutes(sections: readonly TimelineSection[]) {
  const deadline = sectionedAttemptDeadline(sections, new Date(0));
  return deadline ? Math.ceil(deadline.getTime() / 60_000) : null;
}
