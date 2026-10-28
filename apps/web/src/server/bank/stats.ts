import { analyzeItems, type ItemResponse } from "@hakgyo/shared";

import type { PrismaClient } from "../../../generated/prisma/client";
import { readPicks } from "~/server/bank/picks";
import { toPrismaJsonValue } from "~/server/prisma-json";

/**
 * Bank statistics (docs/eps-question-generator.md section 5): when an event on a package is
 * finalized, the bank questions it used are recomputed from every package copy learners took,
 * traced back through `sourceQuestionId`. No cron; later corrections (an invalidated participant,
 * a regrade) are picked up by the next event or "Hitung ulang statistik" on the bank page. The numbers come from the same item analysis as
 * the staff report; options are keyed by their bank position, since packages reorder them.
 */

export type BankStatsRow = {
  questionId: string;
  attempts: number;
  correctRate: number;
  discrimination: number | null;
  unansweredRate: number;
  /** Bank option position → share choosing it. */
  optionRates: Record<string, number>;
  flags: string[];
};

/** Set on the other questions of a group when one of them is flagged (section 5). */
export const WEAK_GROUP_FLAG = "weak-group";

/**
 * Stats per bank question from pooled responses (`itemKey` the bank question, `optionKeys` the
 * bank option positions). `distractors` lists each question's wrong positions; `groups` maps a
 * question to its bank group, so a weak question flags its whole group.
 */
export function bankStatsFrom(input: {
  responses: readonly ItemResponse[];
  distractors: ReadonlyMap<string, readonly string[]>;
  groups: ReadonlyMap<string, string | null>;
}): BankStatsRow[] {
  const stats = analyzeItems(input.responses, {
    distractors: input.distractors,
  });
  const weakGroups = new Set<string>();
  for (const [questionId, item] of stats) {
    const group = input.groups.get(questionId);
    if (group && item.flags.length) weakGroups.add(group);
  }
  return [...stats].map(([questionId, item]) => {
    const group = input.groups.get(questionId);
    return {
      questionId,
      attempts: item.responses,
      correctRate: item.correctRate,
      discrimination: item.discrimination,
      unansweredRate: item.unansweredRate,
      optionRates: Object.fromEntries(item.optionRates),
      flags: [
        ...item.flags,
        ...(group && weakGroups.has(group) && !item.flags.length
          ? [WEAK_GROUP_FLAG]
          : []),
      ],
    };
  });
}

/**
 * Recomputes the statistics of every bank question the package `assessmentId` uses. A no-op for
 * other assessments.
 */
export async function refreshBankStats(db: PrismaClient, assessmentId: string) {
  const assessment = await db.assessment.findUnique({
    where: { id: assessmentId },
    select: {
      kind: true,
      questions: { select: { sourceQuestionId: true } },
    },
  });
  if (assessment?.kind !== "GENERATED") return { updated: 0 };
  return refreshBankStatsFor(
    db,
    assessment.questions.flatMap(({ sourceQuestionId }) =>
      sourceQuestionId ? [sourceQuestionId] : [],
    ),
  );
}

/** Bank questions per recomputation, so one pass stays a bounded query. */
const REFRESH_BATCH = 100;

/**
 * "Hitung ulang statistik" on the bank page: every bank question any package copied, for
 * corrections after an event was finalized (an invalidated participant, a regrade).
 */
export async function refreshAllBankStats(db: PrismaClient) {
  const sources = await db.assessmentQuestion.findMany({
    where: {
      sourceQuestionId: { not: null },
      assessment: { kind: "GENERATED" },
    },
    distinct: ["sourceQuestionId"],
    select: { sourceQuestionId: true },
  });
  const ids = sources.flatMap(({ sourceQuestionId }) =>
    sourceQuestionId ? [sourceQuestionId] : [],
  );
  let updated = 0;
  for (let start = 0; start < ids.length; start += REFRESH_BATCH) {
    const result = await refreshBankStatsFor(
      db,
      ids.slice(start, start + REFRESH_BATCH),
    );
    updated += result.updated;
  }
  return { updated };
}

/**
 * Recomputes the given bank questions over all packages that copied them: graded attempts of
 * closed events, leaving out invalidated participants. Rows are replaced in one transaction.
 */
