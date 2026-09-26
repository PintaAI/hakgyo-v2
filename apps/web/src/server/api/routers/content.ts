import { collectPdfPageRanges } from "@hakgyo/shared";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { Prisma } from "../../../../generated/prisma/client";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  requireContentAuthor,
  requireCoursePermission,
} from "~/server/authorization";
import { db } from "~/server/db";
import {
  deleteCourseItemsWithProgress,
  deleteMaterialWithProgress,
  deleteVocabularySetWithProgress,
} from "~/server/content-resource-deletion";
import {
  assertPublishedMaterialReferences,
  sanitizeMaterialContent,
} from "~/server/material-reference-service";
import {
  extractVocabularyFromImage,
  type ExtractedVocabularyEntry,
} from "~/server/ai/vocabulary-extraction";
import { syncMaterialPdfPageAssets } from "~/server/pdf-book/service";
import { getAssessmentPublishValidationError } from "~/lib/assessment-publication";

const id = z.string().min(1);
const vocabularyPreviewEntryCount = 3;
const json = z.custom<Prisma.InputJsonValue>((value) => value !== undefined);
const serializedJson = z
  .unknown()
  .transform((value) => value as Prisma.InputJsonValue);
const blockNoteDocument = z
  .array(z.record(z.string(), z.unknown()))
  .min(1)
  .max(5000)
  .transform((value) => value as Prisma.InputJsonValue);
const itemRelation = z.discriminatedUnion("type", [
  z.object({ type: z.literal("MATERIAL"), materialId: id }),
  z.object({ type: z.literal("ASSESSMENT"), assessmentId: id }),
  z.object({ type: z.literal("VOCABULARY_SET"), vocabularySetId: id }),
]);
const requirementRelation = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("ASSESSMENT"),
    assessmentId: id,
    minimumScore: z.number().int().min(0).max(100).nullable().optional(),
  }),
  z.object({ type: z.literal("VOCABULARY_SET"), vocabularySetId: id }),
]);
async function reorder(
  model: "courseModule" | "courseItem" | "materialRequirement",
  parent: Record<string, string>,
  ids: string[],
) {
  if (new Set(ids).size !== ids.length)
    throw new TRPCError({ code: "BAD_REQUEST", message: "Duplicate IDs" });
  await db.$transaction(async (tx) => {
    const delegate = tx[model] as unknown as {
      findMany(args: {
        where: Record<string, unknown>;
        select: { id: true; position: true };
      }): Promise<Array<{ id: string; position: number }>>;
    };
    const resources = await delegate.findMany({
      where: parent,
      select: { id: true, position: true },
    });
    const requestedIds = new Set(ids);
    if (
      resources.length !== ids.length ||
      resources.some((resource) => !requestedIds.has(resource.id))
    )
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "All resources must be included",
      });
    if (ids.length === 0) return;

    const temporaryPosition =
      Math.max(...resources.map((resource) => resource.position)) + 1;
    const config = {
      courseModule: ["CourseModule", "courseId"],
      courseItem: ["CourseItem", "moduleId"],
      materialRequirement: ["MaterialRequirement", "materialId"],
    } as const;
    const [table, parentColumn] = config[model];
    const parentId = parent[parentColumn];
    if (!parentId) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const updatePositions = (positions: number[]) =>
      tx.$executeRaw(
        Prisma.sql`
          UPDATE ${Prisma.raw(`"${table}"`)} AS target
          SET "position" = ordering.position
          FROM (VALUES ${Prisma.join(
            ids.map(
              (resourceId, index) =>
                Prisma.sql`(${resourceId}, ${positions[index]})`,
            ),
          )}) AS ordering(id, position)
          WHERE target."id" = ordering.id
            AND target.${Prisma.raw(`"${parentColumn}"`)} = ${parentId}
        `,
      );

    await updatePositions(ids.map((_, index) => temporaryPosition + index));
    await updatePositions(ids.map((_, index) => index));
  });
}

// Publishing a course item also publishes its draft assessment, so the
// assessment must pass the same checks as publishing from the editor.
async function getDraftAssessmentToPublish(assessmentId: string) {
  const assessment = await db.assessment.findUnique({
    where: { id: assessmentId },
    select: {
      status: true,
      questions: {
        orderBy: { position: "asc" },
        select: {
          type: true,
          prompt: true,
          options: {
            orderBy: { position: "asc" },
            select: { content: true, isCorrect: true },
          },
        },
      },
    },
  });
  if (!assessment) throw new TRPCError({ code: "NOT_FOUND" });
  if (assessment.status !== "DRAFT") return null;
  const validationError = getAssessmentPublishValidationError(
    assessment.questions,
  );
  if (validationError)
    throw new TRPCError({ code: "BAD_REQUEST", message: validationError });
  return assessmentId;
}

async function publishDraftAssessment(
  tx: Prisma.TransactionClient,
  assessmentId: string | null,
) {
  if (!assessmentId) return;
  await tx.assessment.updateMany({
    where: { id: assessmentId, status: "DRAFT" },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });
}

async function requireContentOrganization(
  organizationId: string,
  userId: string,
) {
  return requireContentAuthor({ organizationId, userId });
}

async function requireOwnedContent(
  organizationId: string,
  userId: string,
  createdByMembershipId: string,
  action: "edit" | "delete" = "edit",
) {
  return requireContentAuthor({
    organizationId,
    userId,
    createdByMembershipId,
    action,
  });
}

