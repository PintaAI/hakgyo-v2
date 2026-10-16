import type { AnalyticsRange } from "~/lib/analytics/period";
import { activityBetween, scopedEnrollments } from "./learners";
import { bestCourseAttempts } from "./performance";
import type { AnalyticsDb, AnalyticsScope } from "./scope";
import { toNumber } from "./sql";

/**
 * The few headline figures the dashboard shows, computed with the same
 * definitions as the analytics pages. Revenue is included only for viewers
 * who may see it.
 */
export async function getAnalyticsSummary(
  db: AnalyticsDb,
  input: { scope: AnalyticsScope; range: AnalyticsRange },
) {
  const { scope, range } = input;
  const [learners, scores, revenue] = await Promise.all([
    db.$queryRaw<Array<{ learners: number; active: number; previous: number }>>`
      WITH learners AS (
        SELECT DISTINCT "userId" FROM (${scopedEnrollments(scope)}) scoped
        WHERE "status" IN ('ACTIVE', 'COMPLETED')
      ),
      activity AS (
        ${activityBetween(scope.organizationId, range.previousStart, range.end)}
      )
      SELECT
        (SELECT COUNT(*) FROM learners)::int AS "learners",
        (SELECT COUNT(DISTINCT a."userId") FROM activity a JOIN learners l USING ("userId")
          WHERE a."at" >= ${range.start})::int AS "active",
        (SELECT COUNT(DISTINCT a."userId") FROM activity a JOIN learners l USING ("userId")
          WHERE a."at" < ${range.previousEnd})::int AS "previous"
    `,
    db.$queryRaw<Array<{ current: number | null; previous: number | null }>>`
      SELECT
        (SELECT AVG(b."score") FROM (${bestCourseAttempts(scope, range.start, range.end)}) b)::float8 AS "current",
        (SELECT AVG(b."score") FROM (${bestCourseAttempts(scope, range.previousStart, range.previousEnd)}) b)::float8 AS "previous"
    `,
    scope.canViewRevenue
      ? db.$queryRaw<
          Array<{ current: number | null; previous: number | null }>
        >`
          SELECT
            SUM(p."amount") FILTER (WHERE p."paidAt" >= ${range.start})::float8 AS "current",
            SUM(p."amount") FILTER (WHERE p."paidAt" < ${range.previousEnd})::float8 AS "previous"
          FROM "Payment" p
          WHERE p."organizationId" = ${scope.organizationId}
            AND p."status" = 'PAID'
            AND p."paidAt" >= ${range.previousStart}
            AND p."paidAt" < ${range.end}
        `
      : Promise.resolve(null),
  ]);

  return {
    learners: toNumber(learners[0]?.learners),
    activeLearners: {
      current: toNumber(learners[0]?.active),
      previous: toNumber(learners[0]?.previous),
    },
    averageScore: {
      current: scores[0]?.current ?? null,
      previous: scores[0]?.previous ?? null,
    },
    revenue: revenue
      ? {
          current: toNumber(revenue[0]?.current),
          previous: toNumber(revenue[0]?.previous),
        }
      : null,
  };
}

export type AnalyticsSummary = Awaited<ReturnType<typeof getAnalyticsSummary>>;
