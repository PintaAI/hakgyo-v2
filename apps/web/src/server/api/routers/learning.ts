import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  activeEnrollmentStatuses,
  requireCourseItemAccess,
  requireCoursePermission,
} from "~/server/authorization";
import { db } from "~/server/db";
import { getCourseOutlineForUser } from "~/server/learning/course-outline";
import {
  passesAssessmentRequirement,
  passesRequirementPolicy,
} from "~/server/learning/material-completion";

export const learningRouter = createTRPCRouter({
  listMyCourses: protectedProcedure.query(({ ctx }) => {
    const now = new Date();
    return ctx.db.course.findMany({
      where: {
        status: "PUBLISHED",
        OR: [
          {
            enrollments: {
              some: {
                userId: ctx.actorUserId,
                status: { in: [...activeEnrollmentStatuses] },
                OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
              },
            },
          },
          {
            cohorts: {
              some: {
                enrollments: {
                  some: {
                    userId: ctx.actorUserId,
                    status: { in: [...activeEnrollmentStatuses] },
                  },
                },
              },
            },
          },
        ],
      },
      orderBy: { title: "asc" },
      select: {
        id: true,
        title: true,
        description: true,
        thumbnailUrl: true,
        progressionMode: true,
        organization: { select: { id: true, name: true, slug: true } },
      },
    });
  }),
  getCourseItem: protectedProcedure
    .input(z.object({ courseItemId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      await requireCourseItemAccess({
        courseItemId: input.courseItemId,
        userId: ctx.actorUserId,
      });
      const item = await ctx.db.courseItem.findUnique({
        where: { id: input.courseItemId },
        select: {
          id: true,
          type: true,
          position: true,
          material: {
            select: {
              id: true,
              title: true,
              description: true,
              content: true,
              editorSchemaVersion: true,
              assets: {
                where: {
                  asset: { confirmedAt: { not: null }, deletedAt: null },
                },
                select: {
                  asset: {
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
          },
          vocabularySet: {
            select: {
              id: true,
              title: true,
              description: true,
              entries: {
                orderBy: [{ createdAt: "asc" }, { id: "asc" }],
                select: {
                  id: true,
                  term: true,
                  definition: true,
                  examples: true,
                  metadata: true,
                  audioAsset: {
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
          },
          progress: {
            where: { userId: ctx.actorUserId },
            select: { status: true, startedAt: true, completedAt: true },
            take: 1,
          },
        },
      });
      if (!item || item.type === "ASSESSMENT") return null;
      return item;
    }),
  markContentProgress: protectedProcedure
    .input(
      z.object({
        courseItemId: z.string().min(1),
        status: z.enum(["IN_PROGRESS", "COMPLETED"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireCourseItemAccess({
        courseItemId: input.courseItemId,
        userId: ctx.actorUserId,
      });
      const item = await ctx.db.courseItem.findUnique({
        where: { id: input.courseItemId },
        select: {
          type: true,
          material: {
            select: {
              requirementPolicy: true,
              completionRequirements: {
                select: {
                  type: true,
                  assessmentId: true,
                  vocabularySetId: true,
                  minimumScore: true,
                  assessment: { select: { passingScore: true } },
                },
              },
            },
          },
        },
      });
      if (!item) throw new TRPCError({ code: "NOT_FOUND" });
      if (item.type === "ASSESSMENT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Assessment progress is determined by grading",
        });
      }
      if (input.status === "COMPLETED" && item.type === "MATERIAL") {
        const requirements = item.material?.completionRequirements ?? [];
        const results = await Promise.all(
          requirements.map(async (requirement) => {
            if (requirement.type === "ASSESSMENT") {
              if (!requirement.assessmentId) return false;
              const attempts = await ctx.db.assessmentAttempt.findMany({
                where: {
                  assessmentId: requirement.assessmentId,
                  userId: ctx.actorUserId,
                  status: "GRADED",
                },
                select: { status: true, score: true, maxScore: true },
              });
              return passesAssessmentRequirement(
                attempts,
                requirement.minimumScore,
                requirement.assessment?.passingScore ?? null,
              );
            }

            if (!requirement.vocabularySetId) return false;
            const candidates = await ctx.db.contentProgress.findMany({
              where: {
                userId: ctx.actorUserId,
                status: "COMPLETED",
                courseItem: {
                  type: "VOCABULARY_SET",
                  vocabularySetId: requirement.vocabularySetId,
                  isPublished: true,
                },
              },
              select: { courseItemId: true },
            });
            for (const candidate of candidates) {
              try {
                await requireCourseItemAccess({
                  courseItemId: candidate.courseItemId,
                  userId: ctx.actorUserId,
                });
                return true;
              } catch (error) {
                if (
                  !(error instanceof TRPCError) ||
                  !["FORBIDDEN", "NOT_FOUND"].includes(error.code)
                ) {
                  throw error;
                }
              }
            }
            return false;
          }),
        );
        if (
          !passesRequirementPolicy(
            item.material?.requirementPolicy ?? "ALL",
            results,
          )
        ) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Material completion requirements are not met",
          });
        }
      }

      const existing = await ctx.db.contentProgress.findUnique({
        where: {
          courseItemId_userId: {
            courseItemId: input.courseItemId,
            userId: ctx.actorUserId,
          },
        },
        select: { status: true, startedAt: true, completedAt: true },
      });
      // Monotonic: never downgrade COMPLETED -> IN_PROGRESS
      if (existing?.status === "COMPLETED") return existing;
      if (existing && input.status === "IN_PROGRESS") return existing;

      const completedAt = input.status === "COMPLETED" ? new Date() : null;
      return ctx.db.contentProgress.upsert({
        where: {
          courseItemId_userId: {
            courseItemId: input.courseItemId,
            userId: ctx.actorUserId,
          },
        },
        create: { ...input, userId: ctx.actorUserId, completedAt },
        update: { status: input.status, completedAt },
        select: { status: true, startedAt: true, completedAt: true },
      });
    }),
  getCourseOutline: protectedProcedure
    .input(z.object({ courseId: z.string().min(1) }))
    .query(({ ctx, input }) =>
      getCourseOutlineForUser(input.courseId, ctx.actorUserId),
    ),
  setProgressionMode: protectedProcedure
    .input(
      z.object({
        courseId: z.string().min(1),
        progressionMode: z.enum(["OPEN", "SEQUENTIAL"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireCoursePermission({
        courseId: input.courseId,
        permission: "course.manage",
        userId: ctx.actorUserId,
      });

      return db.course.update({
        where: { id: input.courseId },
        data: { progressionMode: input.progressionMode },
        select: { id: true, progressionMode: true },
      });
    }),
});
