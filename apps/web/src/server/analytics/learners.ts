import { Prisma } from "../../../generated/prisma/client";
import type {
  CohortStatus,
  EnrollmentSource,
} from "../../../generated/prisma/enums";
import { fillBuckets, type AnalyticsRange } from "~/lib/analytics/period";
import { cohortFilter, type AnalyticsDb, type AnalyticsScope } from "./scope";
import { localBucket, ratio, toNumber } from "./sql";

/** Learners without activity for this long count as inactive. */
export const INACTIVE_AFTER_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const enrollmentSources = [
  "OPEN",
  "INVITE",
  "PURCHASE",
  "MANUAL",
  "COHORT",
  "FOUNDATION",
] as const satisfies readonly EnrollmentSource[];

/**
 * Memberships the viewer can see, joined to their cohort. Owners and admins
 * see every cohort, including each curriculum's Kelas Mandiri.
 */
export function scopedEnrollments(scope: AnalyticsScope) {
  return Prisma.sql`
    SELECT e."userId", e."cohortId", e."status", e."source", e."enrolledAt"
    FROM "CohortEnrollment" e
    JOIN "Cohort" c ON c."id" = e."cohortId"
    WHERE c."organizationId" = ${scope.organizationId}
      ${cohortFilter(scope, Prisma.sql`e."cohortId"`)}
  `;
}

/**
 * Every recorded learner action in the organization between two instants:
 * gamification events (materials, vocabulary, assessments) plus assessment
 * attempts started or submitted. Sign-ins and page views are not recorded.
 */
export function activityBetween(organizationId: string, from: Date, to: Date) {
  return Prisma.sql`
    SELECT ua."userId", ua."occurredAt" AS "at"
    FROM "UserActivityEvent" ua
    WHERE ua."organizationId" = ${organizationId}
      AND ua."occurredAt" >= ${from} AND ua."occurredAt" < ${to}
    UNION ALL
    SELECT a."userId", a."startedAt" AS "at"
    FROM "AssessmentAttempt" a
    WHERE a."organizationId" = ${organizationId}
      AND a."startedAt" >= ${from} AND a."startedAt" < ${to}
    UNION ALL
    SELECT a."userId", a."submittedAt" AS "at"
    FROM "AssessmentAttempt" a
    WHERE a."organizationId" = ${organizationId}
      AND a."submittedAt" >= ${from} AND a."submittedAt" < ${to}
  `;
}

