import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { Prisma, type PrismaClient } from "../../../generated/prisma/client";
import { requireEditableAssessment } from "~/server/assessment/access";
import { repairQuestionGroups } from "~/server/assessment/groups";
import { withTransactionRetry } from "~/server/db-retry";
import { toPrismaJsonValue } from "~/server/prisma-json";

/**
 * Sections of an assessment (docs/eps-topik-simulation.md section 4.2): timed parts such as
 * EPS-TOPIK's Membaca and Mendengar. An assessment has no sections, or every question belongs to
 * one. Question positions always follow section order, so every reader that sorts by position
 * (public quiz, review, clones) sees the sectioned order too.
 */

const json = z.unknown().transform(toPrismaJsonValue);

export const sectionFields = z.object({
  title: z.string().trim().min(1).max(120),
  instructions: json.nullable().optional(),
  /** One minute to four hours; null for no timer of its own. */
  timeLimitSeconds: z.number().int().min(60).max(14_400).nullable().optional(),
  navigation: z.enum(["FREE", "FORWARD_ONLY", "PACED"]).optional(),
  lockAnswers: z.boolean().optional(),
  allowEarlyFinish: z.boolean().optional(),
  shuffleQuestions: z.boolean().optional(),
  audioMaxPlays: z.number().int().min(1).max(10).nullable().optional(),
  audioAutoplay: z.boolean().optional(),
  audioRepeatGapSeconds: z.number().int().min(0).max(30).optional(),
  pacedAnswerSeconds: z.number().int().min(1).max(300).nullable().optional(),
  pacedQuestionSeconds: z
    .number()
    .int()
    .min(5)
    .max(1_800)
    .nullable()
    .optional(),
});

export const createSectionInput = sectionFields.extend({
  assessmentId: z.string().min(1),
});
export const updateSectionInput = sectionFields
  .partial()
  .extend({ sectionId: z.string().min(1) });
/** The most sections an assessment can have (EPS-TOPIK uses two). */
export const MAX_SECTIONS = 20;

export const arrangeQuestionsInput = z.object({
  assessmentId: z.string().min(1),
  /** Every section in its new order with every question in its new order; `sectionId: null` only without sections. */
  sections: z
    .array(
      z.object({
        sectionId: z.string().min(1).nullable(),
        questionIds: z.array(z.string().min(1)).max(500),
      }),
    )
    .min(1)
    .max(MAX_SECTIONS),
});

type Tx = Prisma.TransactionClient;

function instructionsData(value: Prisma.InputJsonValue | null | undefined) {
  if (value === undefined) return {};
  return { instructions: value ?? Prisma.DbNull };
}

async function lockAssessment(tx: Tx, assessmentId: string) {
  await tx.$queryRaw`
    SELECT "id" FROM "Assessment" WHERE "id" = ${assessmentId} FOR UPDATE
  `;
}

/**
 * Positions above every real one, used for the first pass of a reorder. Positions must not be
 * negative (a check constraint), so the temporary pass goes high instead.
 */
const TEMPORARY_POSITION_OFFSET = 1_000_000;

/**
 * Writes positions in two passes (temporary, then final) so the unique (assessment, position)
 * constraints never collide mid-update. Unlike `reorder` in `routers/content.ts`, it sets the
 * section of every question in the same statements.
 */
async function writeQuestionLayout(
  tx: Tx,
  rows: ReadonlyArray<{ id: string; sectionId: string | null }>,
) {
  if (!rows.length) return;
  for (const pass of ["temporary", "final"] as const) {
    const values = Prisma.join(
      rows.map(
        (row, index) =>
          Prisma.sql`(${row.id}, ${pass === "temporary" ? TEMPORARY_POSITION_OFFSET + index : index}::int, ${row.sectionId}::text)`,
      ),
    );
    await tx.$executeRaw`
      UPDATE "AssessmentQuestion" AS question
      SET "position" = incoming."position", "sectionId" = incoming."sectionId"
      FROM (VALUES ${values}) AS incoming("id", "position", "sectionId")
      WHERE question."id" = incoming."id"
    `;
  }
}

