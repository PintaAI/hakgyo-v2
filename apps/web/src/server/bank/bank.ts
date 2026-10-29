import { epsTopikBlueprint, questionTagsSchema } from "@hakgyo/shared";
import { epsTaxonomy, epsTypeByTag } from "@hakgyo/shared/eps-taxonomy";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  Prisma,
  type BankItemStatus,
  type PrismaClient,
} from "../../../generated/prisma/client";
import {
  MAX_ASSESSMENT_OPTIONS,
  MIN_ASSESSMENT_OPTIONS,
} from "~/lib/assessment-options";
import {
  bankMediaState,
  contentHasImage,
  bankReadinessProblem,
  bankStatuses,
  bankStatusLabels,
  bankTransitions,
  MAX_BANK_BATCH,
  type BankMetaView,
} from "~/lib/bank-status";
import {
  getBlockNotePlainText,
  hasBlockNoteContent,
  plainTextToBlockNote,
} from "~/lib/blocknote/document";
import { withTransactionRetry } from "~/server/db-retry";
import { shareBankMedia } from "~/server/bank/assets";
import {
  lockGroup,
  lockQuestion,
  markBankQuestionsEdited,
} from "~/server/bank/locks";
import { latestTtsJobs } from "~/server/bank/tts";
import { createId } from "~/server/batch";
import { toPrismaJsonValue } from "~/server/prisma-json";

/**
 * The EPS-TOPIK question bank (docs/eps-question-generator.md sections 3 and 6): standalone system
 * data (BankQuestion, BankOption, BankGroup), owned by no organization and edited from the
 * superadmin dashboard. Each question moves DRAFT → REVIEW → LIVE (the generator picks only LIVE
 * ones) and is RETIRED instead of deleted once it left draft. Generated sets copy questions, so an
 * edit here only reaches sets made afterwards. Every function here is superadmin-only.
 */

type Transaction = Prisma.TransactionClient;

/** Questions a pilot of this many packages needs per type (section 7: about 120 for 3). */
export const PILOT_PACKAGES = 3;

/** The preview length in lists. */
const PREVIEW_LENGTH = 160;

const id = z.string().min(1);
const json = z.unknown().transform(toPrismaJsonValue);
const nullableJson = z
  .unknown()
  .transform((value) =>
    value === null ? Prisma.DbNull : toPrismaJsonValue(value),
  );

export const listBankQuestionsInput = z.object({
  status: z.enum(bankStatuses).optional(),
  /** An EPS type tag (`eps:R2`), or `untagged` for questions without one. */
  type: z.string().max(40).optional(),
});

export const bankQuestionInput = z.object({ id });

export const createBankQuestionInput = z.object({ groupId: id.optional() });

export const updateBankQuestionInput = z.object({
  id,
  prompt: json.optional(),
  explanation: nullableJson.optional(),
  tags: questionTagsSchema.optional(),
});

export const createBankOptionInput = z.object({ questionId: id });

export const updateBankOptionInput = z.object({
  id,
  content: json.optional(),
  isCorrect: z.boolean().optional(),
});

export const deleteBankOptionInput = z.object({ id });

export const deleteBankQuestionInput = z.object({ id });

export const createBankGroupInput = z.object({ questionId: id });

export const updateBankGroupInput = z.object({
  id,
  instructions: nullableJson.optional(),
  stimulus: nullableJson.optional(),
});

export const leaveBankGroupInput = z.object({ questionId: id });

export const setBankStatusInput = z.object({
  questionIds: z.array(id).min(1).max(MAX_BANK_BATCH),
  status: z.enum(bankStatuses),
});

const emptyCounts = (): Record<BankItemStatus, number> => ({
  DRAFT: 0,
  REVIEW: 0,
  LIVE: 0,
  RETIRED: 0,
});

/** How many slots of each type one package has. */
const slotsPerType = new Map<string, number>();
for (const section of epsTopikBlueprint.sections) {
  for (const slot of section.slots) {
    slotsPerType.set(slot.type, (slotsPerType.get(slot.type) ?? 0) + 1);
  }
}

const epsTag = (tags: readonly string[]) =>
  tags.find((tag) => tag.startsWith("eps:"));

const epsType = (tags: readonly string[]) =>
  tags.map(epsTypeByTag).find(Boolean);

const preview = (prompt: unknown) =>
  getBlockNotePlainText(prompt).slice(0, PREVIEW_LENGTH);

const sameJson = (left: unknown, right: unknown) =>
  JSON.stringify(left ?? null) === JSON.stringify(right ?? null);

