import { HANGEUL_MASTERY_ACHIEVEMENT_CODE } from "@hakgyo/shared/hangeul";
import { hasPassedAssessment } from "@hakgyo/shared/learning/sequential-access";

import type { Prisma } from "../../../generated/prisma/client";
import { lockLearnerProgress } from "../vocabulary/evidence";
import { HANGEUL_MASTERY_COURSE_ID } from "./constants";

type PassEvidence = {
  status: string;
  score: number | null;
  maxScore: number | null;
};

export type CourseCompletionItem = {
  id: string;
  type: string;
  assessment: { id: string; passingScore: number | null } | null;
};

/**
 * Whether every given (published) item is completed, with the semantics of
 * the course outline: an assessment counts once a standalone attempt passed,
 * anything else once its progress is COMPLETED. An empty course is never
 * complete.
 */
export function isCourseComplete(
  items: CourseCompletionItem[],
  evidence: {
    completedItemIds: ReadonlySet<string>;
    attemptsByAssessment: ReadonlyMap<string, PassEvidence[]>;
  },
) {
  return (
    items.length > 0 &&
    items.every((item) =>
      item.type === "ASSESSMENT"
        ? !!item.assessment &&
          hasPassedAssessment(
            evidence.attemptsByAssessment.get(item.assessment.id) ?? [],
            item.assessment.passingScore,
          )
        : evidence.completedItemIds.has(item.id),
    )
  );
}

/**
 * Call after a write that may have completed course items for `userId`, in
 * the same transaction. When those items belong to the Hangeul Mastery course
 * and every published item of it is now completed, awards the
 * HANGEUL_MASTERY achievement and marks the learner's default-cohort
 * membership COMPLETED (which keeps access). Returns immediately for items of
 * other courses and for learners who already have the achievement.
 *
 * Pass `courseId` when the caller already knows the course of every item in
 * `courseItemIds`: other courses then return without a query.
 *
 * Takes the learner's progress lock (re-entrant within the transaction)
 * before reading progress, so two overlapping final completions serialize and
 * the later one sees the earlier one's writes. Reads fresh rows through `tx`
 * (never the request cache) so it sees the progress written moments before.
 */
export async function awardHangeulMasteryIfComplete(
  tx: Prisma.TransactionClient,
  input: {
    userId: string;
    courseItemIds: string[];
    /** The course of every item in `courseItemIds`, when the caller has it. */
    courseId?: string;
    now?: Date;
  },
) {
  if (input.courseItemIds.length === 0) return { awarded: false as const };
  if (input.courseId !== undefined) {
    if (input.courseId !== HANGEUL_MASTERY_COURSE_ID) {
      return { awarded: false as const };
    }
  } else {
    const inCourse = await tx.courseItem.findFirst({
      where: {
        id: { in: input.courseItemIds },
        module: { courseId: HANGEUL_MASTERY_COURSE_ID },
      },
      select: { id: true },
    });
    if (!inCourse) return { awarded: false as const };
  }
  // Assessment completions (submit, teacher review) do not hold this lock
  // yet; vocabulary and content completions already do.
  await lockLearnerProgress(tx, input.userId);

  const [earned, course] = await Promise.all([
    tx.userAchievement.findUnique({
      where: {
        userId_code: {
          userId: input.userId,
          code: HANGEUL_MASTERY_ACHIEVEMENT_CODE,
        },
      },
      select: { id: true },
    }),
    tx.course.findUnique({
      where: { id: HANGEUL_MASTERY_COURSE_ID },
      select: { status: true },
    }),
  ]);
  if (earned || course?.status !== "PUBLISHED") {
    return { awarded: false as const };
  }

  const items = await tx.courseItem.findMany({
    where: {
      isPublished: true,
      module: { courseId: HANGEUL_MASTERY_COURSE_ID },
    },
    select: {
      id: true,
      type: true,
      assessment: { select: { id: true, passingScore: true } },
    },
  });
  const assessmentIds = items.flatMap((item) =>
    item.type === "ASSESSMENT" && item.assessment ? [item.assessment.id] : [],
  );
  const [progress, attempts] = await Promise.all([
    tx.contentProgress.findMany({
      where: {
        userId: input.userId,
        status: "COMPLETED",
        courseItemId: { in: items.map((item) => item.id) },
      },
      select: { courseItemId: true },
    }),
    assessmentIds.length
      ? tx.assessmentAttempt.findMany({
          where: {
            userId: input.userId,
            assessmentEventId: null,
            status: "GRADED",
            score: { not: null },
            maxScore: { gt: 0 },
            assessmentId: { in: assessmentIds },
          },
          select: {
            assessmentId: true,
            status: true,
            score: true,
            maxScore: true,
          },
        })
      : [],
  ]);
  const attemptsByAssessment = new Map<string, PassEvidence[]>();
  for (const { assessmentId, ...attempt } of attempts) {
    const list = attemptsByAssessment.get(assessmentId);
    if (list) list.push(attempt);
    else attemptsByAssessment.set(assessmentId, [attempt]);
  }
  const complete = isCourseComplete(items, {
    completedItemIds: new Set(progress.map((row) => row.courseItemId)),
    attemptsByAssessment,
  });
  if (!complete) return { awarded: false as const };

  const now = input.now ?? new Date();
  await tx.userAchievement.createMany({
    data: {
      userId: input.userId,
      code: HANGEUL_MASTERY_ACHIEVEMENT_CODE,
      earnedAt: now,
      metadata: { courseId: HANGEUL_MASTERY_COURSE_ID },
    },
    skipDuplicates: true,
  });
  // Only the self-paced membership the learner already has: COMPLETED keeps
  // access, and finishing never creates a membership.
  await tx.cohortEnrollment.updateMany({
    where: {
      userId: input.userId,
      status: "ACTIVE",
      cohort: { defaultForCourseId: HANGEUL_MASTERY_COURSE_ID },
    },
    data: { status: "COMPLETED", completedAt: now },
  });
  return { awarded: true as const };
}
