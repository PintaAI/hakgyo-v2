import { TRPCError } from "@trpc/server";

import { Prisma, type PrismaClient } from "../../../generated/prisma/client";
import {
  MAX_ASSESSMENT_OPTIONS,
  MIN_ASSESSMENT_OPTIONS,
} from "~/lib/assessment-options";
import {
  requireAssessmentManagement,
  requireEditableAssessment,
} from "~/server/assessment/access";
import type {
  CreateOptionInput,
  CreateQuestionInput,
  UpdateOptionInput,
} from "~/server/assessment/inputs";
import { requireContentAuthor } from "~/server/authorization";
import { withTransactionRetry } from "~/server/db-retry";
import { toPrismaJsonValue } from "~/server/prisma-json";

type DatabaseClient = Prisma.TransactionClient | Prisma.DefaultPrismaClient;

function nullableJson(value: Prisma.JsonValue) {
  return value === null ? Prisma.DbNull : toPrismaJsonValue(value);
}

/** Library list for an author; advanced-mode teachers only see their own assessments. */
export async function listAssessmentsForAuthor(
  db: DatabaseClient,
  organizationId: string,
  userId: string,
) {
  const member = await requireContentAuthor({ organizationId, userId });
  const assessments = await db.assessment.findMany({
    where: {
      organizationId,
      ...(member.organization.permissionMode === "ADVANCED" &&
      member.role === "TEACHER"
        ? { createdByMembershipId: member.id }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    // List views only need summary fields; `instructions` (rich JSON) is loaded by `get`.
    select: {
      id: true,
      organizationId: true,
      title: true,
      description: true,
      passingScore: true,
      maxAttempts: true,
      timeLimitMinutes: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  // Relation `_count` compiles to whole-table grouped subqueries; count only these rows.
  const assessmentIds = assessments.map((assessment) => assessment.id);
  const [questionGroups, courseItemGroups, liveItemGroups] =
    assessmentIds.length
      ? await Promise.all([
          db.assessmentQuestion.groupBy({
            by: ["assessmentId"],
            where: { assessmentId: { in: assessmentIds } },
            _count: { _all: true },
          }),
          db.courseItem.groupBy({
            by: ["assessmentId"],
            where: { assessmentId: { in: assessmentIds } },
            _count: { _all: true },
          }),
          db.courseItem.findMany({
            where: {
              assessmentId: { in: assessmentIds },
              isPublished: true,
              module: { course: { status: "PUBLISHED" } },
            },
            select: {
              assessmentId: true,
              module: { select: { courseId: true } },
            },
          }),
        ])
      : [[], [], []];
  const questionCounts = new Map(
    questionGroups.map((group) => [group.assessmentId, group._count._all]),
  );
  const courseItemCounts = new Map(
    courseItemGroups.map((group) => [group.assessmentId, group._count._all]),
  );
  const liveItemCounts = new Map<string, number>();
  const liveCourseIds = new Map<string, Set<string>>();
  for (const item of liveItemGroups) {
    if (!item.assessmentId) continue;
    liveItemCounts.set(
      item.assessmentId,
      (liveItemCounts.get(item.assessmentId) ?? 0) + 1,
    );
    const courses = liveCourseIds.get(item.assessmentId) ?? new Set();
    courses.add(item.module.courseId);
    liveCourseIds.set(item.assessmentId, courses);
  }
  return assessments.map((assessment) => ({
    ...assessment,
    _count: {
      questions: questionCounts.get(assessment.id) ?? 0,
      courseItems: courseItemCounts.get(assessment.id) ?? 0,
      /** Visible items in published courses (open events not counted). */
      liveCourseItems: liveItemCounts.get(assessment.id) ?? 0,
      /** Distinct published courses showing the assessment. */
      liveCourses: liveCourseIds.get(assessment.id)?.size ?? 0,
    },
  }));
}

/**
 * Deep copy into a new library assessment (settings, questions, options, asset links), e.g.
 * to edit a live assessment. The copy is not placed anywhere.
 */
export async function duplicateAssessment(
  db: PrismaClient,
  assessmentId: string,
  userId: string,
) {
  const source = await db.assessment.findUnique({
    where: { id: assessmentId },
    select: {
      organizationId: true,
      title: true,
      description: true,
      editorSchemaVersion: true,
      instructions: true,
      passingScore: true,
      maxAttempts: true,
      timeLimitMinutes: true,
      shuffleQuestions: true,
      shuffleOptions: true,
      questions: {
        orderBy: { position: "asc" },
        select: {
          type: true,
          prompt: true,
          explanation: true,
          points: true,
          position: true,
          options: {
            orderBy: { position: "asc" },
            select: { content: true, isCorrect: true, position: true },
          },
        },
      },
      assets: { select: { assetId: true } },
    },
  });
  if (!source) throw new TRPCError({ code: "NOT_FOUND" });
  // Same permission as `create` in the organization, plus read access to the source.
  await requireAssessmentManagement(db, assessmentId, userId);
  const member = await requireContentAuthor({
    organizationId: source.organizationId,
    userId,
  });
  const { questions, assets, ...fields } = source;
  const suffix = " (salinan)";
  return db.$transaction(async (tx) => {
    const copy = await tx.assessment.create({
      data: {
        ...fields,
        title: `${fields.title.slice(0, 200 - suffix.length)}${suffix}`,
        instructions: nullableJson(fields.instructions),
        createdByMembershipId: member.id,
      },
      select: { id: true },
    });
    // Three statements regardless of size: questions (returning ids by
    // position), then every option.
    const createdQuestions = questions.length
      ? await tx.assessmentQuestion.createManyAndReturn({
          data: questions.map(({ options: _options, ...question }) => ({
            ...question,
            prompt: toPrismaJsonValue(question.prompt),
            explanation: nullableJson(question.explanation),
            assessmentId: copy.id,
          })),
          select: { id: true, position: true },
        })
      : [];
    const questionIdByPosition = new Map(
      createdQuestions.map((question) => [question.position, question.id]),
    );
    const options = questions.flatMap((question) =>
      question.options.map((option) => ({
        ...option,
        content: toPrismaJsonValue(option.content),
        questionId: questionIdByPosition.get(question.position)!,
      })),
    );
    if (options.length) {
      await tx.assessmentOption.createMany({ data: options });
    }
    if (assets.length) {
      await tx.assessmentAsset.createMany({
        data: assets.map(({ assetId }) => ({
          assessmentId: copy.id,
          assetId,
          organizationId: source.organizationId,
        })),
        skipDuplicates: true,
      });
    }
    return { assessmentId: copy.id };
  });
}

export async function createQuestion(
  db: PrismaClient,
  input: CreateQuestionInput,
  userId: string,
) {
  await requireEditableAssessment(db, input.assessmentId, userId);
  // Lock the assessment so concurrent creates cannot compute the same next position.
  return withTransactionRetry(() =>
    db.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT "id" FROM "Assessment" WHERE "id" = ${input.assessmentId} FOR UPDATE
      `;
      const position = await tx.assessmentQuestion.aggregate({
        where: { assessmentId: input.assessmentId },
        _max: { position: true },
      });
      return tx.assessmentQuestion.create({
        data: { ...input, position: (position._max.position ?? -1) + 1 },
      });
    }),
  );
}

export async function createOption(
  db: PrismaClient,
  input: CreateOptionInput,
  userId: string,
) {
  const question = await db.assessmentQuestion.findUnique({
    where: { id: input.questionId },
    select: { assessmentId: true, type: true },
  });
  if (!question) throw new TRPCError({ code: "NOT_FOUND" });
  if (question.type === "WRITTEN") throw new TRPCError({ code: "BAD_REQUEST" });
  await requireEditableAssessment(db, question.assessmentId, userId);
  // Lock the question so the option cap and the next position are checked against
  // committed options only, one create at a time.
  return withTransactionRetry(() =>
    db.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT "id" FROM "AssessmentQuestion" WHERE "id" = ${input.questionId} FOR UPDATE
      `;
      const position = await tx.assessmentOption.aggregate({
        where: { questionId: input.questionId },
        _count: { _all: true },
        _max: { position: true },
      });
      if (position._count._all >= MAX_ASSESSMENT_OPTIONS) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Sebuah soal pilihan maksimal memiliki empat opsi.",
        });
      }
      return tx.assessmentOption.create({
        data: { ...input, position: (position._max.position ?? -1) + 1 },
      });
    }),
  );
}

