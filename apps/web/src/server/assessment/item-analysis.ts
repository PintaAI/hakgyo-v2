import {
  analyzeItems,
  groupTagRows,
  roundScore,
  scorePercent,
  sortTags,
  tagLabel,
  tagResults,
  timePerQuestion,
  type ItemResponse,
} from "@hakgyo/shared";

import type { PrismaClient } from "../../../generated/prisma/client";
import { getBlockNotePlainText } from "~/lib/blocknote/document";
import { loadAssessmentKeyForStaff } from "~/server/assessment/authoring";
import { rankAssessmentEventAttempts } from "~/server/assessment/event-ranking";
import { requireEventAccess } from "~/server/assessment/event-targets";

const PREVIEW_LENGTH = 140;

/**
 * Item analysis of an event for staff: per question difficulty, discrimination, option spread and
 * flags; per tag class accuracy; per learner tag results for the CSV export. It uses each
 * learner's best valid graded attempt (the one on the leaderboard). Class staff only see the
 * participants of the classes they review. Correctness comes from the answer scores, like the
 * learner's own per-tag summary; the key only marks options.
 */
export async function getEventItemAnalysis(
  db: PrismaClient,
  eventId: string,
  userId: string,
) {
  const { event, access } = await requireEventAccess(
    db,
    eventId,
    userId,
    "review",
  );
  const [details, participants] = await Promise.all([
    db.assessmentEvent.findUniqueOrThrow({
      where: { id: event.id },
      select: { courseItem: { select: { assessmentId: true } } },
    }),
    db.assessmentEventParticipant.findMany({
      where: {
        eventId: event.id,
        invalidatedAt: null,
        ...(access.reviewCohortIds
          ? { cohortId: { in: access.reviewCohortIds } }
          : {}),
      },
      select: {
        userId: true,
        user: { select: { name: true } },
        cohort: { select: { name: true } },
      },
    }),
  ]);
  const assessmentId = details.courseItem.assessmentId;
  if (!assessmentId || !participants.length) {
    return {
      attemptCount: 0,
      questions: [],
      tags: [],
      sections: [],
      learners: [],
    };
  }
  const participantByUser = new Map(
    participants.map((participant) => [participant.userId, participant]),
  );
  const [{ contentLocked, questions }, sectionList, attempts] =
    await Promise.all([
      loadAssessmentKeyForStaff(db, assessmentId),
      db.assessmentSection.findMany({
        where: { assessmentId, questions: { some: {} } },
        orderBy: { position: "asc" },
        select: { id: true, title: true },
      }),
      db.assessmentAttempt.findMany({
        where: {
          assessmentEventId: event.id,
          status: "GRADED",
          userId: { in: [...participantByUser.keys()] },
        },
        select: {
          id: true,
          userId: true,
          score: true,
          maxScore: true,
          status: true,
          startedAt: true,
          submittedAt: true,
          sections: {
            select: { sectionId: true, score: true, maxScore: true },
          },
          answers: {
            select: {
              questionId: true,
              content: true,
              autoScore: true,
              manualScore: true,
              selectedOptions: { select: { optionId: true } },
            },
          },
        },
      }),
    ]);
  const best = new Set(
    rankAssessmentEventAttempts(
      attempts.map((attempt) => ({
        ...attempt,
        name: participantByUser.get(attempt.userId)?.user.name ?? "",
        invalidatedAt: null,
      })),
    ).map((entry) => entry.attemptId),
  );
  const graded = attempts.filter((attempt) => best.has(attempt.id));
  // Time per question from the progress log; attempts from before the log have none.
  const logRows = graded.length
    ? await db.assessmentAttemptLog.findMany({
        where: {
          attemptId: { in: graded.map((attempt) => attempt.id) },
          kind: { in: ["QUESTION_SHOWN", "SUBMITTED"] },
        },
        select: { attemptId: true, kind: true, questionId: true, at: true },
      })
    : [];
  const logByAttempt = new Map<string, typeof logRows>();
  for (const row of logRows) {
    const list = logByAttempt.get(row.attemptId);
    if (list) list.push(row);
    else logByAttempt.set(row.attemptId, [row]);
  }

  const responses: ItemResponse[] = [];
  const learners = graded.map((attempt) => {
    const percent = scorePercent(attempt.score ?? 0, attempt.maxScore ?? 0);
    const answers = new Map(
      attempt.answers.map((answer) => [answer.questionId, answer]),
    );
    const log = logByAttempt.get(attempt.id);
    const times = log ? timePerQuestion(log, attempt.submittedAt) : null;
    for (const question of questions) {
      const answer = answers.get(question.id);
      const earned = answer?.manualScore ?? answer?.autoScore ?? 0;
      const optionKeys =
        answer?.selectedOptions.map(({ optionId }) => optionId) ?? [];
      responses.push({
        itemKey: question.id,
        attemptKey: attempt.id,
        attemptPercent: percent,
        correct: question.points > 0 && earned + 1e-9 >= question.points,
        answered:
          optionKeys.length > 0 ||
          (question.type === "WRITTEN" &&
            getBlockNotePlainText(answer?.content).trim().length > 0),
        optionKeys,
        // Questions never shown (not reached) have no time rather than zero.
        ...(times?.has(question.id) ? { timeMs: times.get(question.id) } : {}),
      });
    }
    const participant = participantByUser.get(attempt.userId);
    return {
      name: participant?.user.name ?? "",
      cohortName: participant?.cohort?.name ?? null,
      score: attempt.score ?? 0,
      maxScore: attempt.maxScore ?? 0,
      percent: roundScore(percent),
      sections: Object.fromEntries(
        attempt.sections.flatMap(({ sectionId, score, maxScore }) =>
          score === null || maxScore === null
            ? []
            : [[sectionId, { score, maxScore }]],
        ),
      ),
      tags: Object.fromEntries(
        tagResults(questions, attempt.answers)
          .flatMap((group) => group.rows)
          .map((row) => [row.tag, { correct: row.correct, total: row.total }]),
      ),
    };
  });

  const stats = analyzeItems(responses, {
    // Distractors only mean something with one correct answer.
    distractors: new Map(
      questions
        .filter((question) => question.type === "SINGLE_CHOICE")
        .map((question) => [
          question.id,
          question.options
            .filter((option) => !option.isCorrect)
            .map((option) => option.id),
        ]),
    ),
  });

  const tagTotals = new Map<string, { correct: number; total: number }>();
  for (const learner of learners) {
    for (const [tag, totals] of Object.entries(learner.tags)) {
      const sum = tagTotals.get(tag) ?? { correct: 0, total: 0 };
      sum.correct += totals.correct;
      sum.total += totals.total;
      tagTotals.set(tag, sum);
    }
  }

  return {
    attemptCount: graded.length,
    // Average score per section over the learners' best attempts.
    sections: sectionList.map((section) => {
      const results = learners.flatMap((learner) => {
        const result = learner.sections[section.id];
        return result ? [result] : [];
      });
      return {
        id: section.id,
        title: section.title,
        averageScore: results.length
          ? roundScore(
              results.reduce((total, result) => total + result.score, 0) /
                results.length,
            )
          : null,
        maxScore: results[0]?.maxScore ?? null,
      };
    }),
    questions: questions.map((question, index) => {
      const item = stats.get(question.id);
      return {
        id: question.id,
        number: index + 1,
        type: question.type,
        prompt: getBlockNotePlainText(question.prompt).slice(0, PREVIEW_LENGTH),
        points: question.points,
        tags: sortTags(question.tags),
        correctRate: item?.correctRate ?? null,
        discrimination: item?.discrimination ?? null,
        unansweredRate: item?.unansweredRate ?? null,
        averageTimeMs: item?.averageTimeMs ?? null,
        flags: item?.flags ?? [],
        // A package's option rates would point at its key next to the correct rate.
        options:
          question.type === "WRITTEN" || contentLocked
            ? []
            : question.options.map((option) => ({
                id: option.id,
                text: getBlockNotePlainText(option.content).slice(
                  0,
                  PREVIEW_LENGTH,
                ),
                isCorrect: option.isCorrect,
                rate: item?.optionRates.get(option.id) ?? 0,
                weak: item?.weakDistractors.includes(option.id) ?? false,
              })),
      };
    }),
    tags: groupTagRows(
      [...tagTotals].map(([tag, totals]) => ({
        tag,
        label: tagLabel(tag),
        correct: totals.correct,
        total: totals.total,
        rate: totals.total ? roundScore(totals.correct / totals.total) : 0,
      })),
    ),
    learners: learners.sort(
      (left, right) =>
        right.percent - left.percent || left.name.localeCompare(right.name),
    ),
  };
}