async function refreshBankStatsFor(db: PrismaClient, ids: readonly string[]) {
  const bankIds = [...new Set(ids)];
  if (!bankIds.length) return { updated: 0 };

  const [bankQuestions, copies] = await Promise.all([
    db.assessmentQuestion.findMany({
      where: { id: { in: bankIds } },
      select: {
        id: true,
        groupId: true,
        points: true,
        options: {
          orderBy: { position: "asc" },
          select: { position: true, isCorrect: true, content: true },
        },
      },
    }),
    db.assessmentQuestion.findMany({
      where: {
        sourceQuestionId: { in: bankIds },
        assessment: { kind: "GENERATED" },
      },
      select: {
        id: true,
        assessmentId: true,
        sourceQuestionId: true,
        points: true,
        options: {
          orderBy: { position: "asc" },
          select: { id: true, content: true },
        },
      },
    }),
  ]);
  const packageIds = [
    ...new Set(copies.map(({ assessmentId }) => assessmentId)),
  ];
  const [generations, attempts] = await Promise.all([
    db.assessmentGeneration.findMany({
      where: { assessmentId: { in: packageIds } },
      select: { assessmentId: true, picks: true },
    }),
    db.assessmentAttempt.findMany({
      where: {
        assessmentId: { in: packageIds },
        status: "GRADED",
        assessmentEvent: { status: "CLOSED" },
      },
      select: {
        id: true,
        assessmentId: true,
        userId: true,
        assessmentEventId: true,
        score: true,
        maxScore: true,
        answers: {
          where: { questionId: { in: copies.map(({ id }) => id) } },
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
  const invalidated = await db.assessmentEventParticipant.findMany({
    where: {
      eventId: {
        in: [
          ...new Set(
            attempts.flatMap(({ assessmentEventId }) =>
              assessmentEventId ? [assessmentEventId] : [],
            ),
          ),
        ],
      },
      invalidatedAt: { not: null },
    },
    select: { eventId: true, userId: true },
  });
  const excluded = new Set(
    invalidated.map(({ eventId, userId }) => `${eventId}:${userId}`),
  );

  const bankById = new Map(
    bankQuestions.map((question) => [question.id, question]),
  );
  const optionOrders = new Map(
    generations.flatMap(({ picks }) =>
      Object.entries(readPicks(picks).options),
    ),
  );
  // Package option id → bank option position: from the recorded order, else by equal content.
  const bankPosition = new Map<string, string>();
  const copiesByPackage = new Map<string, typeof copies>();
  for (const copy of copies) {
    const bank = bankById.get(copy.sourceQuestionId!);
    if (!bank) continue;
    const order = optionOrders.get(copy.id);
    copy.options.forEach((option, index) => {
      const position =
        order?.[index] ??
        bank.options.find(
          (candidate) =>
            JSON.stringify(candidate.content) ===
            JSON.stringify(option.content),
        )?.position;
      if (position !== undefined) bankPosition.set(option.id, String(position));
    });
    const list = copiesByPackage.get(copy.assessmentId) ?? [];
    list.push(copy);
    copiesByPackage.set(copy.assessmentId, list);
  }

  const responses: ItemResponse[] = [];
  for (const attempt of attempts) {
    if (excluded.has(`${attempt.assessmentEventId}:${attempt.userId}`))
      continue;
    const percent =
      attempt.maxScore && attempt.maxScore > 0
        ? ((attempt.score ?? 0) / attempt.maxScore) * 100
        : 0;
    const answers = new Map(
      attempt.answers.map((answer) => [answer.questionId, answer]),
    );
    for (const copy of copiesByPackage.get(attempt.assessmentId) ?? []) {
      const answer = answers.get(copy.id);
      const earned = answer?.manualScore ?? answer?.autoScore ?? 0;
      const optionKeys =
        answer?.selectedOptions.flatMap(({ optionId }) => {
          const key = bankPosition.get(optionId);
          return key === undefined ? [] : [key];
        }) ?? [];
      responses.push({
        itemKey: copy.sourceQuestionId!,
        attemptKey: attempt.id,
        attemptPercent: percent,
        correct: copy.points > 0 && earned + 1e-9 >= copy.points,
        answered: (answer?.selectedOptions.length ?? 0) > 0,
        optionKeys,
      });
    }
  }

  const rows = bankStatsFrom({
    responses,
    distractors: new Map(
      bankQuestions.map((question) => [
        question.id,
        question.options
          .filter((option) => !option.isCorrect)
          .map((option) => String(option.position)),
      ]),
    ),
    groups: new Map(bankQuestions.map(({ id, groupId }) => [id, groupId])),
  });
  const computedAt = new Date();
  // Replaced together: a concurrent refresh of the same questions ends with one complete set.
  await db.$transaction([
    db.bankItemStats.deleteMany({
      where: { questionId: { in: rows.map((row) => row.questionId) } },
    }),
    db.bankItemStats.createMany({
      data: rows.map((row) => ({
        questionId: row.questionId,
        attempts: row.attempts,
        correctRate: row.correctRate,
        discrimination: row.discrimination,
        unansweredRate: row.unansweredRate,
        optionRates: toPrismaJsonValue(row.optionRates),
        flags: row.flags,
        computedAt,
      })),
      skipDuplicates: true,
    }),
  ]);
  return { updated: rows.length };
}

/** After an event is finalized: refreshes its package's bank statistics, never failing the close. */
export async function refreshBankStatsAfterEvent(
  db: PrismaClient,
  eventId: string,
) {
  try {
    const event = await db.assessmentEvent.findUnique({
      where: { id: eventId },
      select: { courseItem: { select: { assessmentId: true } } },
    });
    const assessmentId = event?.courseItem.assessmentId;
    if (assessmentId) await refreshBankStats(db, assessmentId);
  } catch (error) {
    console.error("Failed to refresh bank statistics", { eventId, error });
  }
}
