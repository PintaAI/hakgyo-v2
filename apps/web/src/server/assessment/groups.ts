import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { Prisma, type PrismaClient } from "../../../generated/prisma/client";
import { requireEditableAssessment } from "~/server/assessment/access";
import { lockAssessment } from "~/server/assessment/lock";
import { withTransactionRetry } from "~/server/db-retry";
import { toPrismaJsonValue } from "~/server/prisma-json";

/**
 * Question groups (docs/eps-topik-simulation.md section 4.5): consecutive questions of one section
 * that share instructions and a stimulus. A group has no position of its own; it sits where its
 * questions are. It is copied as a unit (`questionCopyRows` in `copy.ts`).
 */

type Tx = Prisma.TransactionClient;

const json = z.unknown().transform(toPrismaJsonValue);

/** Groups stay small: EPS-TOPIK groups have two to four questions. */
export const MAX_GROUP_QUESTIONS = 10;

const groupQuestionIds = z
  .array(z.string().min(1))
  .min(1)
  .max(MAX_GROUP_QUESTIONS);

export const createQuestionGroupInput = z.object({
  assessmentId: z.string().min(1),
  /** In display order; must be consecutive questions of one section. */
  questionIds: groupQuestionIds,
  instructions: json.nullable().optional(),
  stimulus: json.nullable().optional(),
});

export const updateQuestionGroupInput = z.object({
  groupId: z.string().min(1),
  /** Replaces the group's questions; same rules as on create. */
  questionIds: groupQuestionIds.optional(),
  instructions: json.nullable().optional(),
  stimulus: json.nullable().optional(),
});

function contentData(input: {
  instructions?: Prisma.InputJsonValue | null;
  stimulus?: Prisma.InputJsonValue | null;
}) {
  return {
    ...(input.instructions === undefined
      ? {}
      : { instructions: input.instructions ?? Prisma.DbNull }),
    ...(input.stimulus === undefined
      ? {}
      : { stimulus: input.stimulus ?? Prisma.DbNull }),
  };
}

/** The assessment's questions in display order: positions always follow section order. */
function displayedQuestions(tx: Tx, assessmentId: string) {
  return tx.assessmentQuestion.findMany({
    where: { assessmentId },
    orderBy: { position: "asc" },
    select: { id: true, sectionId: true, groupId: true },
  });
}

/**
 * Checks that `questionIds` are consecutive questions of one section, in display order, and not in
 * another group.
 */
function requireGroupable(
  questions: ReadonlyArray<{
    id: string;
    sectionId: string | null;
    groupId: string | null;
  }>,
  questionIds: readonly string[],
  groupId: string | null,
) {
  const start = questions.findIndex(({ id }) => id === questionIds[0]);
  const run =
    start < 0 ? [] : questions.slice(start, start + questionIds.length);
  const consecutive =
    run.length === questionIds.length &&
    run.every((question, index) => question.id === questionIds[index]);
  if (!consecutive || new Set(run.map(({ sectionId }) => sectionId)).size > 1) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Soal dalam satu kelompok harus berurutan di bagian yang sama.",
    });
  }
  if (
    run.some((question) => question.groupId && question.groupId !== groupId)
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Soal itu sudah masuk kelompok lain. Lepas dulu dari kelompoknya.",
    });
  }
}

export async function createQuestionGroup(
  db: PrismaClient,
  input: z.infer<typeof createQuestionGroupInput>,
  userId: string,
) {
  await requireEditableAssessment(db, input.assessmentId, userId);
  return withTransactionRetry(() =>
    db.$transaction(async (tx) => {
      await lockAssessment(tx, input.assessmentId);
      const questions = await displayedQuestions(tx, input.assessmentId);
      requireGroupable(questions, input.questionIds, null);
      const group = await tx.assessmentQuestionGroup.create({
        data: { assessmentId: input.assessmentId, ...contentData(input) },
      });
      await tx.assessmentQuestion.updateMany({
        where: { id: { in: input.questionIds } },
        data: { groupId: group.id },
      });
      return group;
    }),
  );
}

async function requireGroup(db: PrismaClient, groupId: string, userId: string) {
  const group = await db.assessmentQuestionGroup.findUnique({
    where: { id: groupId },
    select: { id: true, assessmentId: true },
  });
  if (!group) throw new TRPCError({ code: "NOT_FOUND" });
  await requireEditableAssessment(db, group.assessmentId, userId);
  return group;
}

export async function updateQuestionGroup(
  db: PrismaClient,
  input: z.infer<typeof updateQuestionGroupInput>,
  userId: string,
) {
  const group = await requireGroup(db, input.groupId, userId);
  return withTransactionRetry(() =>
    db.$transaction(async (tx) => {
      if (input.questionIds) {
        await lockAssessment(tx, group.assessmentId);
        const questions = await displayedQuestions(tx, group.assessmentId);
        requireGroupable(questions, input.questionIds, group.id);
        await tx.assessmentQuestion.updateMany({
          where: { groupId: group.id, id: { notIn: input.questionIds } },
          data: { groupId: null },
        });
        await tx.assessmentQuestion.updateMany({
          where: { id: { in: input.questionIds } },
          data: { groupId: group.id },
        });
      }
      return tx.assessmentQuestionGroup.update({
        where: { id: group.id },
        data: contentData(input),
      });
    }),
  );
}

/** Removes a group; its questions stay, ungrouped. */
export async function deleteQuestionGroup(
  db: PrismaClient,
  groupId: string,
  userId: string,
) {
  await requireGroup(db, groupId, userId);
  await db.assessmentQuestionGroup.delete({ where: { id: groupId } });
  return { deleted: true };
}

/**
 * Keeps every group consecutive within one section after questions moved: a group keeps its
 * longest run of consecutive questions (the first one on a tie), the others leave it, and groups
 * left without questions are deleted. Call after reordering.
 */
export async function repairQuestionGroups(tx: Tx, assessmentId: string) {
  const questions = await displayedQuestions(tx, assessmentId);
  const runs = new Map<string, string[][]>();
  questions.forEach((question, index) => {
    if (!question.groupId) return;
    const groupRuns = runs.get(question.groupId) ?? [];
    const previous = questions[index - 1];
    const last = groupRuns.at(-1);
    if (
      last &&
      previous?.groupId === question.groupId &&
      previous.sectionId === question.sectionId
    ) {
      last.push(question.id);
    } else {
      groupRuns.push([question.id]);
    }
    runs.set(question.groupId, groupRuns);
  });
  const detached = [...runs.values()].flatMap((groupRuns) => {
    const kept = groupRuns.reduce((best, run) =>
      run.length > best.length ? run : best,
    );
    return groupRuns.filter((run) => run !== kept).flat();
  });
  if (detached.length) {
    await tx.assessmentQuestion.updateMany({
      where: { id: { in: detached } },
      data: { groupId: null },
    });
  }
  await tx.assessmentQuestionGroup.deleteMany({
    where: { assessmentId, questions: { none: {} } },
  });
  return { detached: detached.length };
}
