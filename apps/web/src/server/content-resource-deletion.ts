import type { Prisma } from "../../generated/prisma/client";
import {
  calculateStreak,
  DEFAULT_ACHIEVEMENT_RULES,
  findNewAchievements,
} from "./gamification/logic";

type Transaction = Prisma.TransactionClient;

async function rebuildGamification(
  tx: Transaction,
  userIds: readonly string[],
) {
  if (userIds.length === 0) return;

  const [activities, existingSummaries] = await Promise.all([
    tx.userActivityEvent.findMany({
      where: { userId: { in: [...userIds] } },
      select: {
        activityDate: true,
        contributesToStreak: true,
        userId: true,
        xpAwarded: true,
      },
    }),
    tx.userGamification.findMany({
      where: { userId: { in: [...userIds] } },
      select: { timeZone: true, userId: true },
    }),
  ]);
  const activitiesByUser = new Map<
    string,
    (typeof activities)[number][]
  >();
  for (const activity of activities) {
    const userActivities = activitiesByUser.get(activity.userId) ?? [];
    userActivities.push(activity);
    activitiesByUser.set(activity.userId, userActivities);
  }
  const timeZones = new Map(
    existingSummaries.map((summary) => [summary.userId, summary.timeZone]),
  );
  const managedAchievementCodes = DEFAULT_ACHIEVEMENT_RULES.map(
    ({ code }) => code,
  );

  for (const userId of userIds) {
    const userActivities = activitiesByUser.get(userId) ?? [];
    const streak = calculateStreak(
      userActivities
        .filter(({ contributesToStreak }) => contributesToStreak)
        .map(({ activityDate }) => activityDate),
      { now: new Date(), timeZone: "UTC" },
    );
    const snapshot = {
      completedActivities: userActivities.length,
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      totalXp: userActivities.reduce(
        (total, activity) => total + activity.xpAwarded,
        0,
      ),
    };
    const lastActivityDate = userActivities.reduce<Date | null>(
      (latest, activity) =>
        !latest || activity.activityDate > latest
          ? activity.activityDate
          : latest,
      null,
    );

    await tx.userGamification.upsert({
      where: { userId },
      create: {
        ...snapshot,
        lastActivityDate,
        timeZone: timeZones.get(userId) ?? "UTC",
        userId,
      },
      update: { ...snapshot, lastActivityDate },
    });

    const eligibleAchievements = findNewAchievements(
      snapshot,
      DEFAULT_ACHIEVEMENT_RULES,
      new Set(),
    );
    await tx.userAchievement.deleteMany({
      where: {
        code: {
          in: managedAchievementCodes.filter(
            (code) => !eligibleAchievements.includes(code),
          ),
        },
        userId,
      },
    });
    if (eligibleAchievements.length) {
      await tx.userAchievement.createMany({
        data: eligibleAchievements.map((code) => ({ code, userId })),
        skipDuplicates: true,
      });
    }
  }
}

async function deleteCourseItemActivity(
  tx: Transaction,
  itemIds: readonly string[],
) {
  if (itemIds.length === 0) return 0;

  const activities = await tx.userActivityEvent.findMany({
    where: {
      OR: itemIds.map((courseItemId) => ({
        idempotencyKey: {
          endsWith: `:${courseItemId}`,
          startsWith: "content-completed:",
        },
      })),
    },
    select: { id: true, userId: true },
  });
  if (activities.length === 0) return 0;

  await tx.userActivityEvent.deleteMany({
    where: { id: { in: activities.map(({ id }) => id) } },
  });
  await rebuildGamification(
    tx,
    [...new Set(activities.map(({ userId }) => userId))],
  );
  return activities.length;
}

async function deleteAssessmentAttempts(
  tx: Transaction,
  attemptIds: readonly string[],
) {
  if (attemptIds.length === 0) return 0;

  const answers = await tx.assessmentAnswer.findMany({
    where: { attemptId: { in: [...attemptIds] } },
    select: { id: true },
  });
  await tx.assessmentAnswerSelection.deleteMany({
    where: { answerId: { in: answers.map(({ id }) => id) } },
  });
  await tx.assessmentAnswer.deleteMany({
    where: { attemptId: { in: [...attemptIds] } },
  });
  await tx.assessmentAttempt.deleteMany({
    where: { id: { in: [...attemptIds] } },
  });
  return attemptIds.length;
}

