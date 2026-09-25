import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  calculateStreak,
  getLocalCalendarWindow,
} from "~/server/gamification/logic";
import { hasPassedAssessment } from "~/server/learning/sequential-access";

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
      streakActivities,
      weeklyActivities,
      vocabularyMastered,
      assessmentAttempts,
      progressedModules,
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
        ctx.db.userActivityEvent.findMany({
          where: { userId: ctx.actorUserId, contributesToStreak: true },
          distinct: ["activityDate"],
          select: { activityDate: true },
        }),
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
        ctx.db.courseModule.findMany({
          where: {
            items: {
              some: {
                isPublished: true,
                OR: [
                  {
                    progress: {
                      some: {
                        userId: ctx.actorUserId,
                        status: "COMPLETED",
                      },
                    },
                  },
                  {
                    assessment: {
                      attempts: {
                        some: {
                          userId: ctx.actorUserId,
                          status: "GRADED",
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
          select: {
            items: {
              where: { isPublished: true },
              select: {
                type: true,
                progress: {
                  where: {
                    userId: ctx.actorUserId,
                    status: "COMPLETED",
                  },
                  select: { id: true },
                  take: 1,
                },
                assessment: {
                  select: {
                    passingScore: true,
                    attempts: {
                      where: {
                        userId: ctx.actorUserId,
                        status: "GRADED",
                      },
                      select: { status: true, score: true, maxScore: true },
                    },
                  },
                },
              },
            },
          },
        }),
      ]);

    const currentStreak = calculateStreak(
      streakActivities.map((activity) => activity.activityDate),
      {
        now: new Date(`${calendar.today}T12:00:00.000Z`),
        timeZone: "UTC",
      },
    ).currentStreak;
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
    const modulesMastered = progressedModules.filter(
      (module) =>
        module.items.length > 0 &&
        module.items.every((item) =>
          item.type === "ASSESSMENT"
            ? Boolean(
                item.assessment &&
                  hasPassedAssessment(
                    item.assessment.attempts,
                    item.assessment.passingScore,
                  ),
              )
            : item.progress.length > 0,
        ),
    ).length;

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
