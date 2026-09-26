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

    const percentage = (attempt.score / attempt.maxScore) * 100;
    return passingScore === null || percentage >= passingScore;
  });
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
