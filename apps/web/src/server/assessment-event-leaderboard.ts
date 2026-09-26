import { Prisma } from "../../generated/prisma/client";
import type { AssessmentEventLeaderboardEntry } from "~/server/assessment-event-ranking";

type Db = Prisma.TransactionClient | Prisma.DefaultPrismaClient;

type LeaderboardRow = {
  attemptId: string;
  userId: string;
  name: string;
  score: number;
  maxScore: number;
  startedAt: Date;
  submittedAt: Date;
  rank: bigint | number;
};

/**
 * SQL counterpart of `rankAssessmentEventAttempts`: each learner's best valid GRADED attempt,
 * ranked by score desc, completion time asc, submission time asc, then userId (ordinal, matching
 * `compareUserIds`). Returns the top `limit` entries plus, when `userId` is given, that learner's
 * own entry even if it falls outside the top.
 */
export function buildAssessmentEventLeaderboardQuery(input: {
  eventId: string;
  limit: number;
  userId?: string | null;
}) {
  return Prisma.sql`
    WITH best AS (
      SELECT DISTINCT ON (attempt."userId")
        attempt."id" AS "attemptId",
        attempt."userId",
        attempt."score",
        attempt."maxScore",
        attempt."startedAt",
        attempt."submittedAt",
        GREATEST(attempt."submittedAt" - attempt."startedAt", INTERVAL '0') AS "completionTime"
      FROM "AssessmentAttempt" AS attempt
      LEFT JOIN "AssessmentEventParticipant" AS participant
        ON participant."eventId" = attempt."assessmentEventId"
        AND participant."userId" = attempt."userId"
      WHERE attempt."assessmentEventId" = ${input.eventId}
        AND attempt."status" = 'GRADED'
        AND attempt."score" IS NOT NULL
        AND attempt."maxScore" IS NOT NULL
        AND attempt."submittedAt" IS NOT NULL
        AND participant."invalidatedAt" IS NULL
      ORDER BY
        attempt."userId",
        attempt."score" DESC,
        "completionTime" ASC,
        attempt."submittedAt" ASC,
        attempt."attemptNumber" ASC
    ),
    ranked AS (
      SELECT
        best.*,
        ROW_NUMBER() OVER (
          ORDER BY
            best."score" DESC,
            best."completionTime" ASC,
            best."submittedAt" ASC,
            best."userId" COLLATE "C" ASC
        ) AS "rank"
      FROM best
    )
    SELECT
      ranked."attemptId",
      ranked."userId",
      learner."name",
      ranked."score",
      ranked."maxScore",
      ranked."startedAt",
      ranked."submittedAt",
      ranked."rank"
    FROM ranked
    JOIN "user" AS learner ON learner."id" = ranked."userId"
    WHERE ranked."rank" <= ${input.limit}::int
      OR ranked."userId" = ${input.userId ?? null}::text
    ORDER BY ranked."rank" ASC
  `;
}

export async function getAssessmentEventLeaderboard(
  db: Db,
  input: { eventId: string; limit: number; userId?: string | null },
): Promise<AssessmentEventLeaderboardEntry[]> {
  const rows = await db.$queryRaw<LeaderboardRow[]>(
    buildAssessmentEventLeaderboardQuery(input),
  );
  return rows.map((row) => {
    const startedAt = new Date(row.startedAt);
    const submittedAt = new Date(row.submittedAt);
    const score = Number(row.score);
    const maxScore = Number(row.maxScore);
    return {
      rank: Number(row.rank),
      attemptId: row.attemptId,
      userId: row.userId,
      name: row.name,
      score,
      maxScore,
      percentage: maxScore > 0 ? Math.round((score / maxScore) * 100) : 0,
      completionTimeMs: Math.max(
        0,
        submittedAt.getTime() - startedAt.getTime(),
      ),
      submittedAt,
    };
  });
}

/** Status of each participant's latest attempt, keyed by status. */
export async function countLatestAssessmentEventAttemptStatuses(
  db: Db,
  eventId: string,
) {
  const rows = await db.$queryRaw<Array<{ status: string; count: number }>>`
    SELECT latest."status"::text AS "status", COUNT(*)::int AS "count"
    FROM (
      SELECT DISTINCT ON (attempt."userId") attempt."status"
      FROM "AssessmentAttempt" AS attempt
      WHERE attempt."assessmentEventId" = ${eventId}
      ORDER BY attempt."userId", attempt."attemptNumber" DESC
    ) AS latest
    GROUP BY latest."status"
  `;
  return new Map(rows.map((row) => [row.status, Number(row.count)]));
}