/** What a new question or option starts with: one empty paragraph. */
const emptyContent = () => toPrismaJsonValue(plainTextToBlockNote(""));

/** Questions counted per type tag and status, against the pilot targets. */
export async function getBankOverview(db: PrismaClient) {
  const questions = await db.bankQuestion.findMany({
    select: { tags: true, status: true },
  });
  const counts = new Map<string, Record<BankItemStatus, number>>();
  for (const question of questions) {
    const type = epsTag(question.tags) ?? "untagged";
    const row = counts.get(type) ?? emptyCounts();
    row[question.status] += 1;
    counts.set(type, row);
  }
  return {
    pilotPackages: PILOT_PACKAGES,
    total: questions.length,
    types: [...new Set([...slotsPerType.keys(), ...counts.keys()])].map(
      (type) => ({
        type,
        target: (slotsPerType.get(type) ?? 0) * PILOT_PACKAGES,
        counts: counts.get(type) ?? emptyCounts(),
      }),
    ),
  };
}

/** The bank list, newest first, with what each question still needs. */
export async function listBankQuestions(
  db: PrismaClient,
  input: z.infer<typeof listBankQuestionsInput>,
) {
  const typeWhere: Prisma.BankQuestionWhereInput =
    input.type === undefined
      ? {}
      : input.type === "untagged"
        ? { NOT: { tags: { hasSome: epsTaxonomy.map((type) => type.tag) } } }
        : { tags: { has: input.type } };
  const questions = await db.bankQuestion.findMany({
    where: {
      ...(input.status ? { status: input.status } : {}),
      ...typeWhere,
    },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    take: MAX_BANK_BATCH,
    select: {
      id: true,
      type: true,
      prompt: true,
      tags: true,
      status: true,
      groupId: true,
      updatedAt: true,
      meta: true,
      options: {
        orderBy: { position: "asc" },
        select: { isCorrect: true, content: true },
      },
    },
  });
  const jobs = await latestTtsJobs(
    db,
    questions.map(({ id }) => id),
  );
  return questions.map(({ prompt, options, meta: rawMeta, ...question }) => {
    const meta = (rawMeta ?? {}) as BankMetaView;
    const type = epsType(question.tags);
    return {
      ...question,
      preview: preview(prompt),
      optionCount: options.length,
      correctCount: options.filter((option) => option.isCorrect).length,
      flags: meta.flags ?? [],
      mediaBrief: meta.mediaBrief ?? null,
      hasScript: Boolean(meta.script?.length),
      /** Illustrated types can have their pictures drawn by AI. */
      illustrated: type?.lane === "illustrated",
      media: bankMediaState({ type, prompt, options }),
      optionsAreImages: type?.optionsAreImages ?? false,
      optionImages: options.map((option) => contentHasImage(option.content)),
      audioJob: jobs.get(question.id) ?? null,
    };
  });
}

/** One question for the bank editor, with its options and group. */
export async function getBankQuestion(
  db: PrismaClient,
  input: z.infer<typeof bankQuestionInput>,
) {
  const question = await db.bankQuestion.findUnique({
    where: { id: input.id },
    select: {
      id: true,
      type: true,
      prompt: true,
      explanation: true,
      tags: true,
      status: true,
      meta: true,
      groupId: true,
      position: true,
      updatedAt: true,
      options: {
        orderBy: { position: "asc" },
        select: { id: true, content: true, isCorrect: true, position: true },
      },
      group: {
        select: {
          id: true,
          instructions: true,
          stimulus: true,
          questions: {
            orderBy: [{ position: "asc" }, { createdAt: "asc" }],
            select: { id: true, position: true, prompt: true, status: true },
          },
        },
      },
    },
  });
  if (!question) throw new TRPCError({ code: "NOT_FOUND" });
  const jobs = await latestTtsJobs(db, [question.id]);
  const { group, ...rest } = question;
  return {
    ...rest,
    group: group
      ? {
          id: group.id,
          instructions: group.instructions,
          stimulus: group.stimulus,
          questions: group.questions.map(({ prompt, ...member }) => ({
            ...member,
            preview: preview(prompt),
          })),
        }
      : null,
    audioJob: jobs.get(question.id) ?? null,
  };
}

