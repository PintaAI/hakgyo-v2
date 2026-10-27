import { TRPCError } from "@trpc/server";

import { reachesPercent, roundScore } from "@hakgyo/shared";

import type {
  AssessmentAttemptStatus,
  AssessmentSubmissionSource,
  Prisma,
  PrismaClient,
} from "../../../generated/prisma/client";
import { getMissingWrittenQuestionIds, groupScoresByValue } from "./logic";
import { withTransactionRetry } from "../db-retry";
import {
  loadSectionEntries,
  loadSectionPlan,
  recordSectionScores,
  storeSectionWindows,
} from "./attempt-sections";
import { attemptDeadline, timedSectionsSelect } from "./timing";
import {
  assessmentPassedActivityKey,
  assessmentSubmittedActivityKey,
} from "../gamification/activity-keys";
import { recordGamificationActivity } from "../gamification/record-activity";
import { awardHangeulMasteryIfComplete } from "../foundation/hangeul-mastery-completion";

/**
 * Serializes attempt creation for one learner and course item (standalone and event attempts
 * share attempt numbers), so a double-tap sees the attempt created by the first request.
 * Must be the first statement of the transaction.
 */
export async function lockAttemptStart(
  tx: Prisma.TransactionClient,
  userId: string,
  courseItemId: string,
) {
  await tx.$executeRaw`
    SELECT pg_advisory_xact_lock(hashtextextended(${`attempt:${userId}:${courseItemId}`}, 0))
  `;
}

/**
 * Locks an in-progress attempt row so answer writes, submission and auto-submission of the same
 * attempt run one at a time. Returns false when the attempt is missing or no longer in progress.
 */
