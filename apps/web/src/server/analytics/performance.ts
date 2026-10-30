import { Prisma } from "../../../generated/prisma/client";
import type {
  AssessmentEventStatus,
  AssessmentEventType,
} from "../../../generated/prisma/enums";
import { fillBuckets, type AnalyticsRange } from "~/lib/analytics/period";
import { cohortFilter, type AnalyticsDb, type AnalyticsScope } from "./scope";
import { localBucket, ratio, toNumber } from "./sql";

/** Assessments need this many learners before they rank as hardest. */
const MIN_LEARNERS_FOR_RANKING = 3;

/**
 * Each learner's best GRADED attempt per course assessment, among attempts
 * graded in the window. Scores are percentages (score / maxScore); attempts
 * without points (maxScore 0) are left out. Latihan/Tryout attempts are
 * reported separately, see `bestEventAttempts`.
 */
export function bestCourseAttempts(
  scope: AnalyticsScope,
  from: Date,
  to: Date,
) {
  return Prisma.sql`
    SELECT DISTINCT ON (a."userId", a."courseItemId")
      a."userId",
      a."courseItemId",
      a."assessmentId",
      a."cohortId",
      a."gradedAt",
      a."score"::float8 / a."maxScore" AS "score"
    FROM "AssessmentAttempt" a
    WHERE a."organizationId" = ${scope.organizationId}
      AND a."status" = 'GRADED'
      AND a."assessmentEventId" IS NULL
      AND a."score" IS NOT NULL
      AND a."maxScore" > 0
      AND a."gradedAt" >= ${from} AND a."gradedAt" < ${to}
      ${cohortFilter(scope, Prisma.sql`a."cohortId"`)}
    ORDER BY a."userId", a."courseItemId", a."score"::float8 / a."maxScore" DESC, a."gradedAt" ASC
  `;
}

/**
 * Each participant's best GRADED attempt per Latihan/Tryout, ignoring
 * participants whose result was invalidated.
 */
function bestEventAttempts(scope: AnalyticsScope, from: Date, to: Date) {
  return Prisma.sql`
    SELECT DISTINCT ON (a."assessmentEventId", a."userId")
      a."assessmentEventId",
      a."userId",
      a."score"::float8 / a."maxScore" AS "score"
    FROM "AssessmentAttempt" a
    LEFT JOIN "AssessmentEventParticipant" participant
      ON participant."eventId" = a."assessmentEventId" AND participant."userId" = a."userId"
    WHERE a."organizationId" = ${scope.organizationId}
      AND a."status" = 'GRADED'
      AND a."assessmentEventId" IS NOT NULL
      AND a."score" IS NOT NULL
      AND a."maxScore" > 0
      AND a."gradedAt" >= ${from} AND a."gradedAt" < ${to}
      AND participant."invalidatedAt" IS NULL
      ${cohortFilter(scope, Prisma.sql`a."cohortId"`)}
    ORDER BY a."assessmentEventId", a."userId", a."score"::float8 / a."maxScore" DESC
  `;
}

/**
 * Learners' memberships in scope (ACTIVE or COMPLETED) with the published
 * items of the course and how many of them each learner completed. Assessment
 * items count once a graded attempt passed; Latihan/Tryout attempts never
 * complete course items.
 */
function membershipCompletion(scope: AnalyticsScope) {
  return Prisma.sql`
    WITH items AS (
      SELECT m."courseId", i."id"
      FROM "CourseItem" i
      JOIN "CourseModule" m ON m."id" = i."moduleId"
      WHERE i."organizationId" = ${scope.organizationId} AND i."isPublished" = true
    ),
    item_counts AS (
      SELECT "courseId", COUNT(*)::int AS "items" FROM items GROUP BY 1
    ),
    memberships AS (
      SELECT DISTINCT e."userId", e."cohortId", c."courseId"
      FROM "CohortEnrollment" e
      JOIN "Cohort" c ON c."id" = e."cohortId"
      WHERE c."organizationId" = ${scope.organizationId}
        AND e."status" IN ('ACTIVE', 'COMPLETED')
        ${cohortFilter(scope, Prisma.sql`e."cohortId"`)}
    )
    SELECT
      ms."userId",
      ms."cohortId",
      ms."courseId",
      ic."items",
      (
        SELECT COUNT(*)::int
        FROM "ContentProgress" progress
        JOIN items it ON it."id" = progress."courseItemId"
        WHERE progress."userId" = ms."userId"
          AND progress."status" = 'COMPLETED'
          AND it."courseId" = ms."courseId"
      ) AS "completed"
    FROM memberships ms
    JOIN item_counts ic ON ic."courseId" = ms."courseId"
  `;
}