/** A new DRAFT question with an empty prompt and four empty options; in a group it goes last. */
export async function createBankQuestion(
  db: PrismaClient,
  input: z.infer<typeof createBankQuestionInput>,
  userId: string,
) {
  return withTransactionRetry(() =>
    db.$transaction(async (tx) => {
      let position = 0;
      if (input.groupId) {
        await lockGroup(tx, input.groupId);
        const last = await tx.bankQuestion.aggregate({
          where: { groupId: input.groupId },
          _max: { position: true },
        });
        position = (last._max.position ?? -1) + 1;
      }
      const questionId = createId();
      await tx.bankQuestion.create({
        data: {
          id: questionId,
          type: "SINGLE_CHOICE",
          status: "DRAFT",
          prompt: emptyContent(),
          groupId: input.groupId ?? null,
          position,
          createdByUserId: userId,
          options: {
            createMany: {
              data: Array.from(
                { length: MAX_ASSESSMENT_OPTIONS },
                (_, index) => ({
                  content: emptyContent(),
                  position: index,
                }),
              ),
            },
          },
        },
        select: { id: true },
      });
      return { id: questionId };
    }),
  );
}

/** Saves the prompt, explanation or tags; a changed LIVE question goes back to REVIEW. */
export async function updateBankQuestion(
  db: PrismaClient,
  input: z.infer<typeof updateBankQuestionInput>,
) {
  return withTransactionRetry(() =>
    db.$transaction(async (tx) => {
      await lockQuestion(tx, input.id);
      const current = await tx.bankQuestion.findUniqueOrThrow({
        where: { id: input.id },
        select: { prompt: true, explanation: true, tags: true, status: true },
      });
      const data: Prisma.BankQuestionUpdateInput = {};
      if (
        input.prompt !== undefined &&
        !sameJson(input.prompt, current.prompt)
      ) {
        data.prompt = input.prompt;
      }
      if (input.explanation !== undefined) {
        const next =
          input.explanation === Prisma.DbNull ? null : input.explanation;
        if (!sameJson(next, current.explanation)) {
          data.explanation = input.explanation;
        }
      }
      if (input.tags !== undefined && !sameJson(input.tags, current.tags)) {
        data.tags = input.tags;
      }
      // Saving what is already there (an editor autosave) is not an edit.
      if (!Object.keys(data).length) {
        return { id: input.id, status: current.status };
      }
      if (current.status === "LIVE") data.status = "REVIEW";
      await shareBankMedia(tx, [input.prompt, input.explanation]);
      return tx.bankQuestion.update({
        where: { id: input.id },
        data,
        select: { id: true, status: true },
      });
    }),
  );
}

/** Adds an empty option at the end (at most four). */
export async function createBankOption(
  db: PrismaClient,
  input: z.infer<typeof createBankOptionInput>,
) {
  return withTransactionRetry(() =>
    db.$transaction(async (tx) => {
      // The question row lock checks the cap and the next position against committed options only.
      await lockQuestion(tx, input.questionId);
      const question = await tx.bankQuestion.findUniqueOrThrow({
        where: { id: input.questionId },
        select: { type: true },
      });
      if (question.type === "WRITTEN") {
        throw new TRPCError({ code: "BAD_REQUEST" });
      }
      const existing = await tx.bankOption.aggregate({
        where: { questionId: input.questionId },
        _count: { _all: true },
        _max: { position: true },
      });
      if (existing._count._all >= MAX_ASSESSMENT_OPTIONS) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Sebuah soal pilihan maksimal memiliki empat opsi.",
        });
      }
      const option = await tx.bankOption.create({
        data: {
          questionId: input.questionId,
          content: emptyContent(),
          position: (existing._max.position ?? -1) + 1,
        },
        select: { id: true, content: true, isCorrect: true, position: true },
      });
      await markBankQuestionsEdited(tx, [input.questionId]);
      return option;
    }),
  );
}

/**
 * Saves an option's content or key. Marking one option correct on a single-choice question clears
 * the others; a changed LIVE question goes back to REVIEW.
 */
