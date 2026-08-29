import type { Prisma } from "../../../generated/prisma/client";

import {
  calculateStreak,
  DEFAULT_ACHIEVEMENT_RULES,
  findNewAchievements,
  getLocalDateKey,
  getRewardForAction,
  type GamificationAction,
} from "./logic";

type RecordActivityInput = {
  action: GamificationAction;
  idempotencyKey: string;
  metadata?: Prisma.InputJsonValue;
  occurredAt?: Date;
  userId: string;
};

export async function recordGamificationActivity(
  tx: Prisma.TransactionClient,
  input: RecordActivityInput,
) {
  const occurredAt = input.occurredAt ?? new Date();
  const existingSummary = await tx.userGamification.findUnique({
    where: { userId: input.userId },
    select: { timeZone: true },
  });
  const timeZone = existingSummary?.timeZone ?? "UTC";
  const reward = getRewardForAction(input.action);
  const activityDateKey = getLocalDateKey(occurredAt, timeZone);
  const activityDate = new Date(`${activityDateKey}T00:00:00.000Z`);

  const inserted = await tx.userActivityEvent.createMany({
    data: [
      {
        action: input.action,
        activityDate,
        contributesToStreak: reward.contributesToStreak,
        idempotencyKey: input.idempotencyKey,
        metadata: input.metadata,
        occurredAt,
        userId: input.userId,
        xpAwarded: reward.xp,
      },
    ],
    skipDuplicates: true,
  });

  if (inserted.count === 0) {
    return { awarded: false as const };
  }

  const streakActivities = await tx.userActivityEvent.findMany({
    where: { userId: input.userId, contributesToStreak: true },
    distinct: ["activityDate"],
    select: { activityDate: true },
  });
  const streak = calculateStreak(
    streakActivities.map((activity) => activity.activityDate),
    { now: occurredAt, timeZone: "UTC" },
  );

  const summary = await tx.userGamification.upsert({
    where: { userId: input.userId },
    create: {
      completedActivities: 1,
      currentStreak: streak.currentStreak,
      lastActivityDate: activityDate,
      longestStreak: streak.longestStreak,
      timeZone,
      totalXp: reward.xp,
      userId: input.userId,
    },
    update: {
      completedActivities: { increment: 1 },
      currentStreak: streak.currentStreak,
      lastActivityDate: activityDate,
      longestStreak: streak.longestStreak,
      totalXp: { increment: reward.xp },
    },
    select: {
      completedActivities: true,
      currentStreak: true,
      longestStreak: true,
      totalXp: true,
    },
  });

  const earnedAchievements = await tx.userAchievement.findMany({
    where: { userId: input.userId },
    select: { code: true },
  });
  const newAchievementCodes = findNewAchievements(
    summary,
    DEFAULT_ACHIEVEMENT_RULES,
    new Set(earnedAchievements.map((achievement) => achievement.code)),
  );

  if (newAchievementCodes.length > 0) {
    await tx.userAchievement.createMany({
      data: newAchievementCodes.map((code) => ({ code, userId: input.userId })),
      skipDuplicates: true,
    });
  }

  return {
    awarded: true as const,
    newAchievementCodes,
    summary,
    xpAwarded: reward.xp,
  };
}
