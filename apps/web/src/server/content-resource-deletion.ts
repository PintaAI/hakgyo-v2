import { Prisma } from "../../generated/prisma/client";
import { chunk } from "./batch";
import {
  calculateStreak,
  DEFAULT_ACHIEVEMENT_RULES,
  findNewAchievements,
} from "./gamification/logic";

type Transaction = Prisma.TransactionClient;

// Bounds the size of `IN (...)` lists and multi-row VALUES statements.
const MAX_BATCH_ROWS = 5000;

async function rebuildGamification(
  tx: Transaction,
  userIds: readonly string[],
) {
  if (userIds.length === 0) return;

  // Aggregate in SQL instead of loading every user's full activity history.
  const [totals, streakDays] = await Promise.all([
    tx.userActivityEvent.groupBy({
      by: ["userId"],
      where: { userId: { in: [...userIds] } },
      _count: { _all: true },
      _sum: { xpAwarded: true },
      _max: { activityDate: true },
    }),
    tx.userActivityEvent.groupBy({
      by: ["userId", "activityDate"],
      where: { userId: { in: [...userIds] }, contributesToStreak: true },
    }),
  ]);
  const totalsByUser = new Map(totals.map((total) => [total.userId, total]));
  const streakDatesByUser = new Map<string, Date[]>();
  for (const { activityDate, userId } of streakDays) {
    const dates = streakDatesByUser.get(userId) ?? [];
    dates.push(activityDate);
    streakDatesByUser.set(userId, dates);
  }
  const managedAchievementCodes: string[] = DEFAULT_ACHIEVEMENT_RULES.map(
    ({ code }) => code,
  );
  const now = new Date();

  const summaries = userIds.map((userId) => {
    const total = totalsByUser.get(userId);
    const streak = calculateStreak(streakDatesByUser.get(userId) ?? [], {
      now,
      timeZone: "UTC",
    });
    const snapshot = {
      completedActivities: total?._count._all ?? 0,
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      totalXp: total?._sum.xpAwarded ?? 0,
    };
    return {
      userId,
      snapshot,
      lastActivityDate: total?._max.activityDate ?? null,
      eligibleAchievements: findNewAchievements(
        snapshot,
        DEFAULT_ACHIEVEMENT_RULES,
        new Set(),
      ),
    };
  });

  // One upsert statement per batch. New rows get the default "UTC" time zone
  // (there is no existing summary to copy it from); existing rows keep theirs.
  const updatedAt = now.toISOString();
  for (const batch of chunk(summaries, MAX_BATCH_ROWS)) {
    await tx.$executeRaw`
      INSERT INTO "UserGamification" (
        "userId",
        "totalXp",
        "completedActivities",
        "currentStreak",
        "longestStreak",
        "lastActivityDate",
        "timeZone",
        "updatedAt"
      )
      VALUES ${Prisma.join(
        batch.map(
          ({ userId, snapshot, lastActivityDate }) => Prisma.sql`(
            ${userId},
            ${snapshot.totalXp}::integer,
            ${snapshot.completedActivities}::integer,
            ${snapshot.currentStreak}::integer,
            ${snapshot.longestStreak}::integer,
            ${lastActivityDate?.toISOString().slice(0, 10) ?? null}::date,
            'UTC',
            ${updatedAt}::timestamp
          )`,
        ),
      )}
      ON CONFLICT ("userId") DO UPDATE SET
        "totalXp" = EXCLUDED."totalXp",
        "completedActivities" = EXCLUDED."completedActivities",
        "currentStreak" = EXCLUDED."currentStreak",
        "longestStreak" = EXCLUDED."longestStreak",
        "lastActivityDate" = EXCLUDED."lastActivityDate",
        "updatedAt" = EXCLUDED."updatedAt"
    `;
  }

  // Users with the same eligible achievements share one delete statement.
  const usersByEligibility = new Map<
    string,
    { eligible: string[]; userIds: string[] }
  >();
  for (const { eligibleAchievements, userId } of summaries) {
    const key = eligibleAchievements.join(",");
    const group = usersByEligibility.get(key) ?? {
      eligible: eligibleAchievements,
      userIds: [],
    };
    group.userIds.push(userId);
    usersByEligibility.set(key, group);
  }
  for (const {
    eligible,
    userIds: groupUserIds,
  } of usersByEligibility.values()) {
    const revoked = managedAchievementCodes.filter(
      (code) => !eligible.includes(code),
    );
    if (!revoked.length) continue;
    for (const batch of chunk(groupUserIds, MAX_BATCH_ROWS)) {
      await tx.userAchievement.deleteMany({
        where: { code: { in: revoked }, userId: { in: batch } },
      });
    }
  }
  const granted = summaries.flatMap(({ eligibleAchievements, userId }) =>
    eligibleAchievements.map((code) => ({ code, userId })),
  );
  for (const batch of chunk(granted, MAX_BATCH_ROWS)) {
    await tx.userAchievement.createMany({ data: batch, skipDuplicates: true });
  }
}

async function deleteCourseItemActivity(
  tx: Transaction,
  itemIds: readonly string[],
) {
  if (itemIds.length === 0) return 0;

  // Completion events are recorded together with the learner's progress row
  // (key `content-completed:${userId}:${courseItemId}`), and progress is only
  // removed together with its item, so the progress rows name every key.
  // Exact keys hit the unique index instead of scanning with LIKE patterns.
  const progress = await tx.contentProgress.findMany({
    where: { courseItemId: { in: [...itemIds] } },
    select: { courseItemId: true, userId: true },
  });
  const keys = progress.map(
    ({ courseItemId, userId }) => `content-completed:${userId}:${courseItemId}`,
  );
  const activities = (
    await Promise.all(
      chunk(keys, MAX_BATCH_ROWS).map((batch) =>
        tx.userActivityEvent.findMany({
          where: { idempotencyKey: { in: batch } },
          select: { id: true, userId: true },
        }),
      ),
    )
  ).flat();
  if (activities.length === 0) return 0;

  for (const batch of chunk(activities, MAX_BATCH_ROWS)) {
    await tx.userActivityEvent.deleteMany({
      where: { id: { in: batch.map(({ id }) => id) } },
    });
  }
  await rebuildGamification(tx, [
    ...new Set(activities.map(({ userId }) => userId)),
  ]);
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