export async function updateBankOption(
  db: PrismaClient,
  input: z.infer<typeof updateBankOptionInput>,
) {
  const option = await db.bankOption.findUnique({
    where: { id: input.id },
    select: { questionId: true },
  });
  if (!option) throw new TRPCError({ code: "NOT_FOUND" });
  return withTransactionRetry(() =>
    db.$transaction(async (tx) => {
      // The question row lock serializes "mark correct" calls, so exactly one option stays correct.
      await lockQuestion(tx, option.questionId);
      const current = await tx.bankOption.findUnique({
        where: { id: input.id },
        select: {
          content: true,
          isCorrect: true,
          question: { select: { type: true } },
        },
      });
      if (!current) throw new TRPCError({ code: "NOT_FOUND" });
      const data: Prisma.BankOptionUpdateInput = {};
      if (
        input.content !== undefined &&
        !sameJson(input.content, current.content)
      ) {
        data.content = input.content;
      }
      if (
        input.isCorrect !== undefined &&
        input.isCorrect !== current.isCorrect
      ) {
        data.isCorrect = input.isCorrect;
      }
      let changed = false;
      if (input.isCorrect && current.question.type === "SINGLE_CHOICE") {
        const cleared = await tx.bankOption.updateMany({
          where: {
            questionId: option.questionId,
            id: { not: input.id },
            isCorrect: true,
          },
          data: { isCorrect: false },
        });
        changed = cleared.count > 0;
      }
      if (Object.keys(data).length) {
        await tx.bankOption.update({ where: { id: input.id }, data });
        await shareBankMedia(tx, [input.content]);
        changed = true;
      }
      if (changed) await markBankQuestionsEdited(tx, [option.questionId]);
      return { id: input.id };
    }),
  );
}

/** Removes an option (a choice question keeps at least two). */
export async function deleteBankOption(
  db: PrismaClient,
  input: z.infer<typeof deleteBankOptionInput>,
) {
  const option = await db.bankOption.findUnique({
    where: { id: input.id },
    select: { questionId: true },
  });
  if (!option) throw new TRPCError({ code: "NOT_FOUND" });
  return withTransactionRetry(() =>
    db.$transaction(async (tx) => {
      await lockQuestion(tx, option.questionId);
      const question = await tx.bankQuestion.findUniqueOrThrow({
        where: { id: option.questionId },
        select: { type: true, _count: { select: { options: true } } },
      });
      if (
        question.type !== "WRITTEN" &&
        question._count.options <= MIN_ASSESSMENT_OPTIONS
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Sebuah soal pilihan harus memiliki minimal dua opsi.",
        });
      }
      const deleted = await tx.bankOption.deleteMany({
        where: { id: input.id },
      });
      if (deleted.count) await markBankQuestionsEdited(tx, [option.questionId]);
      return { deleted: true as const };
    }),
  );
}

/**
 * Deletes a DRAFT or RETIRED question for good (REVIEW and LIVE ones are retired first); an
 * emptied group goes with it. Sets already generated keep their copies, whose source becomes empty.
 */
export async function deleteBankQuestion(
  db: PrismaClient,
  input: z.infer<typeof deleteBankQuestionInput>,
) {
  return withTransactionRetry(() =>
    db.$transaction(async (tx) => {
      await lockQuestion(tx, input.id);
      const question = await tx.bankQuestion.findUniqueOrThrow({
        where: { id: input.id },
        select: { status: true, groupId: true },
      });
      if (question.status !== "DRAFT" && question.status !== "RETIRED") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Hanya draf atau soal pensiun yang bisa dihapus. Pensiunkan soal ini dulu.",
        });
      }
      if (question.groupId) await lockGroup(tx, question.groupId);
      await tx.bankQuestion.delete({ where: { id: input.id } });
      if (question.groupId) await deleteGroupIfEmpty(tx, question.groupId);
      return { deleted: true as const };
    }),
  );
}

async function deleteGroupIfEmpty(tx: Transaction, groupId: string) {
  await tx.bankGroup.deleteMany({
    where: { id: groupId, questions: { none: {} } },
  });
}

/** Puts a question that is in no group into a new group of its own. */
export async function createBankGroup(
  db: PrismaClient,
  input: z.infer<typeof createBankGroupInput>,
) {
  return withTransactionRetry(() =>
    db.$transaction(async (tx) => {
      await lockQuestion(tx, input.questionId);
      const question = await tx.bankQuestion.findUniqueOrThrow({
        where: { id: input.questionId },
        select: { groupId: true },
      });
      if (question.groupId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Soal ini sudah ada di dalam grup.",
        });
      }
      const group = await tx.bankGroup.create({
        data: {},
        select: { id: true },
      });
      await tx.bankQuestion.update({
        where: { id: input.questionId },
        data: { groupId: group.id, position: 0 },
      });
      await markBankQuestionsEdited(tx, [input.questionId]);
      return { groupId: group.id };
    }),
  );
}

