import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { Prisma } from "../../../../generated/prisma/client";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  activeEnrollmentStatuses,
  requireCourseItemAccess,
  requireCoursePermission,
} from "~/server/authorization";
import { db } from "~/server/db";
import { accessGrantingCohortStatuses } from "~/server/enrollment/cohort-access";
import {
  getCourseOutlineForUser,
  getCourseOutlinesForUser,
} from "~/server/learning/course-outline";
import { enrolledCourseWhere } from "~/server/learning/enrolled-courses";
import { getCourseItemDetails } from "~/server/learning/course-item-detail";
import { hasPassedAssessment } from "~/server/learning/sequential-access";
import { recordGamificationActivity } from "~/server/gamification/record-activity";
import {
  isVocabularySetPracticed,
  lockLearnerProgress,
  meetsMaterialRequirements,
} from "~/server/vocabulary/evidence";
import { createVocabularyProgressService } from "~/server/vocabulary/progress-service";
import { isValidTimeZone } from "~/server/gamification/logic";
import { collectMaterialReferenceIds } from "~/lib/blocknote/resource-references";
import { organizationBrandSelect } from "~/server/brand/context";

// Longest meeting a cohort can schedule (cohort router validation). Anything
// that started earlier has ended and is never shown or badged by clients.
const MAX_MEETING_DURATION_MS = 1440 * 60_000;

const vocabularyProgressScope = z.object({
  sourceCourseItemId: z.string().min(1),
  vocabularySetId: z.string().min(1),
});

export const recordVocabularyAttemptsInput = z.object({
  sessionId: z.string().trim().min(1).max(200),
  gameKey: z.string().trim().min(1).max(100),
  timeZone: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .refine(isValidTimeZone, "Invalid IANA timezone")
    .optional(),
  attempts: z
    .array(
      z.object({
        attemptId: z.string().trim().min(1).max(200),
        sourceCourseItemId: z.string().min(1),
        vocabularySetId: z.string().min(1),
        entryId: z.string().min(1),
        evidence: z.enum(["RECOGNITION", "RECALL", "APPLICATION"]),
        result: z.enum(["CORRECT", "INCORRECT", "REVEALED"]),
      }),
    )
    .min(1)
    .max(50),
});

/**
 * `learning.recordVocabularyAttempts` for already-validated input. `authorize` lets a batch of
 * calls (mobile sync) share course-item access checks.
 */
export function recordVocabularyAttemptsForUser(
  database: typeof db,
  userId: string,
  input: z.infer<typeof recordVocabularyAttemptsInput>,
  authorize: typeof requireCourseItemAccess = requireCourseItemAccess,
) {
  return createVocabularyProgressService(database, authorize).recordAttempts(
    userId,
    input.attempts.map((attempt) => ({
      ...attempt,
      sessionId: input.sessionId,
      gameKey: input.gameKey,
    })),
    input.timeZone,
  );
}

