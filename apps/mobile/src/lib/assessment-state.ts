export type LearnerAttemptStatus =
  "IN_PROGRESS" | "SUBMITTED" | "IN_REVIEW" | "GRADED";

export type LearnerAssessmentEventType = "QUICK_ASSESSMENT" | "TRYOUT";

const ONE_DAY_MS = 24 * 3_600_000;

export function isStaleClosedOnDemandAssessment(
  event: {
    type?: string | null;
    status?: string | null;
    closesAt?: Date | null;
    closedAt?: Date | null;
  },
  now: number,
) {
  const closureTime = event.closedAt ?? event.closesAt;

  return (
    event.type === "QUICK_ASSESSMENT" &&
    (event.status === "CLOSED" ||
      (event.closesAt !== null &&
        event.closesAt !== undefined &&
        event.closesAt.getTime() <= now)) &&
    closureTime !== null &&
    closureTime !== undefined &&
    now - closureTime.getTime() > ONE_DAY_MS
  );
}

type AttemptResult = {
  status: LearnerAttemptStatus;
  score: number | null;
  maxScore: number | null;
};

type AttemptIdentity = {
  courseItemId: string;
  startedAt: Date;
  assessmentEvent?: unknown | null;
};

export function assessmentAttemptPresentation(attempt?: AttemptResult) {
  if (!attempt) {
    return { detail: "Open", action: "Start assessment" } as const;
  }

  if (attempt.status === "IN_PROGRESS") {
    return { detail: "In progress", action: "Resume assessment" } as const;
  }

  if (attempt.status === "IN_REVIEW") {
    return { detail: "Awaiting review", action: "View submission" } as const;
  }

  if (attempt.status === "SUBMITTED") {
    return { detail: "Submitted", action: "View submission" } as const;
  }

  const result =
    attempt.score !== null && attempt.maxScore !== null
      ? ` · ${attempt.score} / ${attempt.maxScore}`
      : "";
  return { detail: `Reviewed${result}`, action: "View result" } as const;
}

export function assessmentResultPolicy(
  eventType?: LearnerAssessmentEventType | null,
) {
  return {
    showAnswerReview: eventType !== "TRYOUT",
    showLeaderboard: eventType !== undefined && eventType !== null,
  };
}

export function assessmentTerminalResult(attempt?: AttemptResult) {
  if (!attempt || attempt.status === "IN_PROGRESS") return undefined;

  return {
    status:
      attempt.status === "GRADED"
        ? ("GRADED" as const)
        : ("IN_REVIEW" as const),
    score: attempt.score ?? 0,
    maxScore: attempt.maxScore ?? 0,
  };
}

export function canReattemptAssessment({
  attemptNumber,
  maxAttempts,
  eventType,
}: {
  attemptNumber: number;
  maxAttempts: number | null;
  eventType?: LearnerAssessmentEventType | null;
}) {
  return (
    eventType == null && (maxAttempts === null || attemptNumber < maxAttempts)
  );
}

export function latestStandaloneAttemptForItem<T extends AttemptIdentity>(
  attempts: readonly T[] | undefined,
  courseItemId: string,
) {
  return attempts
    ?.filter(
      (attempt) =>
        attempt.courseItemId === courseItemId && !attempt.assessmentEvent,
    )
    .reduce<T | undefined>((latest, attempt) => {
      if (!latest || attempt.startedAt.getTime() > latest.startedAt.getTime()) {
        return attempt;
      }
      return latest;
    }, undefined);
}
