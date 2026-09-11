import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { calculateStreak } from "~/server/gamification/logic";

export const gamificationRouter = createTRPCRouter({
  getMySummary: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const weekStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    weekStart.setUTCDate(
      weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7),
    );
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
    const [
      summary,
      achievements,
      recentActivity,
      streakActivities,
      weeklyActivities,
    ] = await Promise.all([
      ctx.db.userGamification.findUnique({
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
      }),
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
          activityDate: { gte: weekStart, lt: weekEnd },
        },
        select: {
          activityDate: true,
          contributesToStreak: true,
          xpAwarded: true,
        },
      }),
    ]);

    const currentStreak = calculateStreak(
      streakActivities.map((activity) => activity.activityDate),
      { now, timeZone: "UTC" },
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

    return {
      achievements,
      recentActivity,
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
        startsOn: weekStart.toISOString().slice(0, 10),
        today: now.toISOString().slice(0, 10),
        xp: weeklyXp,
      },
    };
  }),
});
