export type RankableAssessmentEventAttempt = {
  id: string;
  userId: string;
  name: string;
  score: number | null;
  maxScore: number | null;
  startedAt: Date;
  submittedAt: Date | null;
  invalidatedAt: Date | null;
  status: string;
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

/**
 * Ordinal (code unit) comparison so the final tie-break matches the SQL leaderboard, which orders
 * user ids with `COLLATE "C"` (see `~/server/assessment-event-leaderboard`).
 */
export function compareUserIds(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function rankAssessmentEventAttempts(
  attempts: RankableAssessmentEventAttempt[],
): AssessmentEventLeaderboardEntry[] {
  const rankedAttempts = attempts
    .filter(
      (
        attempt,
      ): attempt is RankableAssessmentEventAttempt & {
        score: number;
        maxScore: number;
        submittedAt: Date;
      } =>
        attempt.status === "GRADED" &&
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
        compareUserIds(left.userId, right.userId),
    );

  const bestByUser = new Map<string, (typeof rankedAttempts)[number]>();
  for (const attempt of rankedAttempts) {
    if (!bestByUser.has(attempt.userId)) {
      bestByUser.set(attempt.userId, attempt);
    }
  }

  return [...bestByUser.values()]
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.completionTimeMs - right.completionTimeMs ||
        left.submittedAt.getTime() - right.submittedAt.getTime() ||
        compareUserIds(left.userId, right.userId),
    )
    .map((attempt, index) => ({ rank: index + 1, ...attempt }));
}
