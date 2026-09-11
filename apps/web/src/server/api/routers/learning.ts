import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  activeEnrollmentStatuses,
  requireCourseItemAccess,
  requireCoursePermission,
} from "~/server/authorization";
import { db } from "~/server/db";
import { accessGrantingCohortStatuses } from "~/server/enrollment/cohort-access";
import { getCourseOutlineForUser } from "~/server/learning/course-outline";
import { hasPassedAssessment } from "~/server/learning/sequential-access";
import { recordGamificationActivity } from "~/server/gamification/record-activity";
import {
  isVocabularySetRemembered,
  lockLearnerProgress,
  meetsMaterialRequirements,
} from "~/server/vocabulary/evidence";
import { createVocabularyRecallService } from "~/server/vocabulary/recall-service";
import { collectMaterialReferenceIds } from "~/lib/blocknote/resource-references";
import { getLearnerMaterialReferences } from "~/server/material-reference-service";

const recallScope = z.object({
  sourceCourseItemId: z.string().min(1),
  vocabularySetId: z.string().min(1),
});

export const learningRouter = createTRPCRouter({
  // Enrollment-scoped student view. Staff membership alone must not populate
  // the mobile learning experience or expose meeting links.
  listMyCohorts: protectedProcedure.query(({ ctx }) =>
    ctx.db.cohort.findMany({
      where: {
        status: { in: [...accessGrantingCohortStatuses] },
        OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
        course: { status: "PUBLISHED" },
        enrollments: {
          some: {
            userId: ctx.actorUserId,
            status: { in: [...activeEnrollmentStatuses] },
          },
        },
      },
      orderBy: [{ startsAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        name: true,
        description: true,
        startsAt: true,
        endsAt: true,
        whatsappGroupUrl: true,
        course: {
          select: {
            id: true,
            title: true,
            thumbnailUrl: true,
            progressionMode: true,
          },
        },
        meetings: {
          where: { status: { in: ["SCHEDULED", "STARTED"] } },
          orderBy: [{ startsAt: "asc" }, { id: "asc" }],
          select: {
            id: true,
            title: true,
            agenda: true,
            startsAt: true,
            durationMinutes: true,
            timezone: true,
            status: true,
            joinUrl: true,
          },
        },
        _count: {
          select: {
            enrollments: {
              where: { status: { in: [...activeEnrollmentStatuses] } },
            },
          },
        },
        enrollments: {
          where: {
            userId: ctx.actorUserId,
            status: { in: [...activeEnrollmentStatuses] },
          },
          select: { enrolledAt: true },
          take: 1,
        },
        staff: {
          select: {
            role: true,
            organizationMember: {
              select: { user: { select: { name: true, image: true } } },
            },
          },
        },
      },
    }),
  ),
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
                source: { not: "COHORT" },
                OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
              },
            },
          },
          {
            cohorts: {
              some: {
                status: { in: [...accessGrantingCohortStatuses] },
                OR: [{ endsAt: null }, { endsAt: { gt: now } }],
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
          moduleId: true,
          organizationId: true,
          type: true,
          position: true,
          module: { select: { courseId: true } },
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
          },
          assessment: {
            select: {
              id: true,
              title: true,
              description: true,
              status: true,
              _count: { select: { questions: true } },
            },
          },
          progress: {
            where: { userId: ctx.actorUserId },
            select: { status: true, startedAt: true, completedAt: true },
            take: 1,
          },
        },
      });
      if (!item) return null;
      if (item.progress[0]?.status === "COMPLETED") {
        const valid = item.vocabularySet
          ? await isVocabularySetRemembered(
              ctx.db,
              ctx.actorUserId,
              item.vocabularySet.id,
            )
          : item.material
            ? await meetsMaterialRequirements(
                ctx.db,
                ctx.actorUserId,
                item.material.id,
              )
            : true;
        if (!valid)
          item.progress[0] = {
            ...item.progress[0],
            status: "IN_PROGRESS",
            completedAt: null,
          };
      }
      const embeddedResources = item.material
        ? await getLearnerMaterialReferences(ctx.db, {
            content: item.material.content,
            moduleId: item.moduleId,
            organizationId: item.organizationId,
          })
        : { vocabularySets: [], assessments: [] };
      return {
        ...item,
        embeddedResources: {
          ...embeddedResources,
          courseId: item.module.courseId,
          sourceCourseItemId: item.id,
        },
      };
    }),
  getVocabularyPractice: protectedProcedure
    .input(
      z.object({
        vocabularySetId: z.string().min(1),
        sourceCourseItemId: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      await requireCourseItemAccess({
        courseItemId: input.sourceCourseItemId,
        userId: ctx.actorUserId,
      });
      const source = await ctx.db.courseItem.findUnique({
        where: { id: input.sourceCourseItemId },
        select: {
          organizationId: true,
          moduleId: true,
          vocabularySetId: true,
          material: { select: { content: true } },
          module: { select: { courseId: true } },
        },
      });
      if (
        !source ||
        (source.vocabularySetId !== input.vocabularySetId &&
          (!source.material ||
            !collectMaterialReferenceIds(
              source.material.content,
            ).vocabularySetIds.includes(input.vocabularySetId)))
      ) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      const vocabularySet = await ctx.db.vocabularySet.findFirst({
        where: {
          id: input.vocabularySetId,
          organizationId: source.organizationId,
          courseItems: {
            some: { moduleId: source.moduleId, isPublished: true },
          },
        },
        select: {
          id: true,
          title: true,
          description: true,
          _count: { select: { entries: true } },
          courseItems: {
            where: { moduleId: source.moduleId, isPublished: true },
            orderBy: [{ position: "asc" }, { id: "asc" }],
            select: { id: true },
          },
          entries: {
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            select: { id: true, term: true, definition: true, examples: true },
          },
        },
      });
      if (!vocabularySet) throw new TRPCError({ code: "NOT_FOUND" });
      const practiceCourseItemId = vocabularySet.courseItems[0]?.id;
      if (!practiceCourseItemId) throw new TRPCError({ code: "NOT_FOUND" });
      await requireCourseItemAccess({
        courseItemId: practiceCourseItemId,
        userId: ctx.actorUserId,
      });
      return {
        ...vocabularySet,
        courseId: source.module.courseId,
        practiceCourseItemId,
      };
    }),
  getVocabularyMemory: protectedProcedure
    .input(recallScope)
    .query(({ ctx, input }) =>
      createVocabularyRecallService(ctx.db, requireCourseItemAccess).getStatus(
        ctx.actorUserId,
        input,
      ),
    ),
  startVocabularyRecall: protectedProcedure
    .input(recallScope.extend({ entryId: z.string().min(1) }))
    .mutation(({ ctx, input }) =>
      createVocabularyRecallService(ctx.db, requireCourseItemAccess).start(
        ctx.actorUserId,
        input,
      ),
    ),
  submitVocabularyRecall: protectedProcedure
    .input(
      z.object({ challengeId: z.string().min(1), answer: z.string().max(500) }),
    )
    .mutation(({ ctx, input }) =>
      createVocabularyRecallService(ctx.db, requireCourseItemAccess).submit(
        ctx.actorUserId,
        input,
      ),
    ),
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
      return ctx.db.$transaction(async (tx) => {
        await lockLearnerProgress(tx, ctx.actorUserId);
        const item = await tx.courseItem.findUnique({
          where: { id: input.courseItemId },
          select: {
            type: true,
            vocabularySetId: true,
            materialId: true,
            organizationId: true,
          },
        });
        if (!item) throw new TRPCError({ code: "NOT_FOUND" });
        if (item.type === "ASSESSMENT") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Assessment progress is determined by grading",
          });
        }
        const existing = await tx.contentProgress.findUnique({
          where: {
            courseItemId_userId: {
              courseItemId: input.courseItemId,
              userId: ctx.actorUserId,
            },
          },
          select: { status: true, startedAt: true, completedAt: true },
        });
        // Check evidence BEFORE the existing-completion fast path: legacy flags are not evidence.
        if (input.status === "COMPLETED" || existing?.status === "COMPLETED") {
          const allowed =
            item.type === "VOCABULARY_SET"
              ? !!item.vocabularySetId &&
                (await isVocabularySetRemembered(
                  tx,
                  ctx.actorUserId,
                  item.vocabularySetId,
                ))
              : !!item.materialId &&
                (await meetsMaterialRequirements(
                  tx,
                  ctx.actorUserId,
                  item.materialId,
                ));
          if (!allowed && input.status === "COMPLETED")
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message:
                "Completion requirements are not met; vocabulary requires verified recall for every word",
            });
          if (!allowed) {
            return tx.contentProgress.update({
              where: {
                courseItemId_userId: {
                  courseItemId: input.courseItemId,
                  userId: ctx.actorUserId,
                },
              },
              data: { status: "IN_PROGRESS", completedAt: null },
              select: { status: true, startedAt: true, completedAt: true },
            });
          }
        }
        if (
          existing?.status === "COMPLETED" ||
          (existing && input.status === "IN_PROGRESS")
        )
          return existing;
        const completedAt = input.status === "COMPLETED" ? new Date() : null;
        const progress = await tx.contentProgress.upsert({
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
        if (input.status === "COMPLETED") {
          await recordGamificationActivity(tx, {
            action:
              item.type === "MATERIAL"
                ? "MATERIAL_COMPLETED"
                : "VOCABULARY_REVIEWED",
            idempotencyKey: `content-completed:${ctx.actorUserId}:${input.courseItemId}`,
            metadata: { courseItemId: input.courseItemId },
            organizationId: item.organizationId,
            occurredAt: completedAt ?? undefined,
            userId: ctx.actorUserId,
          });
        }
        return progress;
      });
    }),
  getCourseOutline: protectedProcedure
    .input(z.object({ courseId: z.string().min(1) }))
    .query(({ ctx, input }) =>
      getCourseOutlineForUser(input.courseId, ctx.actorUserId),
    ),
  // Milestones achieved by the learner, scoped to the cohorts shown on mobile
  // Learn tab. Derived from existing progress + assessment evidence (no new
  // schema): completed materials/vocabulary sets + passed assessments.
  listMyCohortMilestones: protectedProcedure.query(async ({ ctx }) => {
    const cohorts = await ctx.db.cohort.findMany({
      where: {
        status: { in: [...accessGrantingCohortStatuses] },
        OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
        course: { status: "PUBLISHED" },
        enrollments: {
          some: {
            userId: ctx.actorUserId,
            status: { in: [...activeEnrollmentStatuses] },
          },
        },
      },
      orderBy: [{ startsAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        name: true,
        course: {
          select: {
            id: true,
            title: true,
            modules: {
              orderBy: { position: "asc" },
              select: {
                id: true,
                title: true,
                items: {
                  where: { isPublished: true },
                  orderBy: { position: "asc" },
                  select: {
                    id: true,
                    type: true,
                    position: true,
                    material: { select: { id: true, title: true } },
                    vocabularySet: { select: { id: true, title: true } },
                    assessment: {
                      select: {
                        id: true,
                        title: true,
                        passingScore: true,
                        attempts: {
                          where: {
                            userId: ctx.actorUserId,
                            assessmentEventId: null,
                            status: "GRADED",
                          },
                          orderBy: { gradedAt: "desc" },
                          select: {
                            status: true,
                            score: true,
                            maxScore: true,
                            gradedAt: true,
                          },
                          take: 10,
                        },
                      },
                    },
                    progress: {
                      where: {
                        userId: ctx.actorUserId,
                        status: "COMPLETED",
                      },
                      select: { completedAt: true },
                      take: 1,
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    return Promise.all(
      cohorts.map(async (cohort) => {
        const flatItems = cohort.course.modules.flatMap((module) =>
          module.items.map((item) => ({
            ...item,
            moduleTitle: module.title,
            title:
              item.material?.title ??
              item.vocabularySet?.title ??
              item.assessment?.title ??
              "Untitled",
          })),
        );

        const milestones: {
          courseItemId: string;
          type: "MATERIAL" | "VOCABULARY_SET" | "ASSESSMENT";
          title: string;
          moduleTitle: string;
          completedAt: Date | null;
          score: number | null;
          maxScore: number | null;
        }[] = [];

        await Promise.all(
          flatItems.map(async (item) => {
            if (item.type === "ASSESSMENT") {
              const attempts = item.assessment?.attempts ?? [];
              if (
                !hasPassedAssessment(
                  attempts,
                  item.assessment?.passingScore ?? null,
                )
              )
                return;
              const best =
                attempts.find(
                  (attempt) =>
                    attempt.score !== null &&
                    attempt.maxScore !== null &&
                    attempt.maxScore > 0 &&
                    (item.assessment?.passingScore == null ||
                      (attempt.score / attempt.maxScore) * 100 >=
                        (item.assessment?.passingScore ?? 0)),
                ) ?? attempts[0];
              milestones.push({
                courseItemId: item.id,
                type: item.type,
                title: item.title,
                moduleTitle: item.moduleTitle,
                completedAt: best?.gradedAt ?? null,
                score: best?.score ?? null,
                maxScore: best?.maxScore ?? null,
              });
              return;
            }
            if (item.progress.length === 0) return;
            const valid = item.vocabularySet
              ? await isVocabularySetRemembered(
                  ctx.db,
                  ctx.actorUserId,
                  item.vocabularySet.id,
                )
              : item.material
                ? await meetsMaterialRequirements(
                    ctx.db,
                    ctx.actorUserId,
                    item.material.id,
                  )
                : true;
            if (!valid) return;
            milestones.push({
              courseItemId: item.id,
              type: item.type,
              title: item.title,
              moduleTitle: item.moduleTitle,
              completedAt: item.progress[0]?.completedAt ?? null,
              score: null,
              maxScore: null,
            });
          }),
        );

        milestones.sort(
          (a, b) =>
            (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0),
        );

        const totalItems = flatItems.length;
        const completedCount = milestones.length;
        return {
          cohortId: cohort.id,
          cohortName: cohort.name,
          courseId: cohort.course.id,
          courseTitle: cohort.course.title,
          totalItems,
          completedCount,
          progressPercent: totalItems
            ? Math.round((completedCount / totalItems) * 100)
            : 0,
          milestones: milestones.slice(0, 20),
        };
      }),
    );
  }),
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
