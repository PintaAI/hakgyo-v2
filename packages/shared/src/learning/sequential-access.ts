import { reachesPercent } from "../assessment-score";
import { HANGEUL_MASTERY_COURSE_ID } from "../hangeul";

export type ModuleAccess = "LOCKED" | "AVAILABLE" | "COMPLETED";

type AssessmentAttempt = {
  maxScore: number | null;
  score: number | null;
  status: string;
};

export function hasPassedAssessment(
  attempts: AssessmentAttempt[],
  passingScore: number | null,
) {
  return attempts.some((attempt) => {
    if (
      attempt.status !== "GRADED" ||
      attempt.score === null ||
      attempt.maxScore === null ||
      attempt.maxScore <= 0
    ) {
      return false;
    }

    return (
      passingScore === null ||
      reachesPercent(attempt.score, attempt.maxScore, passingScore)
    );
  });
}

/**
 * Whether an assessment placed in a course counts as completed: a passing
 * standalone attempt, or, in Hangeul Mastery only, COMPLETED progress. The
 * onboarding Hangeul test marks every item of that course completed without
 * attempts. Elsewhere progress alone never counts, so an attempt a teacher
 * regrades below the passing score stops counting.
 */
export function isAssessmentItemCompleted(input: {
  courseId: string;
  attempts: AssessmentAttempt[];
  passingScore: number | null;
  progressCompleted: boolean;
}) {
  return (
    hasPassedAssessment(input.attempts, input.passingScore) ||
    (input.courseId === HANGEUL_MASTERY_COURSE_ID && input.progressCompleted)
  );
}

export function evaluateSequentialModules<
  T extends { items: { isCompleted: boolean }[] },
>(modules: T[]): (T & { access: ModuleAccess; isCompleted: boolean })[] {
  let previousModulesCompleted = true;

  return modules.map((module) => {
    const isCompleted =
      module.items.length > 0 && module.items.every((item) => item.isCompleted);
    const access: ModuleAccess = isCompleted
      ? "COMPLETED"
      : previousModulesCompleted
        ? "AVAILABLE"
        : "LOCKED";

    previousModulesCompleted = previousModulesCompleted && isCompleted;
    return { ...module, access, isCompleted };
  });
}

export function evaluateOpenModules<
  T extends { items: { isCompleted: boolean }[] },
>(modules: T[]): (T & { access: ModuleAccess; isCompleted: boolean })[] {
  return modules.map((module) => {
    const isCompleted =
      module.items.length > 0 && module.items.every((item) => item.isCompleted);

    return {
      ...module,
      access: isCompleted ? "COMPLETED" : "AVAILABLE",
      isCompleted,
    };
  });
}
