import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { Prisma } from "../../../../generated/prisma/client";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  requireContentAuthor,
  requireCoursePermission,
} from "~/server/authorization";
import { db } from "~/server/db";

const id = z.string().min(1);
const json = z.custom<Prisma.InputJsonValue>((value) => value !== undefined);
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
  model:
    "courseModule" | "courseItem" | "materialRequirement" | "vocabularyEntry",
  parent: Record<string, string>,
  ids: string[],
) {
  if (new Set(ids).size !== ids.length)
    throw new TRPCError({ code: "BAD_REQUEST", message: "Duplicate IDs" });
  await db.$transaction(async (tx) => {
    const delegate = tx[model] as unknown as {
      aggregate(args: {
        where: Record<string, unknown>;
        _max: { position: true };
      }): Promise<{ _max: { position: number | null } }>;
      count(args: { where: Record<string, unknown> }): Promise<number>;
      updateMany(args: {
        where: Record<string, unknown>;
        data: { position: number };
      }): Promise<unknown>;
    };
    const count = await delegate.count({
      where: { ...parent, id: { in: ids } },
    });
    if (count !== ids.length)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Reorder contains unknown resources",
      });
    const maximum = await delegate.aggregate({
      where: parent,
      _max: { position: true },
    });
    const temporaryPosition = (maximum._max.position ?? -1) + 1;
    for (let i = 0; i < ids.length; i++)
      await delegate.updateMany({
        where: { ...parent, id: ids[i] },
        data: { position: temporaryPosition + i },
      });
    for (let i = 0; i < ids.length; i++)
      await delegate.updateMany({
        where: { ...parent, id: ids[i] },
        data: { position: i },
      });
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
      const total = await db.courseModule.count({
        where: { courseId: input.courseId },
      });
      if (total !== input.moduleIds.length)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "All modules must be included",
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
      return db.$transaction(async (tx) => {
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
      return db.courseItem.update({
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
      await db.courseItem.delete({ where: { id: input.itemId } });
      return { deleted: true };
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
      if (
        (await db.courseItem.count({ where: { moduleId: input.moduleId } })) !==
        input.itemIds.length
      )
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "All items must be included",
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
          ...(member.role === "TEACHER" &&
          member.organization.teacherContentAccess !== "ALL"
            ? { createdByMembershipId: member.id }
            : {}),
        },
        orderBy: { updatedAt: "desc" },
        include: {
          completionRequirements: { orderBy: { position: "asc" } },
          assets: { include: { asset: true } },
        },
      });
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
      return db.material.create({
        data: { ...input, createdByMembershipId: member.id },
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
        select: { createdByMembershipId: true },
      });
      if (!material) throw new TRPCError({ code: "NOT_FOUND" });
      await requireOwnedContent(
        input.organizationId,
        ctx.actorUserId,
        material.createdByMembershipId,
      );
      const { organizationId, materialId, ...data } = input;
      const result = await db.material.updateMany({
        where: { id: materialId, organizationId },
        data,
      });
      if (!result.count) throw new TRPCError({ code: "NOT_FOUND" });
      return db.material.findUniqueOrThrow({ where: { id: materialId } });
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
      const result = await db.material.deleteMany({
        where: { id: input.materialId, organizationId: input.organizationId },
      });
      if (!result.count) throw new TRPCError({ code: "NOT_FOUND" });
      return { deleted: true };
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
      const [material, asset] = await Promise.all([
        db.material.findFirst({
          where: { id: input.materialId, organizationId: input.organizationId },
        }),
        db.asset.findFirst({
          where: {
            id: input.assetId,
            organizationId: input.organizationId,
            confirmedAt: { not: null },
            deletedAt: null,
          },
        }),
      ]);
      if (!material || !asset)
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
      if (
        !(await db.material.findFirst({
          where: { id: input.materialId, organizationId: input.organizationId },
        }))
      )
        throw new TRPCError({ code: "NOT_FOUND" });
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
            })
          : await db.vocabularySet.findFirst({
              where: {
                id: relationId,
                organizationId: input.organizationId,
              },
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
      const total = await db.materialRequirement.count({
        where: {
          materialId: input.materialId,
          organizationId: input.organizationId,
        },
      });
      if (total !== input.requirementIds.length)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "All requirements must be included",
        });
      await reorder(
        "materialRequirement",
        { materialId: input.materialId, organizationId: input.organizationId },
        input.requirementIds,
      );
      return { reordered: true };
    }),

  listVocabularySets: protectedProcedure
    .input(z.object({ organizationId: id }))
    .query(async ({ ctx, input }) => {
      const member = await requireContentOrganization(
        input.organizationId,
        ctx.actorUserId,
      );
      return db.vocabularySet.findMany({
        where: {
          organizationId: input.organizationId,
          ...(member.role === "TEACHER" &&
          member.organization.teacherContentAccess !== "ALL"
            ? { createdByMembershipId: member.id }
            : {}),
        },
        orderBy: { updatedAt: "desc" },
        include: { entries: { orderBy: { position: "asc" } } },
      });
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
      const result = await db.vocabularySet.deleteMany({
        where: {
          id: input.vocabularySetId,
          organizationId: input.organizationId,
        },
      });
      if (!result.count) throw new TRPCError({ code: "NOT_FOUND" });
      return { deleted: true };
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
      if (
        input.audioAssetId &&
        !(await db.asset.findFirst({
          where: {
            id: input.audioAssetId,
            organizationId: input.organizationId,
            confirmedAt: { not: null },
            deletedAt: null,
          },
        }))
      )
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Audio asset must belong to the organization",
        });
      return db.$transaction(async (tx) => {
        const a = await tx.vocabularyEntry.aggregate({
          where: { vocabularySetId: input.vocabularySetId },
          _max: { position: true },
        });
        return tx.vocabularyEntry.create({
          data: { ...input, position: (a._max.position ?? -1) + 1 },
        });
      });
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
      if (
        input.audioAssetId &&
        !(await db.asset.findFirst({
          where: {
            id: input.audioAssetId,
            organizationId: input.organizationId,
            confirmedAt: { not: null },
            deletedAt: null,
          },
        }))
      )
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Audio asset must belong to the organization",
        });
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
  reorderVocabularyEntries: protectedProcedure
    .input(
      z.object({
        organizationId: id,
        vocabularySetId: id,
        entryIds: z.array(id).max(2000),
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
      const total = await db.vocabularyEntry.count({
        where: {
          vocabularySetId: input.vocabularySetId,
          organizationId: input.organizationId,
        },
      });
      if (total !== input.entryIds.length)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "All entries must be included",
        });
      await reorder(
        "vocabularyEntry",
        {
          vocabularySetId: input.vocabularySetId,
          organizationId: input.organizationId,
        },
        input.entryIds,
      );
      return { reordered: true };
    }),
});