export const learningRouter = createTRPCRouter({
  // Enrollment-scoped student view. Staff membership alone must not populate
  // the mobile learning experience or expose meeting links.
  listMyCohorts: protectedProcedure
    .input(
      z.object({ organizationId: z.string().min(1).optional() }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const cohorts = await ctx.db.cohort.findMany({
        where: {
          organizationId: input?.organizationId,
          status: { in: [...accessGrantingCohortStatuses] },
          OR: [{ endsAt: null }, { endsAt: { gt: now } }],
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
              organization: { select: organizationBrandSelect },
            },
          },
          // Clients only surface meetings that have not ended yet (next
          // meeting, a few upcoming, unread badges), so skip past ones.
          meetings: {
            where: {
              status: { in: ["SCHEDULED", "STARTED"] },
              startsAt: {
                gt: new Date(now.getTime() - MAX_MEETING_DURATION_MS),
              },
            },
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
              createdAt: true,
              updatedAt: true,
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
      });
      // Counted per page instead of a relation `_count`, which Prisma
      // compiles into an aggregate over every cohort enrollment.
      const enrollmentCounts =
        cohorts.length === 0
          ? []
          : await ctx.db.cohortEnrollment.groupBy({
              by: ["cohortId"],
              where: {
                cohortId: { in: cohorts.map((cohort) => cohort.id) },
                status: { in: [...activeEnrollmentStatuses] },
              },
              _count: { _all: true },
            });
      const countByCohort = new Map(
        enrollmentCounts.map((row) => [row.cohortId, row._count._all]),
      );
      return cohorts.map((cohort) => ({
        ...cohort,
        _count: { enrollments: countByCohort.get(cohort.id) ?? 0 },
      }));
    }),
  listMyCourses: protectedProcedure
    .input(
      z.object({ organizationId: z.string().min(1).optional() }).optional(),
    )
    .query(async ({ ctx, input }) =>
      ctx.db.course.findMany({
        where: await enrolledCourseWhere({
          userId: ctx.actorUserId,
          organizationId: input?.organizationId,
        }),
        orderBy: { title: "asc" },
        select: {
          id: true,
          title: true,
          description: true,
          thumbnailUrl: true,
          progressionMode: true,
          organization: { select: organizationBrandSelect },
        },
      }),
    ),
  // Per-course progress for the learner dashboard, covering the same courses
  // as listMyCourses. Batched instead of one getCourseOutline per course.
  listMyCourseProgress: protectedProcedure
    .input(
      z.object({ organizationId: z.string().min(1).optional() }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const outlines = await getCourseOutlinesForUser(
        await enrolledCourseWhere({
          userId: ctx.actorUserId,
          organizationId: input?.organizationId,
        }),
        ctx.actorUserId,
      );
      return outlines.map((outline) => {
        const items = outline.modules.flatMap((module) => module.items);
        const nextModule = outline.modules.find(
          (module) =>
            module.access !== "LOCKED" &&
            module.items.some((item) => !item.isCompleted),
        );
        const nextItem = nextModule?.items.find((item) => !item.isCompleted);
        return {
          courseId: outline.id,
          completedCount: items.filter((item) => item.isCompleted).length,
          totalCount: items.length,
          next:
            nextModule && nextItem
              ? {
                  courseItemId: nextItem.id,
                  title: nextItem.title,
                  moduleTitle: nextModule.title,
                }
              : null,
        };
      });
    }),
  getCourseItem: protectedProcedure
    .input(z.object({ courseItemId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      // The item is only returned once the access check has passed; loading
      // it alongside saves a round trip.
      const [, details] = await Promise.all([
        requireCourseItemAccess({
          courseItemId: input.courseItemId,
          userId: ctx.actorUserId,
        }),
        getCourseItemDetails(ctx.db, ctx.actorUserId, [input.courseItemId]),
      ]);
      return details.get(input.courseItemId) ?? null;
    }),
  getVocabularyPractice: protectedProcedure
    .input(
      z.object({
        vocabularySetId: z.string().min(1),
        sourceCourseItemId: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      // The source is only used once the access check has passed; loading it
      // alongside saves a round trip.
      const [, source] = await Promise.all([
        requireCourseItemAccess({
          courseItemId: input.sourceCourseItemId,
          userId: ctx.actorUserId,
        }),
        ctx.db.courseItem.findUnique({
          where: { id: input.sourceCourseItemId },
          select: {
            organizationId: true,
            moduleId: true,
            vocabularySetId: true,
            materialId: true,
            material: {
              select: {
                completionRequirements: {
                  where: {
                    type: "VOCABULARY_SET",
                    vocabularySetId: input.vocabularySetId,
                  },
                  select: { id: true },
                  take: 1,
                },
              },
            },
            module: { select: { courseId: true } },
          },
        }),
      ]);
      if (!source) throw new TRPCError({ code: "NOT_FOUND" });
      // Material content is only needed when neither the item itself nor a
      // completion requirement links the set.
      const linked =
        source.vocabularySetId === input.vocabularySetId ||
        !!source.material?.completionRequirements.length ||
        (!!source.materialId &&
          collectMaterialReferenceIds(
            (
              await ctx.db.material.findUnique({
                where: { id: source.materialId },
                select: { content: true },
              })
            )?.content,
          ).vocabularySetIds.includes(input.vocabularySetId));
      if (!linked) throw new TRPCError({ code: "NOT_FOUND" });
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
          courseItems: {
            where: { moduleId: source.moduleId, isPublished: true },
            orderBy: [{ position: "asc" }, { id: "asc" }],
            select: { id: true },
          },
          entries: {
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            select: {
              id: true,
              term: true,
              definition: true,
              examples: true,
              audioAssetId: true,
              imageAssetId: true,
            },
          },
        },
      });
      if (!vocabularySet) throw new TRPCError({ code: "NOT_FOUND" });
      const practiceCourseItemId = vocabularySet.courseItems[0]?.id;
      if (!practiceCourseItemId) throw new TRPCError({ code: "NOT_FOUND" });
      // Memoized per request, so this is free when the source is the placement.
      await requireCourseItemAccess({
        courseItemId: practiceCourseItemId,
        userId: ctx.actorUserId,
      });
      return {
        ...vocabularySet,
        // Every entry is loaded, so count them instead of a relation `_count`.
        _count: { entries: vocabularySet.entries.length },
        courseId: source.module.courseId,
        practiceCourseItemId,
      };
    }),
  getVocabularyProgress: protectedProcedure
    .input(vocabularyProgressScope)
    .query(({ ctx, input }) =>
      createVocabularyProgressService(
        ctx.db,
        requireCourseItemAccess,
      ).getProgress(ctx.actorUserId, input),
    ),
  recordVocabularyAttempts: protectedProcedure
    .input(recordVocabularyAttemptsInput)
    .mutation(({ ctx, input }) =>
      recordVocabularyAttemptsForUser(ctx.db, ctx.actorUserId, input),
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
        // Course completion is durable. Vocabulary mastery may change later,
        // but it must never revoke progress or relock later modules.
        if (existing?.status === "COMPLETED") return existing;
        if (input.status === "COMPLETED") {
          const allowed =
            item.type === "VOCABULARY_SET"
              ? !!item.vocabularySetId &&
                (await isVocabularySetPracticed(
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
          if (!allowed)
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message:
                "Complete the required learning activities before marking this material complete",
            });
        }
        if (existing && input.status === "IN_PROGRESS") return existing;
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
  listMyCohortMilestones: protectedProcedure
    .input(
      z.object({ organizationId: z.string().min(1).optional() }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const cohortWhere = {
        organizationId: input?.organizationId,
        status: { in: [...accessGrantingCohortStatuses] },
        OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
        course: { status: "PUBLISHED" },
        enrollments: {
          some: {
            userId: ctx.actorUserId,
            status: { in: [...activeEnrollmentStatuses] },
          },
        },
      } satisfies Prisma.CohortWhereInput;
      // Cohorts of the same course share one course tree load.
      const [cohorts, courses] = await Promise.all([
        ctx.db.cohort.findMany({
          where: cohortWhere,
          orderBy: [{ startsAt: "asc" }, { id: "asc" }],
          select: { id: true, name: true, courseId: true },
        }),
        ctx.db.course.findMany({
          where: { cohorts: { some: cohortWhere } },
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
        }),
      ]);

      type Milestone = {
        courseItemId: string;
        type: "MATERIAL" | "VOCABULARY_SET" | "ASSESSMENT";
        title: string;
        moduleTitle: string;
        completedAt: Date | null;
        score: number | null;
        maxScore: number | null;
      };
      // Milestones depend only on the course, so compute them once per course.
      const progressByCourse = new Map(
        courses.map((course) => {
          const flatItems = course.modules.flatMap((module) =>
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

          const milestones: Milestone[] = [];
          for (const item of flatItems) {
            if (item.type === "ASSESSMENT") {
              const attempts = item.assessment?.attempts ?? [];
              if (
                !hasPassedAssessment(
                  attempts,
                  item.assessment?.passingScore ?? null,
                )
              )
                continue;
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
              continue;
            }
            if (item.progress.length === 0) continue;
            milestones.push({
              courseItemId: item.id,
              type: item.type,
              title: item.title,
              moduleTitle: item.moduleTitle,
              completedAt: item.progress[0]?.completedAt ?? null,
              score: null,
              maxScore: null,
            });
          }

          milestones.sort(
            (a, b) =>
              (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0),
          );

          const totalItems = flatItems.length;
          const completedCount = milestones.length;
          return [
            course.id,
            {
              courseId: course.id,
              courseTitle: course.title,
              totalItems,
              completedCount,
              progressPercent: totalItems
                ? Math.round((completedCount / totalItems) * 100)
                : 0,
              milestones: milestones.slice(0, 20),
            },
          ] as const;
        }),
      );

      return cohorts.flatMap((cohort) => {
        const progress = progressByCourse.get(cohort.courseId);
        return progress
          ? [{ cohortId: cohort.id, cohortName: cohort.name, ...progress }]
          : [];
      });
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
