import {
  analyzeItems,
  groupTagRows,
  roundScore,
  scorePercent,
  sortTags,
  tagLabel,
  type ItemResponse,
} from "@hakgyo/shared";

import type { PrismaClient } from "../../../generated/prisma/client";
import { getBlockNotePlainText } from "~/lib/blocknote/document";
import { loadAssessmentKeyForStaff } from "~/server/assessment/authoring";
import { rankAssessmentEventAttempts } from "~/server/assessment/event-ranking";
import { requireEventAccess } from "~/server/assessment/event-targets";

const PROMPT_PREVIEW_LENGTH = 140;

/**
 * Item analysis of an event for staff: per question difficulty, discrimination, option spread and
 * flags; per tag class accuracy; per learner tag results for the CSV export. It uses each
 * learner's best valid graded attempt (the one on the leaderboard). Class staff only see the
 * participants of the classes they review.
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
  const details = await db.assessmentEvent.findUniqueOrThrow({
    where: { id: eventId },
    select: {
      courseItem: { select: { assessmentId: true } },
    },
  });
  const assessmentId = details.courseItem.assessmentId;
  if (!assessmentId) {
    return { attemptCount: 0, questions: [], tags: [], learners: [] };
  }
  const [questions, participants, attempts] = await Promise.all([
    loadAssessmentKeyForStaff(db, assessmentId),
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
    db.assessmentAttempt.findMany({
      where: { assessmentEventId: event.id, status: "GRADED" },
      select: {
        id: true,
        userId: true,
        score: true,
        maxScore: true,
        status: true,
        startedAt: true,
        submittedAt: true,
        answers: {
          select: {
            questionId: true,
            autoScore: true,
            manualScore: true,
            selectedOptions: { select: { optionId: true } },
          },
        },
      },
    }),
  ]);

  const participantByUser = new Map(
    participants.map((participant) => [participant.userId, participant]),
  );
  const visible = attempts.filter((attempt) =>
    participantByUser.has(attempt.userId),
  );
  const best = new Set(
    rankAssessmentEventAttempts(
      visible.map((attempt) => ({
        ...attempt,
        name: participantByUser.get(attempt.userId)?.user.name ?? "",
        invalidatedAt: null,
      })),
    ).map((entry) => entry.attemptId),
  );
  const graded = visible.filter((attempt) => best.has(attempt.id));

  const responses: ItemResponse[] = [];
  const selectionCounts = new Map<string, Map<string, number>>();
  const learners = graded.map((attempt) => {
    const percent = scorePercent(attempt.score ?? 0, attempt.maxScore ?? 0);
    const answers = new Map(
      attempt.answers.map((answer) => [answer.questionId, answer]),
    );
    const tagTotals = new Map<string, { correct: number; total: number }>();
    for (const question of questions) {
      const answer = answers.get(question.id);
      const earned = answer?.manualScore ?? answer?.autoScore ?? 0;
      // Correctness comes from the score, never from the key, like the learner's own summary.
      const correct = question.points > 0 && earned + 1e-9 >= question.points;
      const selected = answer?.selectedOptions.map(({ optionId }) => optionId) ?? [];
      for (const optionId of selected) {
        const counts = selectionCounts.get(question.id) ?? new Map<string, number>();
        counts.set(optionId, (counts.get(optionId) ?? 0) + 1);
        selectionCounts.set(question.id, counts);
      }
      responses.push({
        itemKey: question.id,
        attemptKey: attempt.id,
        attemptPercent: percent,
        correct,
        // One key per answer; a multiple-choice answer counts as "answered", and its options
        // are spread through `selectionCounts` instead.
        optionKey:
          question.type === "MULTIPLE_CHOICE"
            ? selected.length
              ? "answered"
              : null
            : (selected[0] ?? null),
      });
      for (const tag of question.tags) {
        const totals = tagTotals.get(tag) ?? { correct: 0, total: 0 };
        totals.total += 1;
        if (correct) totals.correct += 1;
        tagTotals.set(tag, totals);
      }
    }
    const participant = participantByUser.get(attempt.userId);
    return {
      name: participant?.user.name ?? "",
      cohortName: participant?.cohort?.name ?? null,
      score: attempt.score ?? 0,
      maxScore: attempt.maxScore ?? 0,
      percent: roundScore(percent),
      tags: Object.fromEntries(tagTotals),
    };
  });

  const stats = analyzeItems(responses, {
    distractors: new Map(
      questions
        // Distractors only mean something with one correct answer.
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
    questions: questions.map((question, index) => {
      const item = stats.get(question.id);
      return {
        id: question.id,
        number: index + 1,
        type: question.type,
        prompt: getBlockNotePlainText(question.prompt).slice(
          0,
          PROMPT_PREVIEW_LENGTH,
        ),
        points: question.points,
        tags: sortTags(question.tags),
        correctRate: item?.correctRate ?? null,
        discrimination: item?.discrimination ?? null,
        unansweredRate: item?.unansweredRate ?? null,
        averageTimeMs: item?.averageTimeMs ?? null,
        flags: item?.flags ?? [],
        options:
          question.type === "WRITTEN"
            ? []
            : question.options.map((option) => ({
                id: option.id,
                text: getBlockNotePlainText(option.content).slice(
                  0,
                  PROMPT_PREVIEW_LENGTH,
                ),
                isCorrect: option.isCorrect,
                rate:
                  question.type === "MULTIPLE_CHOICE"
                    ? roundScore(
                        (selectionCounts.get(question.id)?.get(option.id) ??
                          0) / Math.max(1, graded.length),
                      )
                    : (item?.optionRates.get(option.id) ?? 0),
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

export type EventItemAnalysis = Awaited<ReturnType<typeof getEventItemAnalysis>>;