function normalizeVocabularyTerm(term: string) {
  return term.trim().toLocaleLowerCase();
}

async function requireVocabularyAsset(
  assetId: string,
  organizationId: string,
  kind: "audio" | "image",
) {
  const asset = await db.asset.findFirst({
    where: {
      id: assetId,
      organizationId,
      confirmedAt: { not: null },
      deletedAt: null,
    },
    select: { contentType: true },
  });
  if (!asset?.contentType.startsWith(`${kind}/`)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `${kind === "audio" ? "Audio" : "Image"} asset must belong to the organization and have a valid content type`,
    });
  }
}

export const contentRouter = createTRPCRouter({
  createModule: protectedProcedure
    .input(
      z.object({
        courseId: id,
        title: z.string().trim().min(1).max(200),
        description: z.string().max(10000).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const course = await requireCoursePermission({
        courseId: input.courseId,
        permission: "content.manage",
        userId: ctx.actorUserId,
      });
      return db.$transaction(async (tx) => {
        const aggregate = await tx.courseModule.aggregate({
          where: { courseId: input.courseId },
          _max: { position: true },
        });
        return tx.courseModule.create({
          data: {
            ...input,
            organizationId: course.organizationId,
            position: (aggregate._max.position ?? -1) + 1,
          },
        });
      });
    }),
  updateModule: protectedProcedure
    .input(
      z.object({
        moduleId: id,
        title: z.string().trim().min(1).max(200).optional(),
        description: z.string().max(10000).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const courseModule = await db.courseModule.findUnique({
        where: { id: input.moduleId },
        select: { courseId: true },
      });
      if (!courseModule) throw new TRPCError({ code: "NOT_FOUND" });
      await requireCoursePermission({
        courseId: courseModule.courseId,
        permission: "content.manage",
        userId: ctx.actorUserId,
      });
      const { moduleId, ...data } = input;
      return db.courseModule.update({ where: { id: moduleId }, data });
    }),
  deleteModule: protectedProcedure
    .input(z.object({ moduleId: id }))
    .mutation(async ({ ctx, input }) => {
      const courseModule = await db.courseModule.findUnique({
        where: { id: input.moduleId },
        select: { courseId: true },
      });
      if (!courseModule) throw new TRPCError({ code: "NOT_FOUND" });
      await requireCoursePermission({
        courseId: courseModule.courseId,
        permission: "content.manage",
        userId: ctx.actorUserId,
      });
      await db.courseModule.delete({ where: { id: input.moduleId } });
      return { deleted: true };
    }),
  reorderModules: protectedProcedure
    .input(z.object({ courseId: id, moduleIds: z.array(id).max(500) }))
    .mutation(async ({ ctx, input }) => {
      await requireCoursePermission({
        courseId: input.courseId,
        permission: "content.manage",
        userId: ctx.actorUserId,
      });
      await reorder(
        "courseModule",
        { courseId: input.courseId },
        input.moduleIds,
      );
      return { reordered: true };
    }),
  createItem: protectedProcedure
    .input(
      z.object({
        moduleId: id,
        isPublished: z.boolean().optional(),
        relation: itemRelation,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const courseModule = await db.courseModule.findUnique({
        where: { id: input.moduleId },
        select: { courseId: true, organizationId: true },
      });
      if (!courseModule) throw new TRPCError({ code: "NOT_FOUND" });
      await requireCoursePermission({
        courseId: courseModule.courseId,
        permission: "content.manage",
        userId: ctx.actorUserId,
      });
      const relationId =
        "materialId" in input.relation
          ? input.relation.materialId
          : "assessmentId" in input.relation
            ? input.relation.assessmentId
            : input.relation.vocabularySetId;
      const resource =
        input.relation.type === "MATERIAL"
          ? await db.material.findFirst({
              where: {
                id: relationId,
                organizationId: courseModule.organizationId,
              },
              select: { id: true, createdByMembershipId: true },
            })
          : input.relation.type === "ASSESSMENT"
            ? await db.assessment.findFirst({
                where: {
                  id: relationId,
                  organizationId: courseModule.organizationId,
                },
                select: { id: true, createdByMembershipId: true },
              })
            : await db.vocabularySet.findFirst({
                where: {
                  id: relationId,
                  organizationId: courseModule.organizationId,
                },
                select: { id: true, createdByMembershipId: true },
              });
      if (!resource)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Content must belong to the module organization",
        });
      await requireOwnedContent(
        courseModule.organizationId,
        ctx.actorUserId,
        resource.createdByMembershipId,
      );
      if (input.isPublished && input.relation.type === "MATERIAL") {
        const material = await db.material.findUnique({
          where: { id: input.relation.materialId },
          select: { content: true },
        });
        if (!material) throw new TRPCError({ code: "NOT_FOUND" });
        await assertPublishedMaterialReferences(db, {
          content: material.content,
          moduleId: input.moduleId,
          organizationId: courseModule.organizationId,
        });
      }
      const assessmentToPublish =
        input.isPublished && input.relation.type === "ASSESSMENT"
          ? await getDraftAssessmentToPublish(input.relation.assessmentId)
          : null;
      return db.$transaction(async (tx) => {
        await publishDraftAssessment(tx, assessmentToPublish);
        const aggregate = await tx.courseItem.aggregate({
          where: { moduleId: input.moduleId },
          _max: { position: true },
        });
        return tx.courseItem.create({
          data: {
            moduleId: input.moduleId,
            organizationId: courseModule.organizationId,
            isPublished: input.isPublished,
            position: (aggregate._max.position ?? -1) + 1,
            ...input.relation,
          },
        });
      });
    }),
  updateItem: protectedProcedure
    .input(
      z.object({
        itemId: id,
        isPublished: z.boolean().optional(),
        relation: itemRelation.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const item = await db.courseItem.findUnique({
        where: { id: input.itemId },
        select: {
          organizationId: true,
          moduleId: true,
          isPublished: true,
          materialId: true,
          assessmentId: true,
          module: { select: { courseId: true } },
        },
      });
      if (!item) throw new TRPCError({ code: "NOT_FOUND" });
      await requireCoursePermission({
        courseId: item.module.courseId,
        permission: "content.manage",
        userId: ctx.actorUserId,
      });
      if (input.relation) {
        const relationId =
          "materialId" in input.relation
            ? input.relation.materialId
            : "assessmentId" in input.relation
              ? input.relation.assessmentId
              : input.relation.vocabularySetId;
        const resource =
          input.relation.type === "MATERIAL"
            ? await db.material.findFirst({
                where: { id: relationId, organizationId: item.organizationId },
                select: { id: true, createdByMembershipId: true },
              })
            : input.relation.type === "ASSESSMENT"
              ? await db.assessment.findFirst({
                  where: {
                    id: relationId,
                    organizationId: item.organizationId,
                  },
                  select: { id: true, createdByMembershipId: true },
                })
              : await db.vocabularySet.findFirst({
                  where: {
                    id: relationId,
                    organizationId: item.organizationId,
                  },
                  select: { id: true, createdByMembershipId: true },
                });
        if (!resource)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Content must belong to the item organization",
          });
        await requireOwnedContent(
          item.organizationId,
          ctx.actorUserId,
          resource.createdByMembershipId,
        );
      }
      if (
        (input.isPublished ?? item.isPublished) &&
        (input.relation || input.isPublished === true)
      ) {
        const materialId =
          input.relation?.type === "MATERIAL"
            ? input.relation.materialId
            : input.relation
              ? null
              : item.materialId;
        // Only load the (potentially large) material document when it is checked.
        const content = materialId
          ? (
              await db.material.findUnique({
                where: { id: materialId },
                select: { content: true },
              })
            )?.content
          : null;
        if (materialId && content) {
          await assertPublishedMaterialReferences(db, {
            content,
            moduleId: item.moduleId,
            organizationId: item.organizationId,
          });
        }
      }
      const nextAssessmentId =
        input.relation?.type === "ASSESSMENT"
          ? input.relation.assessmentId
          : input.relation
            ? null
            : item.assessmentId;
      const assessmentToPublish =
        (input.isPublished ?? item.isPublished) &&
        (input.relation || input.isPublished === true) &&
        nextAssessmentId
          ? await getDraftAssessmentToPublish(nextAssessmentId)
          : null;
      return db.$transaction(async (tx) => {
        await publishDraftAssessment(tx, assessmentToPublish);
        return tx.courseItem.update({
          where: { id: input.itemId },
          data: {
            isPublished: input.isPublished,
            ...(input.relation
              ? {
                  materialId: null,
                  assessmentId: null,
                  vocabularySetId: null,
                  ...input.relation,
                }
              : {}),
          },
        });
      });
    }),
  deleteItem: protectedProcedure
    .input(z.object({ itemId: id }))
    .mutation(async ({ ctx, input }) => {
      const item = await db.courseItem.findUnique({
        where: { id: input.itemId },
        select: { module: { select: { courseId: true } } },
      });
      if (!item) throw new TRPCError({ code: "NOT_FOUND" });
      await requireCoursePermission({
        courseId: item.module.courseId,
        permission: "content.manage",
        userId: ctx.actorUserId,
      });
      const removed = await db.$transaction((tx) =>
        deleteCourseItemsWithProgress(tx, [input.itemId]),
      );
      return { deleted: true, removed };
    }),
  reorderItems: protectedProcedure
    .input(z.object({ moduleId: id, itemIds: z.array(id).max(1000) }))
    .mutation(async ({ ctx, input }) => {
      const courseModule = await db.courseModule.findUnique({
        where: { id: input.moduleId },
        select: { courseId: true },
      });
      if (!courseModule) throw new TRPCError({ code: "NOT_FOUND" });
      await requireCoursePermission({
        courseId: courseModule.courseId,
        permission: "content.manage",
        userId: ctx.actorUserId,
      });
      await reorder("courseItem", { moduleId: input.moduleId }, input.itemIds);
      return { reordered: true };
    }),

  listMaterials: protectedProcedure
    .input(z.object({ organizationId: id }))
    .query(async ({ ctx, input }) => {
      const member = await requireContentOrganization(
        input.organizationId,
        ctx.actorUserId,
      );
      return db.material.findMany({
        where: {
          organizationId: input.organizationId,
          ...(member.organization.permissionMode === "ADVANCED" &&
          member.role === "TEACHER"
            ? { createdByMembershipId: member.id }
            : {}),
        },
        orderBy: { updatedAt: "desc" },
        // List views only render metadata and usage; the document itself is
        // fetched per material through getMaterial.
        select: {
          id: true,
          title: true,
          description: true,
          createdAt: true,
          updatedAt: true,
          createdByMembershipId: true,
          createdBy: { select: { id: true, user: { select: { name: true } } } },
          courseItems: {
            select: {
              module: {
                select: {
                  title: true,
                  course: {
                    select: { id: true, title: true, thumbnailUrl: true },
                  },
                },
              },
            },
          },
        },
      });
    }),
  countMaterials: protectedProcedure
    .input(z.object({ organizationId: id }))
    .query(async ({ ctx, input }) => {
      const member = await requireContentOrganization(
        input.organizationId,
        ctx.actorUserId,
      );
      return db.material.count({
        where: {
          organizationId: input.organizationId,
          ...(member.organization.permissionMode === "ADVANCED" &&
          member.role === "TEACHER"
            ? { createdByMembershipId: member.id }
            : {}),
        },
      });
    }),
  /** PDF page ranges of the materials used in a course, keyed by material id. */
  listCoursePdfPageRanges: protectedProcedure
    .input(z.object({ courseId: id }))
    .query(async ({ ctx, input }) => {
      await requireCoursePermission({
        courseId: input.courseId,
        permission: "content.manage",
        userId: ctx.actorUserId,
      });
      const materials = await db.material.findMany({
        where: {
          courseItems: { some: { module: { courseId: input.courseId } } },
        },
        select: { id: true, content: true },
      });
      return Object.fromEntries(
        materials.flatMap(({ id: materialId, content }) => {
          const ranges = collectPdfPageRanges(content);
          return ranges.length ? [[materialId, ranges] as const] : [];
        }),
      );
    }),
  getMaterial: protectedProcedure
    .input(z.object({ organizationId: id, materialId: id }))
    .query(async ({ ctx, input }) => {
      const material = await db.material.findFirst({
        where: { id: input.materialId, organizationId: input.organizationId },
        include: {
          completionRequirements: { orderBy: { position: "asc" } },
          assets: { include: { asset: true } },
        },
      });
      if (!material) throw new TRPCError({ code: "NOT_FOUND" });
      await requireOwnedContent(
        input.organizationId,
        ctx.actorUserId,
        material.createdByMembershipId,
      );
      return material;
    }),
  createMaterial: protectedProcedure
    .input(
      z.object({
        organizationId: id,
        title: z.string().trim().min(1).max(200),
        description: z.string().max(10000).nullable().optional(),
        content: blockNoteDocument,
        editorSchemaVersion: z.number().int().positive().optional(),
        requirementPolicy: z.enum(["ALL", "ANY"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const member = await requireContentOrganization(
        input.organizationId,
        ctx.actorUserId,
      );
      const content = await sanitizeMaterialContent(
        db,
        input.organizationId,
        input.content,
      );
      return db.$transaction(async (tx) => {
        const material = await tx.material.create({
          data: { ...input, content, createdByMembershipId: member.id },
        });
        await syncMaterialPdfPageAssets(tx, {
          materialId: material.id,
          organizationId: input.organizationId,
          content,
        });
        return material;
      });
    }),
  createMaterialItem: protectedProcedure
    .input(
      z.object({
        moduleId: id,
        title: z.string().trim().min(1).max(200),
        description: z.string().max(10000).nullable().optional(),
        content: blockNoteDocument,
        editorSchemaVersion: z.number().int().positive().optional(),
        requirementPolicy: z.enum(["ALL", "ANY"]).optional(),
        isPublished: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const courseModule = await db.courseModule.findUnique({
        where: { id: input.moduleId },
        select: { courseId: true, organizationId: true },
      });
      if (!courseModule) throw new TRPCError({ code: "NOT_FOUND" });

      await requireCoursePermission({
        courseId: courseModule.courseId,
        permission: "content.manage",
        userId: ctx.actorUserId,
      });
      const member = await requireContentOrganization(
        courseModule.organizationId,
        ctx.actorUserId,
      );
      const { moduleId, isPublished, ...materialData } = input;
      const content = await sanitizeMaterialContent(
        db,
        courseModule.organizationId,
        materialData.content,
      );
      if (isPublished) {
        await assertPublishedMaterialReferences(db, {
          content,
          moduleId,
          organizationId: courseModule.organizationId,
        });
      }

      return db.$transaction(async (tx) => {
        const aggregate = await tx.courseItem.aggregate({
          where: { moduleId },
          _max: { position: true },
        });
        const material = await tx.material.create({
          data: {
            ...materialData,
            content,
            organizationId: courseModule.organizationId,
            createdByMembershipId: member.id,
          },
        });
        await syncMaterialPdfPageAssets(tx, {
          materialId: material.id,
          organizationId: courseModule.organizationId,
          content,
        });
        const item = await tx.courseItem.create({
          data: {
            moduleId,
            organizationId: courseModule.organizationId,
            type: "MATERIAL",
            materialId: material.id,
            isPublished,
            position: (aggregate._max.position ?? -1) + 1,
          },
        });

        return { material, item };
      });
    }),
  createVocabularySetItem: protectedProcedure
    .input(
      z.object({
        moduleId: id,
        title: z.string().trim().min(1).max(200),
        description: z.string().max(10000).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const courseModule = await db.courseModule.findUnique({
        where: { id: input.moduleId },
        select: { courseId: true, organizationId: true },
      });
      if (!courseModule) throw new TRPCError({ code: "NOT_FOUND" });

      await requireCoursePermission({
        courseId: courseModule.courseId,
        permission: "content.manage",
        userId: ctx.actorUserId,
      });
      const member = await requireContentOrganization(
        courseModule.organizationId,
        ctx.actorUserId,
      );

      return db.$transaction(async (tx) => {
        const aggregate = await tx.courseItem.aggregate({
          where: { moduleId: input.moduleId },
          _max: { position: true },
        });
        const vocabularySet = await tx.vocabularySet.create({
          data: {
            organizationId: courseModule.organizationId,
            createdByMembershipId: member.id,
            title: input.title,
            description: input.description,
          },
        });
        const item = await tx.courseItem.create({
          data: {
            moduleId: input.moduleId,
            organizationId: courseModule.organizationId,
            type: "VOCABULARY_SET",
            vocabularySetId: vocabularySet.id,
            isPublished: false,
            position: (aggregate._max.position ?? -1) + 1,
          },
        });

        return { vocabularySet, item };
      });
    }),
  createAssessmentItem: protectedProcedure
    .input(
      z.object({
        moduleId: id,
        title: z.string().trim().min(1).max(200),
        description: z.string().max(10000).nullable().optional(),
        editorSchemaVersion: z.number().int().positive().optional(),
        instructions: serializedJson.optional(),
        passingScore: z.number().int().min(0).max(100).nullable().optional(),
        maxAttempts: z.number().int().positive().nullable().optional(),
        timeLimitMinutes: z.number().int().positive().nullable().optional(),
        shuffleQuestions: z.boolean().optional(),
        shuffleOptions: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const courseModule = await db.courseModule.findUnique({
        where: { id: input.moduleId },
        select: { courseId: true, organizationId: true },
      });
      if (!courseModule) throw new TRPCError({ code: "NOT_FOUND" });

      await requireCoursePermission({
        courseId: courseModule.courseId,
        permission: "content.manage",
        userId: ctx.actorUserId,
      });
      const member = await requireContentOrganization(
        courseModule.organizationId,
        ctx.actorUserId,
      );

      return db.$transaction(async (tx) => {
        const aggregate = await tx.courseItem.aggregate({
          where: { moduleId: input.moduleId },
          _max: { position: true },
        });
        const assessment = await tx.assessment.create({
          data: {
            organizationId: courseModule.organizationId,
            createdByMembershipId: member.id,
            title: input.title,
            description: input.description,
            editorSchemaVersion: input.editorSchemaVersion,
            instructions: input.instructions,
            passingScore: input.passingScore,
            maxAttempts: input.maxAttempts,
            timeLimitMinutes: input.timeLimitMinutes,
            shuffleQuestions: input.shuffleQuestions,
            shuffleOptions: input.shuffleOptions,
            status: "DRAFT",
          },
        });
        const item = await tx.courseItem.create({
          data: {
            moduleId: input.moduleId,
            organizationId: courseModule.organizationId,
            type: "ASSESSMENT",
            assessmentId: assessment.id,
            isPublished: false,
            position: (aggregate._max.position ?? -1) + 1,
          },
        });

        return { assessment, item };
      });
    }),
  updateMaterial: protectedProcedure
    .input(
      z.object({
        organizationId: id,
        materialId: id,
        title: z.string().trim().min(1).max(200).optional(),
        description: z.string().max(10000).nullable().optional(),
        content: blockNoteDocument.optional(),
        editorSchemaVersion: z.number().int().positive().optional(),
        requirementPolicy: z.enum(["ALL", "ANY"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const material = await db.material.findFirst({
        where: { id: input.materialId, organizationId: input.organizationId },
        select: {
          createdByMembershipId: true,
          courseItems: {
            where: { isPublished: true },
            select: { moduleId: true },
          },
        },
      });
      if (!material) throw new TRPCError({ code: "NOT_FOUND" });
      await requireOwnedContent(
        input.organizationId,
        ctx.actorUserId,
        material.createdByMembershipId,
      );
      const { organizationId, materialId, ...data } = input;
      const content =
        data.content === undefined
          ? undefined
          : await sanitizeMaterialContent(db, organizationId, data.content);
      if (content !== undefined) {
        const moduleIds = new Set(
          material.courseItems.map(({ moduleId }) => moduleId),
        );
        await Promise.all(
          [...moduleIds].map((moduleId) =>
            assertPublishedMaterialReferences(db, {
              content,
              moduleId,
              organizationId,
            }),
          ),
        );
      }
      const result = await db.$transaction(async (tx) => {
        const updated = await tx.material.updateMany({
          where: { id: materialId, organizationId },
          data: { ...data, content },
        });
        if (updated.count && content !== undefined) {
          await syncMaterialPdfPageAssets(tx, {
            materialId,
            organizationId,
            content,
          });
        }
        return updated;
      });
      if (!result.count) throw new TRPCError({ code: "NOT_FOUND" });
      // Slim result: autosave runs often and the client already holds the
      // document it just sent.
      return db.material.findUniqueOrThrow({
        where: { id: materialId },
        select: {
          id: true,
          title: true,
          description: true,
          editorSchemaVersion: true,
          requirementPolicy: true,
          updatedAt: true,
        },
      });
    }),
  deleteMaterial: protectedProcedure
    .input(z.object({ organizationId: id, materialId: id }))
    .mutation(async ({ ctx, input }) => {
      const material = await db.material.findFirst({
        where: { id: input.materialId, organizationId: input.organizationId },
        select: { createdByMembershipId: true },
      });
      if (!material) throw new TRPCError({ code: "NOT_FOUND" });
      await requireOwnedContent(
        input.organizationId,
        ctx.actorUserId,
        material.createdByMembershipId,
        "delete",
      );
      const removed = await db.$transaction((tx) =>
        deleteMaterialWithProgress(tx, input.materialId),
      );
      return { deleted: true, removed };
    }),
  attachMaterialAsset: protectedProcedure
    .input(z.object({ organizationId: id, materialId: id, assetId: id }))
    .mutation(async ({ ctx, input }) => {
      const ownedMaterial = await db.material.findFirst({
        where: { id: input.materialId, organizationId: input.organizationId },
        select: { createdByMembershipId: true },
      });
      if (!ownedMaterial) throw new TRPCError({ code: "NOT_FOUND" });
      await requireOwnedContent(
        input.organizationId,
        ctx.actorUserId,
        ownedMaterial.createdByMembershipId,
      );
      const asset = await db.asset.findFirst({
        where: {
          id: input.assetId,
          organizationId: input.organizationId,
          confirmedAt: { not: null },
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!asset)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Material and asset must belong to the organization",
        });
      return db.materialAsset.create({ data: input });
    }),
  detachMaterialAsset: protectedProcedure
    .input(z.object({ organizationId: id, materialId: id, assetId: id }))
    .mutation(async ({ ctx, input }) => {
      const material = await db.material.findFirst({
        where: { id: input.materialId, organizationId: input.organizationId },
        select: { createdByMembershipId: true },
      });
      if (!material) throw new TRPCError({ code: "NOT_FOUND" });
      await requireOwnedContent(
        input.organizationId,
        ctx.actorUserId,
        material.createdByMembershipId,
      );
      await db.materialAsset.deleteMany({ where: input });
      return { detached: true };
    }),
  createRequirement: protectedProcedure
    .input(
      z.object({
        organizationId: id,
        materialId: id,
        relation: requirementRelation,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const material = await db.material.findFirst({
        where: { id: input.materialId, organizationId: input.organizationId },
        select: { createdByMembershipId: true },
      });
      if (!material) throw new TRPCError({ code: "NOT_FOUND" });
      await requireOwnedContent(
        input.organizationId,
        ctx.actorUserId,
        material.createdByMembershipId,
      );
      const relationId =
        "assessmentId" in input.relation
          ? input.relation.assessmentId
          : input.relation.vocabularySetId;
      const resource =
        input.relation.type === "ASSESSMENT"
          ? await db.assessment.findFirst({
              where: {
                id: relationId,
                organizationId: input.organizationId,
              },
              select: { createdByMembershipId: true },
            })
          : await db.vocabularySet.findFirst({
              where: {
                id: relationId,
                organizationId: input.organizationId,
              },
              select: { createdByMembershipId: true },
            });
      if (!resource)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Requirement must belong to the organization",
        });
      await requireOwnedContent(
        input.organizationId,
        ctx.actorUserId,
        resource.createdByMembershipId,
      );
      return db.$transaction(async (tx) => {
        const a = await tx.materialRequirement.aggregate({
          where: { materialId: input.materialId },
          _max: { position: true },
        });
        return tx.materialRequirement.create({
          data: {
            materialId: input.materialId,
            organizationId: input.organizationId,
            position: (a._max.position ?? -1) + 1,
            ...input.relation,
          },
        });
      });
    }),
  deleteRequirement: protectedProcedure
    .input(z.object({ organizationId: id, requirementId: id }))
    .mutation(async ({ ctx, input }) => {
      const requirement = await db.materialRequirement.findFirst({
        where: {
          id: input.requirementId,
          organizationId: input.organizationId,
        },
        select: { material: { select: { createdByMembershipId: true } } },
      });
      if (!requirement) throw new TRPCError({ code: "NOT_FOUND" });
      await requireOwnedContent(
        input.organizationId,
        ctx.actorUserId,
        requirement.material.createdByMembershipId,
        "delete",
      );
      const result = await db.materialRequirement.deleteMany({
        where: {
          id: input.requirementId,
          organizationId: input.organizationId,
        },
      });
      if (!result.count) throw new TRPCError({ code: "NOT_FOUND" });
      return { deleted: true };
    }),
  reorderRequirements: protectedProcedure
    .input(
      z.object({
        organizationId: id,
        materialId: id,
        requirementIds: z.array(id).max(500),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const material = await db.material.findFirst({
        where: { id: input.materialId, organizationId: input.organizationId },
        select: { createdByMembershipId: true },
      });
      if (!material) throw new TRPCError({ code: "NOT_FOUND" });
      await requireOwnedContent(
        input.organizationId,
        ctx.actorUserId,
        material.createdByMembershipId,
      );
      await reorder(
        "materialRequirement",
        { materialId: input.materialId, organizationId: input.organizationId },
        input.requirementIds,
      );
      return { reordered: true };
    }),

  listVocabularySets: protectedProcedure
    .input(
      z.object({
        organizationId: id,
        /** Matches title, description, or any entry term/definition. */
        search: z.string().trim().max(200).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const member = await requireContentOrganization(
        input.organizationId,
        ctx.actorUserId,
      );
      const contains = input.search
        ? { contains: input.search, mode: "insensitive" as const }
        : undefined;
      // Light list for pickers and library cards; full entries come from
      // getVocabularySet.
      return db.vocabularySet.findMany({
        where: {
          organizationId: input.organizationId,
          ...(member.organization.permissionMode === "ADVANCED" &&
          member.role === "TEACHER"
            ? { createdByMembershipId: member.id }
            : {}),
          ...(contains
            ? {
                OR: [
                  { title: contains },
                  { description: contains },
                  {
                    entries: {
                      some: {
                        OR: [{ term: contains }, { definition: contains }],
                      },
                    },
                  },
                ],
              }
            : {}),
        },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          title: true,
          description: true,
          createdAt: true,
          updatedAt: true,
          createdByMembershipId: true,
          _count: { select: { entries: true } },
          entries: {
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            take: vocabularyPreviewEntryCount,
            select: { id: true, term: true },
          },
        },
      });
    }),
  getVocabularySet: protectedProcedure
    .input(z.object({ organizationId: id, vocabularySetId: id }))
    .query(async ({ ctx, input }) => {
      const vocabularySet = await db.vocabularySet.findFirst({
        where: {
          id: input.vocabularySetId,
          organizationId: input.organizationId,
        },
        include: {
          entries: {
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            include: {
              audioAsset: {
                select: {
                  id: true,
                  fileName: true,
                  contentType: true,
                  size: true,
                },
              },
              imageAsset: {
                select: {
                  id: true,
                  fileName: true,
                  contentType: true,
                  size: true,
                },
              },
            },
          },
        },
      });
      if (!vocabularySet) throw new TRPCError({ code: "NOT_FOUND" });
      await requireOwnedContent(
        input.organizationId,
        ctx.actorUserId,
        vocabularySet.createdByMembershipId,
      );
      return vocabularySet;
    }),
  createVocabularySet: protectedProcedure
    .input(
      z.object({
        organizationId: id,
        title: z.string().trim().min(1).max(200),
        description: z.string().max(10000).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const member = await requireContentOrganization(
        input.organizationId,
        ctx.actorUserId,
      );
      return db.vocabularySet.create({
        data: { ...input, createdByMembershipId: member.id },
      });
    }),
  updateVocabularySet: protectedProcedure
    .input(
      z.object({
        organizationId: id,
        vocabularySetId: id,
        title: z.string().trim().min(1).max(200).optional(),
        description: z.string().max(10000).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const vocabularySet = await db.vocabularySet.findFirst({
        where: {
          id: input.vocabularySetId,
          organizationId: input.organizationId,
        },
        select: { createdByMembershipId: true },
      });
      if (!vocabularySet) throw new TRPCError({ code: "NOT_FOUND" });
      await requireOwnedContent(
        input.organizationId,
        ctx.actorUserId,
        vocabularySet.createdByMembershipId,
      );
      const { organizationId, vocabularySetId, ...data } = input;
      const result = await db.vocabularySet.updateMany({
        where: { id: vocabularySetId, organizationId },
        data,
      });
      if (!result.count) throw new TRPCError({ code: "NOT_FOUND" });
      return db.vocabularySet.findUniqueOrThrow({
        where: { id: vocabularySetId },
      });
    }),
  deleteVocabularySet: protectedProcedure
    .input(z.object({ organizationId: id, vocabularySetId: id }))
    .mutation(async ({ ctx, input }) => {
      const vocabularySet = await db.vocabularySet.findFirst({
        where: {
          id: input.vocabularySetId,
          organizationId: input.organizationId,
        },
        select: { createdByMembershipId: true },
      });
      if (!vocabularySet) throw new TRPCError({ code: "NOT_FOUND" });
      await requireOwnedContent(
        input.organizationId,
        ctx.actorUserId,
        vocabularySet.createdByMembershipId,
        "delete",
      );
      const removed = await db.$transaction((tx) =>
        deleteVocabularySetWithProgress(tx, input.vocabularySetId),
      );
      return { deleted: true, removed };
    }),
  createVocabularyEntry: protectedProcedure
    .input(
      z.object({
        organizationId: id,
        vocabularySetId: id,
        term: z.string().trim().min(1).max(500),
        definition: z.string().trim().min(1).max(5000),
        examples: json.optional(),
        audioAssetId: id.nullable().optional(),
        imageAssetId: id.nullable().optional(),
        metadata: json.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const vocabularySet = await db.vocabularySet.findFirst({
        where: {
          id: input.vocabularySetId,
          organizationId: input.organizationId,
        },
      });
      if (!vocabularySet) throw new TRPCError({ code: "NOT_FOUND" });
      await requireOwnedContent(
        input.organizationId,
        ctx.actorUserId,
        vocabularySet.createdByMembershipId,
      );
      if (input.audioAssetId) {
        await requireVocabularyAsset(
          input.audioAssetId,
          input.organizationId,
          "audio",
        );
      }
      if (input.imageAssetId) {
        await requireVocabularyAsset(
          input.imageAssetId,
          input.organizationId,
          "image",
        );
      }
      return db.vocabularyEntry.create({ data: input });
    }),
  updateVocabularyEntry: protectedProcedure
    .input(
      z.object({
        organizationId: id,
        entryId: id,
        term: z.string().trim().min(1).max(500).optional(),
        definition: z.string().trim().min(1).max(5000).optional(),
        examples: json.optional(),
        audioAssetId: id.nullable().optional(),
        imageAssetId: id.nullable().optional(),
        metadata: json.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const entry = await db.vocabularyEntry.findFirst({
        where: { id: input.entryId, organizationId: input.organizationId },
        select: { vocabularySet: { select: { createdByMembershipId: true } } },
      });
      if (!entry) throw new TRPCError({ code: "NOT_FOUND" });
      await requireOwnedContent(
        input.organizationId,
        ctx.actorUserId,
        entry.vocabularySet.createdByMembershipId,
      );
      if (input.audioAssetId) {
        await requireVocabularyAsset(
          input.audioAssetId,
          input.organizationId,
          "audio",
        );
      }
      if (input.imageAssetId) {
        await requireVocabularyAsset(
          input.imageAssetId,
          input.organizationId,
          "image",
        );
      }
      const { organizationId, entryId, ...data } = input;
      const result = await db.vocabularyEntry.updateMany({
        where: { id: entryId, organizationId },
        data,
      });
      if (!result.count) throw new TRPCError({ code: "NOT_FOUND" });
      return db.vocabularyEntry.findUniqueOrThrow({ where: { id: entryId } });
    }),
  deleteVocabularyEntry: protectedProcedure
    .input(z.object({ organizationId: id, entryId: id }))
    .mutation(async ({ ctx, input }) => {
      const entry = await db.vocabularyEntry.findFirst({
        where: { id: input.entryId, organizationId: input.organizationId },
        select: { vocabularySet: { select: { createdByMembershipId: true } } },
      });
      if (!entry) throw new TRPCError({ code: "NOT_FOUND" });
      await requireOwnedContent(
        input.organizationId,
        ctx.actorUserId,
        entry.vocabularySet.createdByMembershipId,
        "delete",
      );
      const result = await db.vocabularyEntry.deleteMany({
        where: { id: input.entryId, organizationId: input.organizationId },
      });
      if (!result.count) throw new TRPCError({ code: "NOT_FOUND" });
      return { deleted: true };
    }),
  // Reads a screenshot of a vocabulary list. Nothing is written: the author
  // adjusts the result and saves it through `createVocabularyEntries`.
  extractVocabularyFromImage: protectedProcedure
    .input(
      z.object({
        organizationId: id,
        vocabularySetId: id,
        mediaType: z.enum(["image/png", "image/jpeg", "image/webp"]),
        // Base64 without the data-URL prefix; clients downscale first.
        imageBase64: z
          .string()
          .min(1)
          .max(8 * 1024 * 1024)
          .regex(/^[A-Za-z0-9+/]+={0,2}$/),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const vocabularySet = await db.vocabularySet.findFirst({
        where: {
          id: input.vocabularySetId,
          organizationId: input.organizationId,
        },
        select: { title: true, createdByMembershipId: true },
      });
      if (!vocabularySet) throw new TRPCError({ code: "NOT_FOUND" });
      await requireOwnedContent(
        input.organizationId,
        ctx.actorUserId,
        vocabularySet.createdByMembershipId,
      );

      let extracted: ExtractedVocabularyEntry[];
      try {
        extracted = await extractVocabularyFromImage({
          imageBase64: input.imageBase64,
          mediaType: input.mediaType,
          setTitle: vocabularySet.title,
        });
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "OPENAI_API_KEY_MISSING"
        ) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "OPENAI_API_KEY belum dikonfigurasi di server.",
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "AI belum berhasil membaca gambar. Silakan coba lagi.",
          cause: error,
        });
      }

      // Flag terms the set already has (or that repeat within the image) so
      // the review step can leave them unselected by default.
      const existing = await db.vocabularyEntry.findMany({
        where: { vocabularySetId: input.vocabularySetId },
        select: { term: true },
      });
      const known = new Set(
        existing.map((entry) => normalizeVocabularyTerm(entry.term)),
      );
      return {
        entries: extracted.map((entry) => {
          const term = normalizeVocabularyTerm(entry.term);
          const duplicate = known.has(term);
          known.add(term);
          return { ...entry, duplicate };
        }),
      };
    }),
  createVocabularyEntries: protectedProcedure
    .input(
      z.object({
        organizationId: id,
        vocabularySetId: id,
        entries: z
          .array(
            z.object({
              term: z.string().trim().min(1).max(500),
              romanization: z.string().trim().max(500),
              definition: z.string().trim().min(1).max(5000),
              examples: z.array(z.string().trim().min(1).max(5000)).max(20),
            }),
          )
          .min(1)
          .max(200),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const vocabularySet = await db.vocabularySet.findFirst({
        where: {
          id: input.vocabularySetId,
          organizationId: input.organizationId,
        },
        select: { createdByMembershipId: true },
      });
      if (!vocabularySet) throw new TRPCError({ code: "NOT_FOUND" });
      await requireOwnedContent(
        input.organizationId,
        ctx.actorUserId,
        vocabularySet.createdByMembershipId,
      );
      // Rows sharing one statement timestamp would sort arbitrarily; offset
      // each by a millisecond to keep the order the author reviewed.
      const createdAt = Date.now();
      const result = await db.vocabularyEntry.createMany({
        data: input.entries.map(({ romanization, ...entry }, index) => ({
          ...entry,
          metadata: romanization ? { romanization } : undefined,
          createdAt: new Date(createdAt + index),
          organizationId: input.organizationId,
          vocabularySetId: input.vocabularySetId,
        })),
      });
      return { created: result.count };
    }),
});
