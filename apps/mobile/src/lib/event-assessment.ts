/**
 * The assessment an event runs. Events carry it at the top level, also when
 * it comes from the organization's library (no course item). Learner indexes
 * and event details cached before that field existed only have it under the
 * course item, so those are read as a fallback until the next refresh.
 */
export function eventAssessment<A>(event: {
  assessment?: A | null;
  courseItem?: { assessment?: A | null } | null;
}): A | null {
  return event.assessment ?? event.courseItem?.assessment ?? null;
}

/** How many questions the event's assessment has, when the payload counts them. */
export function eventQuestionCount(
  assessment: { id: string; _count?: { questions: number } } | null | undefined,
): number | null {
  return assessment?._count?.questions ?? null;
}