export async function lockInProgressAttempt(
  tx: Prisma.TransactionClient,
  attemptId: string,
) {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "AssessmentAttempt"
    WHERE "id" = ${attemptId}
      AND "status" = 'IN_PROGRESS'
    FOR UPDATE
  `;
  return rows.length > 0;
}

/** A graded score passes when it reaches `passingScore` percent; no passing score means any score passes. */
export function isPassingScore(
  score: number,
  maxScore: number | null,
  passingScore: number | null,
) {
  return (
    maxScore !== null &&
    maxScore > 0 &&
    (passingScore === null || reachesPercent(score, maxScore, passingScore))
  );
}

/**
 * Marks a standalone course item completed after a passing attempt. Call it after the attempt is
 * graded in the same transaction: finishing the Hangeul Mastery course awards its badge here.
 * Pass the item's `courseId` when it is at hand, so other courses skip the course lookup.
 */
export async function markCourseItemCompleted(
  tx: Prisma.TransactionClient,
  courseItemId: string,
  userId: string,
  now: Date,
  courseId?: string,
) {
  await tx.contentProgress.upsert({
    where: { courseItemId_userId: { courseItemId, userId } },
    create: { courseItemId, userId, status: "COMPLETED", completedAt: now },
    update: { status: "COMPLETED", completedAt: now },
  });
  await awardHangeulMasteryIfComplete(tx, {
    userId,
    courseItemIds: [courseItemId],
    courseId,
    now,
  });
}

/**
 * Awards the learner's submission of an attempt (standalone or event), once per attempt. Call it
 * in the submitting transaction so a rolled-back submit awards nothing. The learner's stored time
 * zone dates the activity.
 */
export function recordAssessmentSubmitted(
  tx: Prisma.TransactionClient,
  attempt: {
    id: string;
    userId: string;
    organizationId: string;
    courseItemId: string;
    assessmentEventId: string | null;
  },
  submittedAt: Date,
) {
  return recordGamificationActivity(tx, {
    action: "ASSESSMENT_SUBMITTED",
    idempotencyKey: assessmentSubmittedActivityKey(attempt.id),
    metadata: {
      attemptId: attempt.id,
      courseItemId: attempt.courseItemId,
      ...(attempt.assessmentEventId
        ? { assessmentEventId: attempt.assessmentEventId }
        : {}),
    },
    organizationId: attempt.organizationId,
    occurredAt: submittedAt,
    userId: attempt.userId,
  });
}

/**
 * Awards passing a standalone assessment, once per learner and course item however often it is
 * retaken. Call it next to `markCourseItemCompleted`, in the same transaction.
 */
export function recordAssessmentPassed(
  tx: Prisma.TransactionClient,
  attempt: {
    id: string;
    userId: string;
    organizationId: string;
    courseItemId: string;
  },
  passedAt: Date,
) {
  return recordGamificationActivity(tx, {
    action: "ASSESSMENT_PASSED",
    idempotencyKey: assessmentPassedActivityKey(
      attempt.userId,
      attempt.courseItemId,
    ),
    metadata: { attemptId: attempt.id, courseItemId: attempt.courseItemId },
    organizationId: attempt.organizationId,
    occurredAt: passedAt,
    userId: attempt.userId,
  });
}

export const gradableAttemptSelect = {
  id: true,
  assessmentId: true,
  userId: true,
  organizationId: true,
  courseItemId: true,
  assessmentEventId: true,
  status: true,
  startedAt: true,
  assessment: {
    select: {
      timeLimitMinutes: true,
      passingScore: true,
      sections: timedSectionsSelect,
      questions: {
        select: {
          id: true,
          type: true,
          points: true,
          sectionId: true,
          options: { select: { id: true, isCorrect: true } },
        },
      },
    },
  },
  assessmentEvent: {
    select: {
      status: true,
      type: true,
      durationMinutes: true,
      closesAt: true,
      closedAt: true,
    },
  },
  answers: {
    select: {
      id: true,
      questionId: true,
      selectedOptions: { select: { optionId: true } },
    },
  },
} satisfies Prisma.AssessmentAttemptSelect;

export type GradableAttempt = Prisma.AssessmentAttemptGetPayload<{
  select: typeof gradableAttemptSelect;
}>;

/**
 * Scores an IN_PROGRESS attempt and moves it to GRADED (all auto-scored) or IN_REVIEW (has
 * written questions). Throws CONFLICT if the attempt is no longer in progress (or, with
 * `fromStatus`, in one of those statuses: a late offline submission regrades a GRADED attempt).
 * `submittedAt` defaults to `now`; an offline device passes the time the learner submitted.
 */
export async function gradeInProgressAttempt(
  tx: Prisma.TransactionClient,
  attempt: GradableAttempt,
  now: Date,
  options: {
    via: AssessmentSubmissionSource;
    submittedAt?: Date;
    fromStatus?: AssessmentAttemptStatus[];
  },
) {
  const answers = new Map(
    attempt.answers.map((answer) => [answer.questionId, answer]),
  );
  const missingWrittenQuestionIds = getMissingWrittenQuestionIds(
    attempt.assessment.questions.map((question) => ({
      id: question.id,
      type: question.type,
      optionIds: question.options.map((option) => option.id),
    })),
    new Set(answers.keys()),
  );
  if (missingWrittenQuestionIds.length) {
    await tx.assessmentAnswer.createMany({
      data: missingWrittenQuestionIds.map((questionId) => ({
        attemptId: attempt.id,
        organizationId: attempt.organizationId,
        questionId,
      })),
      skipDuplicates: true,
    });
  }
  let score = 0;
  let maxScore = 0;
  let needsReview = false;
  const autoScores: Array<{ answerId: string; score: number }> = [];
  for (const question of attempt.assessment.questions) {
    maxScore = roundScore(maxScore + question.points);
    const answer = answers.get(question.id);
    if (question.type === "WRITTEN") {
      needsReview = true;
      continue;
    }
    const expected = question.options
      .filter((option) => option.isCorrect)
      .map((option) => option.id)
      .sort();
    const selected = (
      answer?.selectedOptions.map((selection) => selection.optionId) ?? []
    ).sort();
    const autoScore =
      expected.length === selected.length &&
      expected.every((value, index) => value === selected[index])
        ? question.points
        : 0;
    score = roundScore(score + autoScore);
    if (answer) autoScores.push({ answerId: answer.id, score: autoScore });
  }
  for (const [autoScore, answerIds] of groupScoresByValue(autoScores)) {
    await tx.assessmentAnswer.updateMany({
      where: { id: { in: answerIds } },
      data: { autoScore },
    });
  }
  const updated = await tx.assessmentAttempt.updateMany({
    where: {
      id: attempt.id,
      userId: attempt.userId,
      status: { in: options.fromStatus ?? ["IN_PROGRESS"] },
    },
    data: {
      status: needsReview ? "IN_REVIEW" : "GRADED",
      score,
      maxScore,
      submittedAt: options.submittedAt ?? now,
      submittedVia: options.via,
      gradedAt: needsReview ? null : now,
    },
  });
  if (updated.count !== 1) throw new TRPCError({ code: "CONFLICT" });
  if (attempt.assessment.sections.length) {
    // A section still running ends with the submission; every section gets its score.
    await storeSectionWindows(tx, {
      attemptId: attempt.id,
      startedAt: attempt.startedAt,
      deadline: attemptDeadline({
        startedAt: attempt.startedAt,
        timeLimitMinutes: attempt.assessment.timeLimitMinutes,
        event: attempt.assessmentEvent,
        sections: attempt.assessment.sections,
      }),
      plan: await loadSectionPlan(tx, attempt.assessmentId),
      entries: await loadSectionEntries(tx, attempt.id),
      now,
      submittedAt: options.submittedAt ?? now,
    });
    await recordSectionScores(tx, attempt.id);
  }
  const passed =
    !needsReview &&
    isPassingScore(score, maxScore, attempt.assessment.passingScore);
  return {
    status: needsReview ? ("IN_REVIEW" as const) : ("GRADED" as const),
    score,
    maxScore,
    passed,
  };
}

// Kept low: the connection pool is shared with request traffic.
const AUTO_SUBMIT_CONCURRENCY = 2;

/**
 * Submits and grades the attempts of a closed event that are still IN_PROGRESS, as if each
 * learner had submitted at `now`, at most `limit` per call (oldest ids first). Each attempt is
 * graded in its own short transaction under the attempt row lock, so a concurrent learner
 * submit/save is serialized and never double-graded. One failing attempt does not stop the
 * others; failures are logged and the attempt stays IN_PROGRESS for the next run.
 */
export async function autoSubmitEventAttempts(
  db: PrismaClient,
  eventId: string,
  now: Date,
  limit?: number,
) {
  const attempts = await db.assessmentAttempt.findMany({
    where: { assessmentEventId: eventId, status: "IN_PROGRESS" },
    orderBy: { id: "asc" },
    take: limit,
    select: { id: true },
  });
  let graded = 0;
  let failed = 0;
  for (
    let index = 0;
    index < attempts.length;
    index += AUTO_SUBMIT_CONCURRENCY
  ) {
    const batch = attempts.slice(index, index + AUTO_SUBMIT_CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(({ id }) =>
        withTransactionRetry(() =>
          db.$transaction(async (tx) => {
            if (!(await lockInProgressAttempt(tx, id))) return false;
            const attempt = await tx.assessmentAttempt.findUnique({
              where: { id },
              select: gradableAttemptSelect,
            });
            if (!attempt) return false;
            await gradeInProgressAttempt(tx, attempt, now, {
              via: "AUTO_CLOSE",
            });
            return true;
          }),
        ),
      ),
    );
    results.forEach((result, position) => {
      if (result.status === "fulfilled") {
        if (result.value) graded += 1;
        return;
      }
      failed += 1;
      console.error("Failed to auto-submit an attempt of a closed event", {
        eventId,
        attemptId: batch[position]?.id,
        error: result.reason as unknown,
      });
    });
  }
  if (failed) {
    console.error("Some attempts of a closed event were not auto-submitted", {
      eventId,
      graded,
      failed,
      total: attempts.length,
    });
  }
  return { graded, failed, processed: attempts.length };
}
