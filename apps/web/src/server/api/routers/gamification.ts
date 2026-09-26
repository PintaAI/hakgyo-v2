import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  getLocalCalendarWindow,
  summarizeStreakRuns,
} from "~/server/gamification/logic";
import { loadStreakRuns } from "~/server/gamification/streak";

export const gamificationRouter = createTRPCRouter({
  getMySummary: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const summary = await ctx.db.userGamification.findUnique({
      where: { userId: ctx.actorUserId },
      select: {
        completedActivities: true,
        currentStreak: true,
        lastActivityDate: true,
        longestStreak: true,
        timeZone: true,
        totalXp: true,
        updatedAt: true,
      },
    });
    const timeZone = summary?.timeZone ?? "UTC";
    const calendar = getLocalCalendarWindow(now, timeZone);
    const [
      achievements,
      recentActivity,
      streakRuns,
      weeklyActivities,
      vocabularyMastered,
      assessmentAttempts,
      [{ count: modulesMastered }],
    ] = await Promise.all([
      ctx.db.userAchievement.findMany({
        where: { userId: ctx.actorUserId },
        orderBy: { earnedAt: "desc" },
        select: { code: true, earnedAt: true },
      }),
      ctx.db.userActivityEvent.findMany({
        where: { userId: ctx.actorUserId },
        orderBy: { occurredAt: "desc" },
        take: 20,
        select: {
          action: true,
          occurredAt: true,
          xpAwarded: true,
        },
      }),
      loadStreakRuns(ctx.db, ctx.actorUserId),
      ctx.db.userActivityEvent.findMany({
        where: {
          userId: ctx.actorUserId,
          activityDate: { gte: calendar.start, lt: calendar.end },
        },
        select: {
          activityDate: true,
          contributesToStreak: true,
          xpAwarded: true,
        },
      }),
      ctx.db.vocabularyProgress.count({
        where: { userId: ctx.actorUserId, masteredAt: { not: null } },
      }),
      ctx.db.assessmentAttempt.count({
        where: { userId: ctx.actorUserId },
      }),
      // Modules with at least one published item where every published item
      // is complete: materials/vocabulary by COMPLETED progress, assessments
      // by a passing GRADED attempt (same rule as hasPassedAssessment).
      // Only modules the learner has touched can qualify.
      ctx.db.$queryRaw<[{ count: number }]>`
        SELECT COUNT(*)::integer AS count
        FROM (
          SELECT item."moduleId"
          FROM "CourseItem" AS item
          WHERE item."isPublished" = true
            AND item."moduleId" IN (
              SELECT touched."moduleId"
              FROM "CourseItem" AS touched
              JOIN "ContentProgress" AS progress
                ON progress."courseItemId" = touched.id
              WHERE touched."isPublished" = true
                AND progress."userId" = ${ctx.actorUserId}
                AND progress.status = 'COMPLETED'
              UNION
              SELECT touched."moduleId"
              FROM "CourseItem" AS touched
              JOIN "AssessmentAttempt" AS attempt
                ON attempt."assessmentId" = touched."assessmentId"
              WHERE touched."isPublished" = true
                AND attempt."userId" = ${ctx.actorUserId}
                AND attempt.status = 'GRADED'
            )
          GROUP BY item."moduleId"
          HAVING bool_and(
            CASE
              WHEN item.type = 'ASSESSMENT' THEN EXISTS (
                SELECT 1
                FROM "AssessmentAttempt" AS attempt
                JOIN "Assessment" AS assessment
                  ON assessment.id = attempt."assessmentId"
                WHERE attempt."assessmentId" = item."assessmentId"
                  AND attempt."userId" = ${ctx.actorUserId}
                  AND attempt.status = 'GRADED'
                  AND attempt.score IS NOT NULL
                  AND attempt."maxScore" IS NOT NULL
                  AND attempt."maxScore" > 0
                  AND (
                    assessment."passingScore" IS NULL
                    OR (attempt.score::double precision / attempt."maxScore") * 100
                      >= assessment."passingScore"
                  )
              )
              ELSE EXISTS (
                SELECT 1
                FROM "ContentProgress" AS progress
                WHERE progress."courseItemId" = item.id
                  AND progress."userId" = ${ctx.actorUserId}
                  AND progress.status = 'COMPLETED'
              )
            END
          )
        ) AS mastered
      `,
    ]);

    const { currentStreak } = summarizeStreakRuns(streakRuns, calendar.today);
    const activeDates = weeklyActivities
      .filter((activity) => activity.contributesToStreak)
      .map((activity) => activity.activityDate)
      .map((date) => date.toISOString().slice(0, 10))
      .sort()
      .filter((date, index, dates) => date !== dates[index - 1]);
    const weeklyXp = weeklyActivities.reduce(
      (total, activity) => total + activity.xpAwarded,
      0,
    );
    return {
      achievements,
      recentActivity,
      profileStats: {
        assessmentAttempts,
        modulesMastered,
        totalXp: summary?.totalXp ?? 0,
        vocabularyMastered,
      },
      summary: summary
        ? { ...summary, currentStreak }
        : {
            completedActivities: 0,
            currentStreak: 0,
            lastActivityDate: null,
            longestStreak: 0,
            timeZone: "UTC",
            totalXp: 0,
            updatedAt: null,
          },
      weeklyActivity: {
        activeDates,
        startsOn: calendar.startsOn,
        today: calendar.today,
        xp: weeklyXp,
      },
    };
  }),
});