export async function updateOption(
  db: PrismaClient,
  input: UpdateOptionInput,
  userId: string,
) {
  const option = await db.assessmentOption.findUnique({
    where: { id: input.optionId },
    select: {
      questionId: true,
      question: { select: { assessmentId: true, type: true } },
    },
  });
  if (!option) throw new TRPCError({ code: "NOT_FOUND" });
  await requireEditableAssessment(db, option.question.assessmentId, userId);
  const { optionId, ...data } = input;

  if (data.isCorrect && option.question.type === "SINGLE_CHOICE") {
    // The question row lock serializes concurrent "mark correct" calls for the same question,
    // so exactly one option ends up correct without serializable isolation.
    return withTransactionRetry(() =>
      db.$transaction(async (tx) => {
        await tx.$queryRaw`
          SELECT "id" FROM "AssessmentQuestion" WHERE "id" = ${option.questionId} FOR UPDATE
        `;
        await tx.assessmentOption.updateMany({
          where: {
            questionId: option.questionId,
            id: { not: optionId },
            isCorrect: true,
          },
          data: { isCorrect: false },
        });
        return tx.assessmentOption.update({ where: { id: optionId }, data });
      }),
    );
  }

  return db.assessmentOption.update({ where: { id: optionId }, data });
}

export async function deleteOption(
  db: DatabaseClient,
  optionId: string,
  userId: string,
) {
  const option = await db.assessmentOption.findUnique({
    where: { id: optionId },
    select: {
      question: {
        select: {
          assessmentId: true,
          type: true,
          _count: { select: { options: true } },
        },
      },
    },
  });
  if (!option) throw new TRPCError({ code: "NOT_FOUND" });
  await requireEditableAssessment(
    db,
    option.question.assessmentId,
    userId,
    "delete",
  );
  if (
    option.question.type !== "WRITTEN" &&
    option.question._count.options <= MIN_ASSESSMENT_OPTIONS
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Sebuah soal pilihan harus memiliki minimal dua opsi.",
    });
  }
  await db.assessmentOption.delete({ where: { id: optionId } });
  return { deleted: true };
}

/** Links a confirmed asset of the same organization; linking twice is a no-op. */
export async function attachAsset(
  db: DatabaseClient,
  input: { assessmentId: string; assetId: string },
  userId: string,
) {
  const assessment = await requireEditableAssessment(
    db,
    input.assessmentId,
    userId,
  );
  const asset = await db.asset.findFirst({
    where: {
      id: input.assetId,
      organizationId: assessment.organizationId,
      confirmedAt: { not: null },
      deletedAt: null,
    },
    select: { id: true },
  });
  if (!asset) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Asset must be confirmed and belong to the assessment organization",
    });
  }
  const link = { assessmentId: input.assessmentId, assetId: input.assetId };
  return db.assessmentAsset.upsert({
    where: { assessmentId_assetId: link },
    create: { ...link, organizationId: assessment.organizationId },
    update: {},
  });
}
