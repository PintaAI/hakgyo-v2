import {
  roundScore,
  sectionTimeline,
  type LogPlanSection,
  type TimelineEntry,
} from "@hakgyo/shared";

import type { Prisma } from "../../../generated/prisma/client";

/**
 * Server side of sectioned attempts (docs/eps-topik-simulation.md section 4.2): the section plan
 * the shared rules check against, the section windows stored per attempt, and section scores.
 */

type Tx = Prisma.TransactionClient;

/** Sections that have questions, in order, with their question ids. */
export async function loadSectionPlan(
  tx: Tx,
  assessmentId: string,
): Promise<LogPlanSection[]> {
  const sections = await tx.assessmentSection.findMany({
    where: { assessmentId, questions: { some: {} } },
    orderBy: { position: "asc" },
    select: {
      id: true,
      timeLimitSeconds: true,
      allowEarlyFinish: true,
      questions: { select: { id: true } },
    },
  });
  return sections.map(({ questions, ...section }) => ({
    ...section,
    questionIds: questions.map(({ id }) => id),
  }));
}

/** The section entries of an attempt's log (starts, ends, the submission). */
export async function loadSectionEntries(
  tx: Tx,
  attemptId: string,
): Promise<TimelineEntry[]> {
  return tx.assessmentAttemptLog.findMany({
    where: {
      attemptId,
      kind: { in: ["SECTION_STARTED", "SECTION_ENDED", "SUBMITTED"] },
    },
    orderBy: { seq: "asc" },
    select: { kind: true, sectionId: true, at: true },
  });
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