async function writeSectionOrder(tx: Tx, sectionIds: readonly string[]) {
  if (!sectionIds.length) return;
  for (const pass of ["temporary", "final"] as const) {
    const values = Prisma.join(
      sectionIds.map(
        (id, index) =>
          Prisma.sql`(${id}, ${pass === "temporary" ? TEMPORARY_POSITION_OFFSET + index : index}::int)`,
      ),
    );
    await tx.$executeRaw`
      UPDATE "AssessmentSection" AS section
      SET "position" = incoming."position"
      FROM (VALUES ${values}) AS incoming("id", "position")
      WHERE section."id" = incoming."id"
    `;
  }
}

/** Renumbers questions in section order (then their current order); call after any change. */
export async function normalizeQuestionPositions(tx: Tx, assessmentId: string) {
  const [sections, questions] = await Promise.all([
    tx.assessmentSection.findMany({
      where: { assessmentId },
      orderBy: { position: "asc" },
      select: { id: true },
    }),
    tx.assessmentQuestion.findMany({
      where: { assessmentId },
      orderBy: { position: "asc" },
      select: { id: true, sectionId: true, position: true },
    }),
  ]);
  const order = new Map(sections.map(({ id }, index) => [id, index]));
  const fallback = sections.length ? sections.length - 1 : 0;
  const lastSectionId = sections.at(-1)?.id ?? null;
  const arranged = questions
    .map((question) => ({
      ...question,
      // With sections, a question without a (known) section joins the last one.
      sectionId:
        sections.length &&
        (!question.sectionId || !order.has(question.sectionId))
          ? lastSectionId
          : question.sectionId,
    }))
    .sort(
      (left, right) =>
        (order.get(left.sectionId ?? "") ?? fallback) -
          (order.get(right.sectionId ?? "") ?? fallback) ||
        left.position - right.position,
    );
  const storedSectionIds = new Map(
    questions.map((question) => [question.id, question.sectionId]),
  );
  const changed = arranged.some(
    (question, index) =>
      question.position !== index ||
      question.sectionId !== storedSectionIds.get(question.id),
  );
  if (changed) await writeQuestionLayout(tx, arranged);
}

