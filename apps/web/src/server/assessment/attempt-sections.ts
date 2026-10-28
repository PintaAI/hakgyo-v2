import {
  roundScore,
  sectionHasQuestionRules,
  sectionTimeline,
  type LogPlanSection,
  type PriorLogEntry,
  type TimelineEntry,
} from "@hakgyo/shared";

import type { Prisma } from "../../../generated/prisma/client";
import {
  orderAssessmentQuestions,
  shufflesQuestions,
} from "~/server/assessment/order";

/**
 * Server side of sectioned attempts (docs/eps-topik-simulation.md section 4.2): the section plan
 * the shared rules check against, the section windows stored per attempt, and section scores.
 */

type Tx = Prisma.TransactionClient;

/**
 * Sections that have questions, in order, with their rules and question ids. With `attemptId`,
 * questions are in the order that attempt shows them (sections may shuffle), which forward-only
 * navigation depends on.
 */
export async function loadSectionPlan(
  tx: Tx,
  assessmentId: string,
  attemptId?: string,
): Promise<LogPlanSection[]> {
  const [sections, attempt] = await Promise.all([
    tx.assessmentSection.findMany({
      where: { assessmentId, questions: { some: {} } },
      orderBy: { position: "asc" },
      select: {
        id: true,
        position: true,
        timeLimitSeconds: true,
        allowEarlyFinish: true,
        shuffleQuestions: true,
        navigation: true,
        lockAnswers: true,
        audioMaxPlays: true,
        questions: {
          orderBy: { position: "asc" },
          select: { id: true, type: true, sectionId: true },
        },
      },
    }),
    attemptId
      ? tx.assessmentAttempt.findUnique({
          where: { id: attemptId },
          select: {
            id: true,
            shuffleSeed: true,
            assessment: { select: { shuffleQuestions: true } },
            assessmentEvent: { select: { shuffleQuestions: true } },
          },
        })
      : null,
  ]);
  const shown = attempt
    ? orderAssessmentQuestions(
        sections.flatMap((section) =>
          section.questions.map((question) => ({ ...question, options: [] })),
        ),
        attempt.shuffleSeed ?? attempt.id,
        shufflesQuestions(
          attempt.assessment.shuffleQuestions,
          attempt.assessmentEvent?.shuffleQuestions,
        ),
        false,
        {
          sections,
          eventShuffleQuestions: attempt.assessmentEvent?.shuffleQuestions,
        },
      )
    : sections.flatMap((section) => section.questions);
  return sections.map(({ questions, ...section }) => ({
    id: section.id,
    timeLimitSeconds: section.timeLimitSeconds,
    allowEarlyFinish: section.allowEarlyFinish,
    navigation: section.navigation,
    lockAnswers: section.lockAnswers,
    audioMaxPlays: section.audioMaxPlays,
    questionIds: shown
      .filter((question) => question.sectionId === section.id)
      .map(({ id }) => id),
    // A multiple-choice answer takes several taps, so only single choices lock.
    lockableQuestionIds: questions
      .filter((question) => question.type === "SINGLE_CHOICE")
      .map(({ id }) => id),
  }));
}

/**
 * The entries of an attempt's log the rules build on: section starts and ends and the submission,
 * plus, when a section has question rules, question entries (shown, answered, audio played) for
 * navigation, locks and play counts.
 */
export async function loadSectionEntries(
  tx: Tx,
  attemptId: string,
  plan: readonly LogPlanSection[],
): Promise<(PriorLogEntry & { seq: number })[]> {
  const rules = plan.some(sectionHasQuestionRules);
  const rows = await tx.assessmentAttemptLog.findMany({
    where: {
      attemptId,
      ...(rules
        ? {}
        : { kind: { in: ["SECTION_STARTED", "SECTION_ENDED", "SUBMITTED"] } }),
    },
    orderBy: { seq: "asc" },
    // No written content: only single choices lock, so the chosen options say enough.
    select: {
      seq: true,
      kind: true,
      sectionId: true,
      questionId: true,
      optionIds: true,
      at: true,
    },
  });
  return rows.map(({ optionIds, ...row }) => ({
    ...row,
    hasAnswer: optionIds.length > 0,
  }));
}

/** Stores the section windows of an attempt as the shared timeline sees them at `now`. */
export async function storeSectionWindows(
  tx: Tx,
  input: {
    attemptId: string;
    startedAt: Date;
    deadline: Date | null;
    plan: readonly LogPlanSection[];
    entries: readonly TimelineEntry[];
    now: Date;
    /** Grading: a section still running ends with the submission. */
    submittedAt?: Date;
  },
) {
  if (!input.plan.length) return;
  const timeline = sectionTimeline({
    sections: input.plan,
    startedAt: input.startedAt,
    attemptDeadline: input.deadline,
    entries: input.entries,
    now: input.now,
  });
  for (const window of timeline.windows) {
    // An intro still showing (or never reached) has nothing to store yet.
    if (!window.startedAt) continue;
    const endedBySubmission =
      input.submittedAt && window.startedAt && !window.endedAt;
    const data = {
      startedAt: window.startedAt,
      deadlineAt: window.deadlineAt,
      endedAt: endedBySubmission ? input.submittedAt : window.endedAt,
      endReason: endedBySubmission ? ("SUBMITTED" as const) : window.endReason,
    };
    await tx.assessmentAttemptSection.upsert({
      where: {
        attemptId_sectionId: {
          attemptId: input.attemptId,
          sectionId: window.sectionId,
        },
      },
      create: {
        attemptId: input.attemptId,
        sectionId: window.sectionId,
        ...data,
      },
      update: data,
    });
  }
}

/**
 * Writes each section's score from the answers (teacher score first, then the automatic one), for
 * every section of the attempt's assessment, also the ones never started. Call it after grading
 * and after a review.
 */
export async function recordSectionScores(tx: Tx, attemptId: string) {
  const attempt = await tx.assessmentAttempt.findUniqueOrThrow({
    where: { id: attemptId },
    select: {
      assessment: {
        select: {
          sections: { select: { id: true } },
          questions: { select: { id: true, sectionId: true, points: true } },
        },
      },
      answers: {
        select: { questionId: true, autoScore: true, manualScore: true },
      },
    },
  });
  if (!attempt.assessment.sections.length) return;
  const earned = new Map(
    attempt.answers.map((answer) => [
      answer.questionId,
      answer.manualScore ?? answer.autoScore ?? 0,
    ]),
  );
  for (const section of attempt.assessment.sections) {
    const questions = attempt.assessment.questions.filter(
      (question) => question.sectionId === section.id,
    );
    if (!questions.length) continue;
    const score = roundScore(
      questions.reduce(
        (total, question) => total + (earned.get(question.id) ?? 0),
        0,
      ),
    );
    const maxScore = roundScore(
      questions.reduce((total, question) => total + question.points, 0),
    );
    await tx.assessmentAttemptSection.upsert({
      where: { attemptId_sectionId: { attemptId, sectionId: section.id } },
      create: { attemptId, sectionId: section.id, score, maxScore },
      update: { score, maxScore },
    });
  }
}