export async function deleteAssessmentEventWithProgress(
  tx: Transaction,
  eventId: string,
) {
  const attempts = await tx.assessmentAttempt.findMany({
    where: { assessmentEventId: eventId },
    select: { id: true },
  });
  const attemptCount = await deleteAssessmentAttempts(
    tx,
    attempts.map(({ id }) => id),
  );
  await tx.assessmentEvent.delete({ where: { id: eventId } });
  return { attempts: attemptCount };
}

export async function deleteCourseItemsWithProgress(
  tx: Transaction,
  itemIds: string[],
  assessmentId?: string,
) {
  if (itemIds.length === 0 && !assessmentId) {
    return {
      activityEvents: 0,
      attempts: 0,
      courseItems: 0,
      events: 0,
      progress: 0,
    };
  }

  const events = itemIds.length
    ? await tx.assessmentEvent.findMany({
        where: { courseItemId: { in: itemIds } },
        select: { id: true },
      })
    : [];
  const eventIds = events.map(({ id }) => id);
  const attempts = await tx.assessmentAttempt.findMany({
    where: {
      OR: [
        ...(assessmentId ? [{ assessmentId }] : []),
        ...(itemIds.length ? [{ courseItemId: { in: itemIds } }] : []),
        ...(eventIds.length ? [{ assessmentEventId: { in: eventIds } }] : []),
      ],
    },
    select: { id: true },
  });
  const attemptIds = attempts.map(({ id }) => id);
  await deleteAssessmentAttempts(tx, attemptIds);
  if (eventIds.length) {
    await tx.assessmentEvent.deleteMany({ where: { id: { in: eventIds } } });
  }
  const activityEvents = await deleteCourseItemActivity(tx, itemIds);
  const progress = itemIds.length
    ? await tx.contentProgress.deleteMany({
        where: { courseItemId: { in: itemIds } },
      })
    : { count: 0 };
  const courseItems = itemIds.length
    ? await tx.courseItem.deleteMany({ where: { id: { in: itemIds } } })
    : { count: 0 };

  return {
    activityEvents,
    attempts: attempts.length,
    courseItems: courseItems.count,
    events: events.length,
    progress: progress.count,
  };
}

export async function deleteAssessmentWithProgress(
  tx: Transaction,
  assessmentId: string,
) {
  const items = await tx.courseItem.findMany({
    where: { assessmentId },
    select: { id: true },
  });
  const related = await deleteCourseItemsWithProgress(
    tx,
    items.map(({ id }) => id),
    assessmentId,
  );
  const requirements = await tx.materialRequirement.deleteMany({
    where: { assessmentId },
  });
  await tx.assessment.delete({ where: { id: assessmentId } });
  return { ...related, materialRequirements: requirements.count };
}

export async function deleteMaterialWithProgress(
  tx: Transaction,
  materialId: string,
) {
  const items = await tx.courseItem.findMany({
    where: { materialId },
    select: { id: true },
  });
  const related = await deleteCourseItemsWithProgress(
    tx,
    items.map(({ id }) => id),
  );
  await tx.material.delete({ where: { id: materialId } });
  return related;
}

export async function deleteVocabularySetWithProgress(
  tx: Transaction,
  vocabularySetId: string,
) {
  const items = await tx.courseItem.findMany({
    where: { vocabularySetId },
    select: { id: true },
  });
  const related = await deleteCourseItemsWithProgress(
    tx,
    items.map(({ id }) => id),
  );
  const requirements = await tx.materialRequirement.deleteMany({
    where: { vocabularySetId },
  });
  await tx.vocabularySet.delete({ where: { id: vocabularySetId } });
  return { ...related, materialRequirements: requirements.count };
}
