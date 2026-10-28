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
import { normalizeQuestionPositions } from "~/server/assessment/sections";
import { createId } from "~/server/batch";
import { HAKGYO_SYSTEM_ORGANIZATION_ID } from "~/server/foundation/constants";
import { questionCopyRows } from "~/server/assessment/copy";
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
      scoreBands: true,
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
          tags: true,
          sectionId: true,
          groupId: true,
          options: {
            orderBy: { position: "asc" },
            select: { content: true, isCorrect: true, position: true },
          },
        },
      },
      sections: {
        orderBy: { position: "asc" },
        omit: { assessmentId: true, createdAt: true, updatedAt: true },
      },
      questionGroups: {
        select: { id: true, instructions: true, stimulus: true },
      },
      assets: {
        select: {
          assetId: true,
          assetOrganizationId: true,
          asset: { select: { sharedAt: true } },
        },
      },
    },
  });
  if (!source) throw new TRPCError({ code: "NOT_FOUND" });
  // Same permission as `create` in the organization, plus read access to the source.
  const managed = await requireAssessmentManagement(db, assessmentId, userId);
  // Packages come from the bank through the generator, never as plain copies.
  if (managed.kind === "BANK") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Bank soal tidak bisa diduplikat.",
    });
  }
  const member = await requireContentAuthor({
    organizationId: source.organizationId,
    userId,
  });
  const { questions, assets, sections, questionGroups, ...fields } = source;
  const suffix = " (salinan)";
  return db.$transaction(async (tx) => {
    const copy = await tx.assessment.create({
      data: {
        ...fields,
        title: `${fields.title.slice(0, 200 - suffix.length)}${suffix}`,
        instructions: nullableJson(fields.instructions),
        scoreBands: nullableJson(fields.scoreBands),
        createdByMembershipId: member.id,
      },
      select: { id: true },
    });
    const sectionIds = new Map(
      sections.map((section) => [section.id, createId()]),
    );
    if (sections.length) {
      await tx.assessmentSection.createMany({
        data: sections.map(({ id, ...section }) => ({
          ...section,
          id: sectionIds.get(id)!,
          instructions: nullableJson(section.instructions),
          assessmentId: copy.id,
        })),
      });
    }
    // Three statements regardless of size: groups, questions, then every option.
    const rows = questionCopyRows({
      assessmentId: copy.id,
      questions,
      groups: questionGroups,
      sectionIds,
    });
    if (rows.groups.length) {
      await tx.assessmentQuestionGroup.createMany({ data: rows.groups });
    }
    if (rows.questions.length) {
      await tx.assessmentQuestion.createMany({ data: rows.questions });
    }
    if (rows.options.length) {
      await tx.assessmentOption.createMany({ data: rows.options });
    }
    // A copy points at the same files and keeps their owner; another organization's file only
    // while Hakgyo still shares it.
    const links = assets.filter(
      ({ assetOrganizationId, asset }) =>
        assetOrganizationId === source.organizationId || asset.sharedAt,
    );
    if (links.length) {
      await tx.assessmentAsset.createMany({
        data: links.map(({ assetId, assetOrganizationId }) => ({
          assessmentId: copy.id,
          assetId,
          organizationId: source.organizationId,
          assetOrganizationId,
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
      const [position, sections] = await Promise.all([
        tx.assessmentQuestion.aggregate({
          where: { assessmentId: input.assessmentId },
          _max: { position: true },
        }),
        tx.assessmentSection.findMany({
          where: { assessmentId: input.assessmentId },
          orderBy: { position: "asc" },
          select: { id: true },
        }),
      ]);
      if (
        input.sectionId &&
        !sections.some((section) => section.id === input.sectionId)
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Bagian tidak valid.",
        });
      }
      // With sections every question belongs to one: the chosen one, else the last.
      const sectionId = sections.length
        ? (input.sectionId ?? sections.at(-1)!.id)
        : null;
      const created = await tx.assessmentQuestion.create({
        data: {
          ...input,
          sectionId,
          position: (position._max.position ?? -1) + 1,
        },
      });
      if (sectionId && sectionId !== sections.at(-1)?.id) {
        await normalizeQuestionPositions(tx, input.assessmentId);
        return tx.assessmentQuestion.findUniqueOrThrow({
          where: { id: created.id },
        });
      }
      return created;
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

/**
 * Links a confirmed asset of the assessment's organization, or a shared Hakgyo asset (question bank
 * media, docs/eps-question-generator.md section 3.1); linking twice is a no-op.
 */
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
      confirmedAt: { not: null },
      deletedAt: null,
      OR: [
        { organizationId: assessment.organizationId },
        {
          organizationId: HAKGYO_SYSTEM_ORGANIZATION_ID,
          sharedAt: { not: null },
        },
      ],
    },
    select: { id: true, organizationId: true },
  });
  if (!asset) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Asset must be confirmed and belong to the assessment organization or be shared by Hakgyo",
    });
  }
  const link = { assessmentId: input.assessmentId, assetId: input.assetId };
  try {
    const linked = await db.assessmentAsset.upsert({
      where: { assessmentId_assetId: link },
      create: {
        ...link,
        organizationId: assessment.organizationId,
        assetOrganizationId: asset.organizationId,
      },
      update: {},
    });
    // Bank media are shared with every organization whose package uses them (section 3.1 of
    // docs/eps-question-generator.md).
    if (
      assessment.kind === "BANK" &&
      asset.organizationId === HAKGYO_SYSTEM_ORGANIZATION_ID
    ) {
      await db.asset.updateMany({
        where: { id: asset.id, sharedAt: null },
        data: { sharedAt: new Date() },
      });
    }
    return linked;
  } catch (error) {
    // Hakgyo stopped sharing the asset after the check above (the database refuses the link).
    if (error instanceof Error && error.message.includes("is not shared")) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Asset is no longer shared by Hakgyo",
      });
    }
    throw error;
  }
}

/**
 * Questions of an assessment with their answer key, for staff reports (item analysis, exports).
 * Every staff-facing read of keys outside the editor goes through here, so content that hides
 * its keys (generated packages, `docs/eps-question-generator.md` section 3) can strip them in one
 * place. The caller must already have authorized the staff member.
 */
export async function loadAssessmentKeyForStaff(
  db: DatabaseClient,
  assessmentId: string,
) {
  return db.assessmentQuestion.findMany({
    where: { assessmentId },
    orderBy: { position: "asc" },
    select: {
      id: true,
      type: true,
      prompt: true,
      points: true,
      tags: true,
      options: {
        orderBy: { position: "asc" },
        select: { id: true, content: true, isCorrect: true },
      },
    },
  });
}
