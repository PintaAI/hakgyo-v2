import type { Prisma } from "../../../generated/prisma/client";

import {
  DEFAULT_ACHIEVEMENT_RULES,
  findNewAchievements,
  getLocalDateKey,
  getRewardForAction,
  summarizeStreakRuns,
  type GamificationAction,
} from "./logic";
import { loadStreakRuns } from "./streak";

type RecordActivityInput = {
  action: GamificationAction;
  idempotencyKey: string;
  metadata?: Prisma.InputJsonValue;
  organizationId: string;
  occurredAt?: Date;
  timeZone?: string;
  userId: string;
};

type RecordActivitiesInput = {
  action: GamificationAction;
  activities: Array<{
    idempotencyKey: string;
    metadata?: Prisma.InputJsonValue;
    organizationId: string;
  }>;
  occurredAt?: Date;
  timeZone?: string;
  userId: string;
};

export function recordGamificationActivity(
  tx: Prisma.TransactionClient,
  {
    action,
    idempotencyKey,
    metadata,
    organizationId,
    ...input
  }: RecordActivityInput,
) {
  return recordGamificationActivities(tx, {
    ...input,
    action,
    activities: [{ idempotencyKey, metadata, organizationId }],
  });
}

/**
 * Records several activities of one action at the same moment, each with its own idempotency key,
 * and updates the summary once. Equivalent to one `recordGamificationActivity` call per activity:
 * every activity lands on the same day, so the streak is the same after each of them, and
 * achievements only depend on monotonic totals.
 */
export async function recordGamificationActivities(
  tx: Prisma.TransactionClient,
  input: RecordActivitiesInput,
) {
  if (input.activities.length === 0) return { awarded: false as const };
  const occurredAt = input.occurredAt ?? new Date();
  const timeZone =
    input.timeZone ??
    (
      await tx.userGamification.findUnique({
        where: { userId: input.userId },
        select: { timeZone: true },
      })
    )?.timeZone ??
    "UTC";
  const reward = getRewardForAction(input.action);
  const activityDateKey = getLocalDateKey(occurredAt, timeZone);
  const activityDate = new Date(`${activityDateKey}T00:00:00.000Z`);

  const inserted = await tx.userActivityEvent.createMany({
    data: input.activities.map((activity) => ({
      action: input.action,
      activityDate,
      contributesToStreak: reward.contributesToStreak,
      idempotencyKey: activity.idempotencyKey,
      metadata: activity.metadata,
      organizationId: activity.organizationId,
      occurredAt,
      userId: input.userId,
      xpAwarded: reward.xp,
    })),
    skipDuplicates: true,
  });

  if (inserted.count === 0) {
    return { awarded: false as const };
  }

  const [streakRuns, earnedAchievements] = await Promise.all([
    loadStreakRuns(tx, input.userId),
    tx.userAchievement.findMany({
      where: { userId: input.userId },
      select: { code: true },
    }),
  ]);
  const streak = summarizeStreakRuns(streakRuns, activityDateKey);
  const xpAwarded = reward.xp * inserted.count;

  const summary = await tx.userGamification.upsert({
    where: { userId: input.userId },
    create: {
      completedActivities: inserted.count,
      currentStreak: streak.currentStreak,
      lastActivityDate: activityDate,
      longestStreak: streak.longestStreak,
      timeZone,
      totalXp: xpAwarded,
      userId: input.userId,
    },
    update: {
      completedActivities: { increment: inserted.count },
      currentStreak: streak.currentStreak,
      lastActivityDate: activityDate,
      longestStreak: streak.longestStreak,
      timeZone,
      totalXp: { increment: xpAwarded },
    },
    select: {
      completedActivities: true,
      currentStreak: true,
      longestStreak: true,
      totalXp: true,
    },
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
    xpAwarded,
  };
}
