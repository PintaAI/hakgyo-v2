import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { calculateStreak } from "~/server/gamification/logic";

export const gamificationRouter = createTRPCRouter({
  getMySummary: protectedProcedure.query(async ({ ctx }) => {
    const [summary, achievements, recentActivity, streakActivities] =
      await Promise.all([
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
      ]);

    const currentStreak = calculateStreak(
      streakActivities.map((activity) => activity.activityDate),
      { timeZone: "UTC" },
    ).currentStreak;

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
    };
  }),
});
