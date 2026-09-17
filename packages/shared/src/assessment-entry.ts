export type AssessmentAttemptStatus =
  "IN_PROGRESS" | "SUBMITTED" | "IN_REVIEW" | "GRADED";

export type AssessmentLearnerState = "NOT_STARTED" | AssessmentAttemptStatus;

export type AssessmentEntryDecision = {
  state: AssessmentLearnerState;
  destination: "DETAIL" | "ATTEMPT";
  canStart: boolean;
  canReattempt: boolean;
};

export function resolveAssessmentEntry({
  attemptStatus,
  attemptsUsed,
  maxAttempts,
  available,
  invalidated = false,
}: {
  attemptStatus?: AssessmentAttemptStatus | null;
  attemptsUsed: number;
  maxAttempts: number | null;
  available: boolean;
  invalidated?: boolean;
}): AssessmentEntryDecision {
  const state = attemptStatus ?? "NOT_STARTED";
  const hasAttemptsRemaining =
    maxAttempts === null || attemptsUsed < maxAttempts;
  const canCreateAttempt = available && !invalidated && hasAttemptsRemaining;

  if (state === "IN_PROGRESS" && !invalidated) {
    return {
      state,
      destination: "ATTEMPT",
      canStart: false,
      canReattempt: false,
    };
  }

  return {
    state,
    destination: "DETAIL",
    canStart: state === "NOT_STARTED" && canCreateAttempt,
    canReattempt: state !== "NOT_STARTED" && canCreateAttempt,
  };
}