export async function getPerformanceAnalytics(
  db: AnalyticsDb,
  input: { scope: AnalyticsScope; range: AnalyticsRange },
) {
  const { scope, range } = input;

  const [
    scores,
    series,
    hardest,
    cohorts,
    courses,
    completion,
    review,
    queue,
    events,
  ] = await Promise.all([
    db.$queryRaw<
      Array<{
        assessed: number;
        averageScore: number | null;
        passRate: number | null;
        graded: number;
        previousAssessed: number;
        previousAverageScore: number | null;
        previousPassRate: number | null;
      }>
    >`
      WITH current_best AS (${bestCourseAttempts(scope, range.start, range.end)}),
      previous_best AS (${bestCourseAttempts(scope, range.previousStart, range.previousEnd)})
      SELECT
        (SELECT COUNT(*) FROM current_best)::int AS "assessed",
        (SELECT AVG(b."score") FROM current_best b)::float8 AS "averageScore",
        (SELECT AVG(CASE WHEN b."score" * 100 + 1e-9 >= s."passingScore" THEN 1 ELSE 0 END)
          FROM current_best b JOIN "Assessment" s ON s."id" = b."assessmentId"
          WHERE s."passingScore" IS NOT NULL)::float8 AS "passRate",
        (SELECT COUNT(*) FROM "AssessmentAttempt" a
          WHERE a."organizationId" = ${scope.organizationId}
            AND a."status" = 'GRADED'
            AND a."gradedAt" >= ${range.start} AND a."gradedAt" < ${range.end}
            ${cohortFilter(scope, Prisma.sql`a."cohortId"`)})::int AS "graded",
        (SELECT COUNT(*) FROM previous_best)::int AS "previousAssessed",
        (SELECT AVG(b."score") FROM previous_best b)::float8 AS "previousAverageScore",
        (SELECT AVG(CASE WHEN b."score" * 100 + 1e-9 >= s."passingScore" THEN 1 ELSE 0 END)
          FROM previous_best b JOIN "Assessment" s ON s."id" = b."assessmentId"
          WHERE s."passingScore" IS NOT NULL)::float8 AS "previousPassRate"
    `,
    // Best attempt per learner and assessment within each bucket.
    db.$queryRaw<
      Array<{ bucket: string; averageScore: number; assessed: number }>
    >`
      WITH graded AS (
        SELECT
          ${localBucket(Prisma.sql`a."gradedAt"`, range.granularity)} AS "bucket",
          a."userId",
          a."courseItemId",
          a."score"::float8 / a."maxScore" AS "score"
        FROM "AssessmentAttempt" a
        WHERE a."organizationId" = ${scope.organizationId}
          AND a."status" = 'GRADED'
          AND a."assessmentEventId" IS NULL
          AND a."score" IS NOT NULL
          AND a."maxScore" > 0
          AND a."gradedAt" >= ${range.start} AND a."gradedAt" < ${range.end}
          ${cohortFilter(scope, Prisma.sql`a."cohortId"`)}
      ),
      best AS (
        SELECT DISTINCT ON ("bucket", "userId", "courseItemId") "bucket", "score"
        FROM graded
        ORDER BY "bucket", "userId", "courseItemId", "score" DESC
      )
      SELECT "bucket", AVG("score")::float8 AS "averageScore", COUNT(*)::int AS "assessed"
      FROM best
      GROUP BY 1
    `,
    db.$queryRaw<
      Array<{
        courseItemId: string;
        title: string;
        courseId: string;
        courseTitle: string;
        passingScore: number | null;
        learners: number;
        averageScore: number;
        passRate: number | null;
      }>
    >`
      WITH best AS (${bestCourseAttempts(scope, range.start, range.end)})
      SELECT
        b."courseItemId",
        s."title",
        course."id" AS "courseId",
        course."title" AS "courseTitle",
        s."passingScore",
        COUNT(*)::int AS "learners",
        AVG(b."score")::float8 AS "averageScore",
        CASE WHEN s."passingScore" IS NULL THEN NULL
          ELSE AVG(CASE WHEN b."score" * 100 + 1e-9 >= s."passingScore" THEN 1 ELSE 0 END)::float8
        END AS "passRate"
      FROM best b
      JOIN "Assessment" s ON s."id" = b."assessmentId"
      JOIN "CourseItem" item ON item."id" = b."courseItemId"
      JOIN "CourseModule" m ON m."id" = item."moduleId"
      JOIN "Course" course ON course."id" = m."courseId"
      GROUP BY b."courseItemId", s."id", course."id"
      HAVING COUNT(*) >= ${MIN_LEARNERS_FOR_RANKING}
      ORDER BY "averageScore" ASC, s."title" ASC
      LIMIT 6
    `,
    db.$queryRaw<
      Array<{
        cohortId: string;
        cohortName: string;
        courseTitle: string;
        learners: number;
        averageScore: number | null;
        completed: number;
        items: number;
      }>
    >`
      WITH best AS (${bestCourseAttempts(scope, range.start, range.end)}),
      scores AS (
        SELECT b."cohortId", COUNT(*)::int AS "assessed", AVG(b."score")::float8 AS "averageScore"
        FROM best b
        GROUP BY 1
      ),
      completion AS (
        SELECT mc."cohortId", COUNT(*)::int AS "learners",
          SUM(mc."completed")::int AS "completed", SUM(mc."items")::int AS "items"
        FROM (${membershipCompletion(scope)}) mc
        GROUP BY 1
      )
      SELECT
        c."id" AS "cohortId",
        c."name" AS "cohortName",
        course."title" AS "courseTitle",
        completion."learners",
        scores."averageScore",
        completion."completed",
        completion."items"
      FROM completion
      JOIN "Cohort" c ON c."id" = completion."cohortId"
      JOIN "Course" course ON course."id" = c."courseId"
      LEFT JOIN scores ON scores."cohortId" = c."id"
      ORDER BY completion."learners" DESC, c."name" ASC
    `,
    db.$queryRaw<
      Array<{
        courseId: string;
        courseTitle: string;
        learners: number;
        completed: number;
        items: number;
        finished: number;
      }>
    >`
      WITH per_learner AS (
        SELECT mc."userId", mc."courseId", MAX(mc."items") AS "items", MAX(mc."completed") AS "completed"
        FROM (${membershipCompletion(scope)}) mc
        GROUP BY 1, 2
      )
      SELECT
        course."id" AS "courseId",
        course."title" AS "courseTitle",
        COUNT(*)::int AS "learners",
        SUM(pl."completed")::int AS "completed",
        SUM(pl."items")::int AS "items",
        COUNT(*) FILTER (WHERE pl."completed" >= pl."items")::int AS "finished"
      FROM per_learner pl
      JOIN "Course" course ON course."id" = pl."courseId"
      GROUP BY course."id"
      ORDER BY "learners" DESC, course."title" ASC
      LIMIT 10
    `,
    db.$queryRaw<Array<{ completed: number | null; items: number | null }>>`
      WITH per_learner AS (
        SELECT mc."userId", mc."courseId", MAX(mc."items") AS "items", MAX(mc."completed") AS "completed"
        FROM (${membershipCompletion(scope)}) mc
        GROUP BY 1, 2
      )
      SELECT SUM("completed")::int AS "completed", SUM("items")::int AS "items" FROM per_learner
    `,
    // Attempts a teacher graded by hand (some answer has a review).
    db.$queryRaw<Array<{ reviewed: number; medianHours: number | null }>>`
      SELECT
        COUNT(*)::int AS "reviewed",
        (PERCENTILE_CONT(0.5) WITHIN GROUP (
          ORDER BY EXTRACT(EPOCH FROM a."gradedAt" - a."submittedAt")
        ) / 3600)::float8 AS "medianHours"
      FROM "AssessmentAttempt" a
      WHERE a."organizationId" = ${scope.organizationId}
        AND a."status" = 'GRADED'
        AND a."submittedAt" IS NOT NULL
        AND a."gradedAt" >= ${range.start} AND a."gradedAt" < ${range.end}
        ${cohortFilter(scope, Prisma.sql`a."cohortId"`)}
        AND EXISTS (
          SELECT 1 FROM "AssessmentAnswer" answer
          WHERE answer."attemptId" = a."id" AND answer."reviewedAt" IS NOT NULL
        )
    `,
    // A snapshot of the review queue now.
    db.$queryRaw<Array<{ waiting: number; oldestSubmittedAt: Date | null }>>`
      SELECT COUNT(*)::int AS "waiting", MIN(a."submittedAt") AS "oldestSubmittedAt"
      FROM "AssessmentAttempt" a
      WHERE a."organizationId" = ${scope.organizationId}
        AND a."status" IN ('IN_REVIEW', 'SUBMITTED')
        ${cohortFilter(scope, Prisma.sql`a."cohortId"`)}
    `,
    db.$queryRaw<
      Array<{
        eventId: string;
        title: string;
        type: AssessmentEventType;
        status: AssessmentEventStatus;
        courseId: string;
        courseTitle: string;
        openedAt: Date | null;
        participants: number;
        averageScore: number;
        topScore: number;
      }>
    >`
      WITH best AS (${bestEventAttempts(scope, range.start, range.end)})
      SELECT
        ev."id" AS "eventId",
        ev."title",
        ev."type"::text AS "type",
        ev."status"::text AS "status",
        course."id" AS "courseId",
        course."title" AS "courseTitle",
        ev."openedAt",
        COUNT(*)::int AS "participants",
        AVG(b."score")::float8 AS "averageScore",
        MAX(b."score")::float8 AS "topScore"
      FROM best b
      JOIN "AssessmentEvent" ev ON ev."id" = b."assessmentEventId"
      JOIN "Course" course ON course."id" = ev."courseId"
      GROUP BY ev."id", course."id"
      ORDER BY ev."openedAt" DESC NULLS LAST, ev."title" ASC
      LIMIT 8
    `,
  ]);

  const score = scores[0];
  const completedItems = toNumber(completion[0]?.completed);
  const possibleItems = toNumber(completion[0]?.items);
  const eventParticipants = events.reduce(
    (sum, event) => sum + toNumber(event.participants),
    0,
  );

  return {
    averageScore: {
      current: score?.averageScore ?? null,
      previous: score?.previousAverageScore ?? null,
    },
    passRate: {
      current: score?.passRate ?? null,
      previous: score?.previousPassRate ?? null,
    },
    assessed: {
      current: toNumber(score?.assessed),
      previous: toNumber(score?.previousAssessed),
    },
    graded: toNumber(score?.graded),
    completion: {
      rate: ratio(completedItems, possibleItems),
      completed: completedItems,
      items: possibleItems,
    },
    review: {
      reviewed: toNumber(review[0]?.reviewed),
      medianHours: review[0]?.medianHours ?? null,
      waiting: toNumber(queue[0]?.waiting),
      oldestSubmittedAt: queue[0]?.oldestSubmittedAt ?? null,
    },
    series: fillBuckets(range.buckets, series, (row) => ({
      averageScore: row ? row.averageScore : null,
      assessed: toNumber(row?.assessed),
    })),
    hardest: hardest.map((row) => ({
      ...row,
      learners: toNumber(row.learners),
    })),
    cohorts: cohorts
      .map((row) => ({
        cohortId: row.cohortId,
        cohortName: row.cohortName,
        courseTitle: row.courseTitle,
        learners: toNumber(row.learners),
        averageScore: row.averageScore,
        completionRate: ratio(toNumber(row.completed), toNumber(row.items)),
      }))
      .filter((row) => row.learners > 0 || row.averageScore !== null),
    courses: courses.map((row) => ({
      courseId: row.courseId,
      courseTitle: row.courseTitle,
      learners: toNumber(row.learners),
      finished: toNumber(row.finished),
      completionRate: ratio(toNumber(row.completed), toNumber(row.items)),
    })),
    events: {
      participants: eventParticipants,
      averageScore: eventParticipants
        ? events.reduce(
            (sum, event) =>
              sum + event.averageScore * toNumber(event.participants),
            0,
          ) / eventParticipants
        : null,
      items: events.map((row) => ({
        ...row,
        participants: toNumber(row.participants),
      })),
    },
  };
}

export type PerformanceAnalytics = Awaited<
  ReturnType<typeof getPerformanceAnalytics>
>;
