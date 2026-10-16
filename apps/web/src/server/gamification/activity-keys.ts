/**
 * Idempotency keys of `UserActivityEvent` rows. Each key names the learner work it rewards, so a
 * replayed or repeated request cannot award the same activity twice, and deleting that work can
 * find its activity rows again (`src/server/content/resource-deletion.ts`).
 */

/** Completing a material or vocabulary placement: once per learner and course item. */
export function contentCompletedActivityKey(
  userId: string,
  courseItemId: string,
) {
  return `content-completed:${userId}:${courseItemId}`;
}

/** Submitting an assessment attempt (standalone or event): once per attempt. */
export function assessmentSubmittedActivityKey(attemptId: string) {
  return `assessment-submitted:${attemptId}`;
}

/**
 * Passing a standalone assessment: once per learner and course item, so retaking an assessment
 * that was already passed cannot earn the reward again.
 */
export function assessmentPassedActivityKey(
  userId: string,
  courseItemId: string,
) {
  return `assessment-passed:${userId}:${courseItemId}`;
}

/**
 * Activity keys of learner work being deleted. Completion and pass events are recorded together
 * with the learner's COMPLETED progress row, and progress is only removed together with its item,
 * so the item's progress rows name every completion and pass key. Submission events are keyed by
 * their attempt. Not every key has a row (a material has no pass, unfinished work no completion).
 */
export function deletedWorkActivityKeys(input: {
  progress: ReadonlyArray<{ courseItemId: string; userId: string }>;
  attemptIds: readonly string[];
}) {
  return [
    ...input.progress.flatMap(({ courseItemId, userId }) => [
      contentCompletedActivityKey(userId, courseItemId),
      assessmentPassedActivityKey(userId, courseItemId),
    ]),
    ...input.attemptIds.map(assessmentSubmittedActivityKey),
  ];
}
