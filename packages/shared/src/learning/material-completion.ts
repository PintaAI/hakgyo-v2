import { reachesPercent } from "../assessment-score";

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
    return reachesPercent(attempt.score, attempt.maxScore, requiredScore);
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
