import { TRPCError } from "@trpc/server";

import type { Prisma, PrismaClient } from "../../generated/prisma/client";
import {
  getMissingWrittenQuestionIds,
  groupScoresByValue,
} from "./assessment-logic";
import { withTransactionRetry } from "./db-retry";

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

export const gradableAttemptSelect = {
  id: true,
  userId: true,
  organizationId: true,
  courseItemId: true,
  status: true,
  startedAt: true,
  assessment: {
    select: {
      status: true,
      timeLimitMinutes: true,
      passingScore: true,
      questions: {
        select: {
          id: true,
          type: true,
          points: true,
          options: { select: { id: true, isCorrect: true } },
        },
      },
    },
  },
  assessmentEvent: {
    select: {
      status: true,
      durationMinutes: true,
      closesAt: true,
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
 * written questions). Throws CONFLICT if the attempt is no longer in progress.
 */
export async function gradeInProgressAttempt(
  tx: Prisma.TransactionClient,
  attempt: GradableAttempt,
  now: Date,
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
    maxScore += question.points;
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
    score += autoScore;
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
      status: "IN_PROGRESS",
    },
    data: {
      status: needsReview ? "IN_REVIEW" : "GRADED",
      score,
      maxScore,
      submittedAt: now,
      gradedAt: needsReview ? null : now,
    },
  });
  if (updated.count !== 1) throw new TRPCError({ code: "CONFLICT" });
  const passed =
    !needsReview &&
    maxScore > 0 &&
    (attempt.assessment.passingScore === null ||
      (score / maxScore) * 100 >= attempt.assessment.passingScore);
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
 * Submits and grades every attempt of a closed event that is still IN_PROGRESS, as if each
 * learner had submitted at `now`. Each attempt is graded in its own short transaction under the
 * attempt row lock, so a concurrent learner submit/save is serialized and never double-graded.
 * One failing attempt does not stop the others; failures are logged and the attempt stays
 * IN_PROGRESS, so closing the event again retries it. Returns the number of attempts graded here.
 */
export async function autoSubmitEventAttempts(
  db: PrismaClient,
  eventId: string,
  now: Date,
) {
  const attempts = await db.assessmentAttempt.findMany({
    where: { assessmentEventId: eventId, status: "IN_PROGRESS" },
    orderBy: { id: "asc" },
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
            await gradeInProgressAttempt(tx, attempt, now);
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
  return graded;
}
