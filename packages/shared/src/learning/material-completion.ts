export type AssessmentRequirementEvidence = {
  status: string;
  score: number | null;
  maxScore: number | null;
};

export function passesAssessmentRequirement(
  attempts: AssessmentRequirementEvidence[],
  minimumScore: number | null,
  passingScore: number | null,
) {
  const requiredScore = minimumScore ?? passingScore;

  return attempts.some((attempt) => {
    if (attempt.status !== "GRADED") return false;
    if (requiredScore === null) return true;
    return (
      attempt.score !== null &&
      attempt.maxScore !== null &&
      attempt.maxScore > 0 &&
      (attempt.score / attempt.maxScore) * 100 >= requiredScore
    );
  });
}

export function passesRequirementPolicy(
  policy: "ALL" | "ANY",
  requirements: boolean[],
) {
  if (requirements.length === 0) return true;
  return policy === "ALL"
    ? requirements.every(Boolean)
    : requirements.some(Boolean);
}