export async function getLearnerAnalytics(
  db: AnalyticsDb,
  input: { scope: AnalyticsScope; range: AnalyticsRange; now?: Date },
) {
  const { scope, range } = input;
  const now = input.now ?? range.end;
  const inactiveSince = new Date(now.getTime() - INACTIVE_AFTER_DAYS * DAY_MS);
  const organizationId = scope.organizationId;

  const [totals, activeSeries, enrollmentSeries, inactive, cohorts, topXp] =
    await Promise.all([
      db.$queryRaw<
        Array<{
          learners: number;
          newEnrollments: number;
          previousNewEnrollments: number;
          active: number;
          previousActive: number;
        }>
      >`
        WITH scoped AS (${scopedEnrollments(scope)}),
        learners AS (
          SELECT DISTINCT "userId" FROM scoped
          WHERE "status" IN ('ACTIVE', 'COMPLETED')
        ),
        activity AS (
          ${activityBetween(organizationId, range.previousStart, range.end)}
        )
        SELECT
          (SELECT COUNT(*) FROM learners)::int AS "learners",
          (SELECT COUNT(*) FROM scoped
            WHERE "enrolledAt" >= ${range.start} AND "enrolledAt" < ${range.end})::int AS "newEnrollments",
          (SELECT COUNT(*) FROM scoped
            WHERE "enrolledAt" >= ${range.previousStart} AND "enrolledAt" < ${range.previousEnd})::int AS "previousNewEnrollments",
          (SELECT COUNT(DISTINCT a."userId") FROM activity a JOIN learners l USING ("userId")
            WHERE a."at" >= ${range.start})::int AS "active",
          (SELECT COUNT(DISTINCT a."userId") FROM activity a JOIN learners l USING ("userId")
            WHERE a."at" < ${range.previousEnd})::int AS "previousActive"
      `,
      db.$queryRaw<Array<{ bucket: string; active: number }>>`
        WITH learners AS (
          SELECT DISTINCT "userId" FROM (${scopedEnrollments(scope)}) scoped
          WHERE "status" IN ('ACTIVE', 'COMPLETED')
        ),
        activity AS (${activityBetween(organizationId, range.start, range.end)})
        SELECT
          ${localBucket(Prisma.sql`a."at"`, range.granularity)} AS "bucket",
          COUNT(DISTINCT a."userId")::int AS "active"
        FROM activity a
        JOIN learners l USING ("userId")
        GROUP BY 1
      `,
      db.$queryRaw<
        Array<{ bucket: string; source: EnrollmentSource; enrollments: number }>
      >`
        SELECT
          ${localBucket(Prisma.sql`scoped."enrolledAt"`, range.granularity)} AS "bucket",
          scoped."source"::text AS "source",
          COUNT(*)::int AS "enrollments"
        FROM (${scopedEnrollments(scope)}) scoped
        WHERE scoped."enrolledAt" >= ${range.start} AND scoped."enrolledAt" < ${range.end}
        GROUP BY 1, 2
      `,
      // A snapshot: learners with an ACTIVE membership whose latest activity
      // (or, without any, their latest enrollment) is older than the cutoff.
      db.$queryRaw<
        Array<{
          userId: string;
          name: string;
          email: string;
          image: string | null;
          cohortId: string;
          cohortName: string;
          courseId: string;
          courseTitle: string;
          enrolledAt: Date;
          lastActiveAt: Date | null;
          total: bigint;
        }>
      >`
        WITH memberships AS (
          SELECT
            scoped."userId",
            MAX(scoped."enrolledAt") AS "enrolledAt",
            (ARRAY_AGG(scoped."cohortId" ORDER BY scoped."enrolledAt" DESC))[1] AS "cohortId"
          FROM (${scopedEnrollments(scope)}) scoped
          WHERE scoped."status" = 'ACTIVE'
          GROUP BY scoped."userId"
        ),
        latest AS (
          SELECT
            m.*,
            GREATEST(
              (SELECT MAX(ua."occurredAt") FROM "UserActivityEvent" ua
                WHERE ua."userId" = m."userId" AND ua."organizationId" = ${organizationId}),
              (SELECT MAX(a."startedAt") FROM "AssessmentAttempt" a
                WHERE a."userId" = m."userId" AND a."organizationId" = ${organizationId})
            ) AS "lastActiveAt"
          FROM memberships m
        )
        SELECT
          latest."userId",
          u."name",
          u."email",
          u."image",
          c."id" AS "cohortId",
          c."name" AS "cohortName",
          course."id" AS "courseId",
          course."title" AS "courseTitle",
          latest."enrolledAt",
          latest."lastActiveAt",
          COUNT(*) OVER () AS "total"
        FROM latest
        JOIN "user" u ON u."id" = latest."userId"
        JOIN "Cohort" c ON c."id" = latest."cohortId"
        JOIN "Course" course ON course."id" = c."courseId"
        WHERE GREATEST(latest."lastActiveAt", latest."enrolledAt") < ${inactiveSince}
          AND u."deletedAt" IS NULL
        ORDER BY COALESCE(latest."lastActiveAt", latest."enrolledAt") ASC, u."name" ASC
        LIMIT 20
      `,
      db.$queryRaw<
        Array<{
          cohortId: string;
          cohortName: string;
          status: CohortStatus;
          courseId: string;
          courseTitle: string;
          learners: number;
          active: number;
          newEnrollments: number;
        }>
      >`
        WITH scoped AS (${scopedEnrollments(scope)}),
        activity AS (
          SELECT DISTINCT "userId"
          FROM (${activityBetween(organizationId, range.start, range.end)}) a
        )
        SELECT
          c."id" AS "cohortId",
          c."name" AS "cohortName",
          c."status"::text AS "status",
          course."id" AS "courseId",
          course."title" AS "courseTitle",
          COUNT(*) FILTER (WHERE s."status" IN ('ACTIVE', 'COMPLETED'))::int AS "learners",
          COUNT(*) FILTER (
            WHERE s."status" IN ('ACTIVE', 'COMPLETED') AND act."userId" IS NOT NULL
          )::int AS "active",
          COUNT(*) FILTER (
            WHERE s."enrolledAt" >= ${range.start} AND s."enrolledAt" < ${range.end}
          )::int AS "newEnrollments"
        FROM scoped s
        JOIN "Cohort" c ON c."id" = s."cohortId"
        JOIN "Course" course ON course."id" = c."courseId"
        LEFT JOIN activity act ON act."userId" = s."userId"
        GROUP BY c."id", course."id"
        HAVING COUNT(*) FILTER (WHERE s."status" IN ('ACTIVE', 'COMPLETED')) > 0
        ORDER BY "learners" DESC, c."name" ASC
        LIMIT 12
      `,
      db.$queryRaw<
        Array<{
          userId: string;
          name: string;
          image: string | null;
          xp: number;
          activities: number;
        }>
      >`
        WITH learners AS (
          SELECT DISTINCT "userId" FROM (${scopedEnrollments(scope)}) scoped
          WHERE "status" IN ('ACTIVE', 'COMPLETED')
        )
        SELECT
          ua."userId",
          u."name",
          u."image",
          SUM(ua."xpAwarded")::int AS "xp",
          COUNT(*)::int AS "activities"
        FROM "UserActivityEvent" ua
        JOIN learners l ON l."userId" = ua."userId"
        JOIN "user" u ON u."id" = ua."userId"
        WHERE ua."organizationId" = ${organizationId}
          AND ua."occurredAt" >= ${range.start} AND ua."occurredAt" < ${range.end}
          AND u."deletedAt" IS NULL
        GROUP BY ua."userId", u."id"
        ORDER BY "xp" DESC, u."name" ASC
        LIMIT 5
      `,
    ]);

  const total = totals[0];
  const learners = toNumber(total?.learners);
  const active = toNumber(total?.active);

  const enrollmentsByBucket = new Map<
    string,
    Record<EnrollmentSource, number>
  >();
  for (const row of enrollmentSeries) {
    const counts =
      enrollmentsByBucket.get(row.bucket) ??
      (Object.fromEntries(
        enrollmentSources.map((source) => [source, 0]),
      ) as Record<EnrollmentSource, number>);
    counts[row.source] += toNumber(row.enrollments);
    enrollmentsByBucket.set(row.bucket, counts);
  }
  const activeByBucket = new Map(
    activeSeries.map((row) => [row.bucket, toNumber(row.active)]),
  );

  return {
    learners,
    newEnrollments: {
      current: toNumber(total?.newEnrollments),
      previous: toNumber(total?.previousNewEnrollments),
    },
    active: {
      current: active,
      previous: toNumber(total?.previousActive),
      rate: ratio(active, learners),
    },
    inactive: {
      days: INACTIVE_AFTER_DAYS,
      total: toNumber(inactive[0]?.total),
      learners: inactive.map(({ total: _total, ...row }) => row),
    },
    series: fillBuckets(
      range.buckets,
      range.buckets.map((bucket) => ({ bucket })),
      (row) => {
        const bucket = row?.bucket ?? "";
        const sources = enrollmentsByBucket.get(bucket);
        return {
          active: activeByBucket.get(bucket) ?? 0,
          enrollments: Object.fromEntries(
            enrollmentSources.map((source) => [source, sources?.[source] ?? 0]),
          ) as Record<EnrollmentSource, number>,
        };
      },
    ),
    cohorts: cohorts.map((row) => ({
      ...row,
      learners: toNumber(row.learners),
      active: toNumber(row.active),
      newEnrollments: toNumber(row.newEnrollments),
    })),
    topXp: topXp.map((row) => ({
      ...row,
      xp: toNumber(row.xp),
      activities: toNumber(row.activities),
    })),
  };
}

export type LearnerAnalytics = Awaited<ReturnType<typeof getLearnerAnalytics>>;
