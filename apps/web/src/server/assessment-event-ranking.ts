export type RankableAssessmentEventAttempt = {
  id: string;
  userId: string;
  name: string;
  score: number | null;
  maxScore: number | null;
  startedAt: Date;
  submittedAt: Date | null;
  invalidatedAt: Date | null;
};

export type AssessmentEventLeaderboardEntry = {
  rank: number;
  attemptId: string;
  userId: string;
  name: string;
  score: number;
  maxScore: number;
  percentage: number;
  completionTimeMs: number;
  submittedAt: Date;
};

export function rankAssessmentEventAttempts(
  attempts: RankableAssessmentEventAttempt[],
): AssessmentEventLeaderboardEntry[] {
  return attempts
    .filter(
      (
        attempt,
      ): attempt is RankableAssessmentEventAttempt & {
        score: number;
        maxScore: number;
        submittedAt: Date;
      } =>
        attempt.invalidatedAt === null &&
        attempt.score !== null &&
        attempt.maxScore !== null &&
        attempt.submittedAt !== null,
    )
    .map((attempt) => ({
      attemptId: attempt.id,
      userId: attempt.userId,
      name: attempt.name,
      score: attempt.score,
      maxScore: attempt.maxScore,
      percentage:
        attempt.maxScore > 0
          ? Math.round((attempt.score / attempt.maxScore) * 100)
          : 0,
      completionTimeMs: Math.max(
        0,
        attempt.submittedAt.getTime() - attempt.startedAt.getTime(),
      ),
      submittedAt: attempt.submittedAt,
    }))
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.completionTimeMs - right.completionTimeMs ||
        left.submittedAt.getTime() - right.submittedAt.getTime() ||
        left.userId.localeCompare(right.userId),
    )
    .map((attempt, index) => ({ rank: index + 1, ...attempt }));
}