export async function createSection(
  db: PrismaClient,
  input: z.infer<typeof createSectionInput>,
  userId: string,
) {
  await requireEditableAssessment(db, input.assessmentId, userId);
  const { assessmentId, instructions, ...fields } = input;
  return withTransactionRetry(() =>
    db.$transaction(async (tx) => {
      await lockAssessment(tx, assessmentId);
      const [last, count, assessment] = await Promise.all([
        tx.assessmentSection.findFirst({
          where: { assessmentId },
          orderBy: { position: "desc" },
          select: { position: true },
        }),
        tx.assessmentSection.count({ where: { assessmentId } }),
        tx.assessment.findUniqueOrThrow({
          where: { id: assessmentId },
          select: { shuffleQuestions: true },
        }),
      ]);
      if (count >= MAX_SECTIONS) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Satu tugas paling banyak punya ${MAX_SECTIONS} bagian.`,
        });
      }
      const section = await tx.assessmentSection.create({
        data: {
          // The first section keeps the assessment's "Acak soal", which sections replace.
          shuffleQuestions: last ? undefined : assessment.shuffleQuestions,
          ...fields,
          ...instructionsData(instructions),
          assessmentId,
          position: (last?.position ?? -1) + 1,
        },
      });
      // The first section takes every existing question.
      if (!last) {
        await tx.assessmentQuestion.updateMany({
          where: { assessmentId },
          data: { sectionId: section.id },
        });
      }
      return section;
    }),
  );
}

async function requireSection(
  db: PrismaClient,
  sectionId: string,
  userId: string,
) {
  const section = await db.assessmentSection.findUnique({
    where: { id: sectionId },
    select: { id: true, assessmentId: true },
  });
  if (!section) throw new TRPCError({ code: "NOT_FOUND" });
  await requireEditableAssessment(db, section.assessmentId, userId);
  return section;
}

export async function updateSection(
  db: PrismaClient,
  input: z.infer<typeof updateSectionInput>,
  userId: string,
) {
  await requireSection(db, input.sectionId, userId);
  const { sectionId, instructions, ...fields } = input;
  return db.assessmentSection.update({
    where: { id: sectionId },
    data: { ...fields, ...instructionsData(instructions) },
  });
}

/**
 * Deletes a section. Its questions move to the previous section (or the next one); deleting the
 * only section leaves the assessment without sections.
 */
export async function deleteSection(
  db: PrismaClient,
  sectionId: string,
  userId: string,
) {
  const section = await requireSection(db, sectionId, userId);
  return withTransactionRetry(() =>
    db.$transaction(async (tx) => {
      await lockAssessment(tx, section.assessmentId);
      const sections = await tx.assessmentSection.findMany({
        where: { assessmentId: section.assessmentId },
        orderBy: { position: "asc" },
        select: { id: true },
      });
      const index = sections.findIndex(({ id }) => id === sectionId);
      if (index < 0) throw new TRPCError({ code: "NOT_FOUND" });
      const target = sections[index - 1] ?? sections[index + 1] ?? null;
      await tx.assessmentQuestion.updateMany({
        where: { sectionId },
        data: { sectionId: target?.id ?? null },
      });
      await tx.assessmentSection.delete({ where: { id: sectionId } });
      await writeSectionOrder(
        tx,
        sections.filter(({ id }) => id !== sectionId).map(({ id }) => id),
      );
      await normalizeQuestionPositions(tx, section.assessmentId);
      return { deleted: true, movedToSectionId: target?.id ?? null };
    }),
  );
}

/**
 * Saves the whole layout: section order and every question's section and position. The layout
 * must list every section and every question of the assessment exactly once.
 */
export async function arrangeQuestions(
  db: PrismaClient,
  input: z.infer<typeof arrangeQuestionsInput>,
  userId: string,
) {
  await requireEditableAssessment(db, input.assessmentId, userId);
  return withTransactionRetry(() =>
    db.$transaction(async (tx) => {
      await lockAssessment(tx, input.assessmentId);
      const [sections, questions] = await Promise.all([
        tx.assessmentSection.findMany({
          where: { assessmentId: input.assessmentId },
          select: { id: true },
        }),
        tx.assessmentQuestion.findMany({
          where: { assessmentId: input.assessmentId },
          select: { id: true },
        }),
      ]);
      const sectionIds = input.sections.map(({ sectionId }) => sectionId);
      const listedQuestionIds = input.sections.flatMap(
        ({ questionIds }) => questionIds,
      );
      const valid =
        (sections.length
          ? sectionIds.length === sections.length &&
            new Set(sectionIds).size === sections.length &&
            sections.every(({ id }) => sectionIds.includes(id))
          : sectionIds.length === 1 && sectionIds[0] === null) &&
        listedQuestionIds.length === questions.length &&
        new Set(listedQuestionIds).size === questions.length &&
        questions.every(({ id }) => listedQuestionIds.includes(id));
      if (!valid) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "Susunan soal sudah berubah di tempat lain. Muat ulang halaman, lalu coba lagi.",
        });
      }
      await writeSectionOrder(
        tx,
        sectionIds.filter((id): id is string => id !== null),
      );
      await writeQuestionLayout(
        tx,
        input.sections.flatMap(({ sectionId, questionIds }) =>
          questionIds.map((id) => ({ id, sectionId })),
        ),
      );
      // A question moved out of its group's run leaves the group.
      const { detached } = await repairQuestionGroups(tx, input.assessmentId);
      return { arranged: questions.length, detachedFromGroups: detached };
    }),
  );
}