/** Saves a group's instructions or stimulus; its LIVE questions go back to REVIEW when they change. */
export async function updateBankGroup(
  db: PrismaClient,
  input: z.infer<typeof updateBankGroupInput>,
) {
  return withTransactionRetry(() =>
    db.$transaction(async (tx) => {
      await lockGroup(tx, input.id);
      const current = await tx.bankGroup.findUniqueOrThrow({
        where: { id: input.id },
        select: {
          instructions: true,
          stimulus: true,
          questions: { select: { id: true } },
        },
      });
      const data: Prisma.BankGroupUpdateInput = {};
      for (const field of ["instructions", "stimulus"] as const) {
        const value = input[field];
        if (value === undefined) continue;
        if (!sameJson(value === Prisma.DbNull ? null : value, current[field])) {
          data[field] = value;
        }
      }
      if (Object.keys(data).length) {
        await tx.bankGroup.update({ where: { id: input.id }, data });
        await shareBankMedia(tx, [input.instructions, input.stimulus]);
        await markBankQuestionsEdited(
          tx,
          current.questions.map(({ id }) => id),
        );
      }
      return { id: input.id };
    }),
  );
}

/** Takes a question out of its group; a group left without questions is deleted. */
export async function leaveBankGroup(
  db: PrismaClient,
  input: z.infer<typeof leaveBankGroupInput>,
) {
  const question = await db.bankQuestion.findUnique({
    where: { id: input.questionId },
    select: { groupId: true },
  });
  if (!question) throw new TRPCError({ code: "NOT_FOUND" });
  if (!question.groupId) return { id: input.questionId };
  const groupId = question.groupId;
  return withTransactionRetry(() =>
    db.$transaction(async (tx) => {
      await lockGroup(tx, groupId);
      const moved = await tx.bankQuestion.updateMany({
        where: { id: input.questionId, groupId },
        data: { groupId: null, position: 0 },
      });
      if (moved.count) {
        // The questions staying behind lost one of their group, so they need another review too.
        const remaining = await tx.bankQuestion.findMany({
          where: { groupId },
          select: { id: true },
        });
        await markBankQuestionsEdited(tx, [
          input.questionId,
          ...remaining.map(({ id }) => id),
        ]);
        await deleteGroupIfEmpty(tx, groupId);
      }
      return { id: input.questionId };
    }),
  );
}

/**
 * Moves questions to another status where the move is allowed and, for REVIEW and LIVE, the
 * question is complete. Returns what moved and why the others did not.
 */
export async function setBankStatus(
  db: PrismaClient,
  input: z.infer<typeof setBankStatusInput>,
) {
  // Checked and moved under row locks (in id order, like every other bulk lock), so an edit
  // saved meanwhile can't make an incomplete question LIVE.
  return withTransactionRetry(() =>
    db.$transaction((tx) => moveBankQuestions(tx, input)),
  );
}

async function moveBankQuestions(
  tx: Transaction,
  input: z.infer<typeof setBankStatusInput>,
) {
  await tx.$queryRaw`
    SELECT "id" FROM "BankQuestion" WHERE "id" = ANY(${input.questionIds}) ORDER BY "id" FOR UPDATE
  `;
  const questions = await tx.bankQuestion.findMany({
    where: { id: { in: input.questionIds } },
    select: {
      id: true,
      type: true,
      tags: true,
      status: true,
      prompt: true,
      options: { select: { isCorrect: true, content: true } },
    },
  });
  const movable = new Map<BankItemStatus, string[]>();
  const skipped: Array<{ questionId: string; reason: string }> = [];
  for (const question of questions) {
    const from = question.status;
    if (from === input.status) continue;
    if (!bankTransitions[from].includes(input.status)) {
      skipped.push({
        questionId: question.id,
        reason: `tidak bisa dari ${bankStatusLabels[from]} ke ${bankStatusLabels[input.status]}`,
      });
      continue;
    }
    const problem =
      input.status === "REVIEW" || input.status === "LIVE"
        ? bankReadinessProblem({
            type: question.type,
            tags: question.tags,
            optionCount: question.options.length,
            correctCount: question.options.filter((option) => option.isCorrect)
              .length,
            promptEmpty: !hasBlockNoteContent(question.prompt),
            emptyOptions: question.options.filter(
              (option) => !hasBlockNoteContent(option.content),
            ).length,
            media: bankMediaState({
              type: epsType(question.tags),
              prompt: question.prompt,
              options: question.options,
            }),
          })
        : null;
    if (problem) {
      skipped.push({ questionId: question.id, reason: problem });
      continue;
    }
    const group = movable.get(from) ?? [];
    group.push(question.id);
    movable.set(from, group);
  }
  let moved = 0;
  for (const [from, ids] of movable) {
    const result = await tx.bankQuestion.updateMany({
      where: { id: { in: ids }, status: from },
      data: { status: input.status },
    });
    moved += result.count;
  }
  return { moved, skipped };
}
