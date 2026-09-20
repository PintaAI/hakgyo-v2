import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { activeEnrollmentStatuses } from "~/server/authorization";
import { accessGrantingCohortStatuses } from "~/server/enrollment/cohort-access";
import { getCourseOutlineForUser } from "~/server/learning/course-outline";
import type { db as database } from "~/server/db";
import { vocabularyContentHash } from "~/server/vocabulary/progress-policy";
import {
  gradePracticeChoice,
  preparePracticeOptions,
  sampleForPractice,
  vocabularySetVersion,
} from "~/server/practice-policy";

const seed = z.string().trim().min(1).max(100);

async function getAvailablePracticeItems(
  db: typeof database,
  userId: string,
  organizationId?: string,
) {
  const courses = await getPracticeCourses(db, userId, organizationId);
  const outlines = await Promise.all(
    courses.map((course) =>
      getCourseOutlineForUser(course.id, userId, { managementAccess: false }),
    ),
  );

  return outlines.flatMap((course) =>
    course.modules.flatMap((module) =>
      module.access === "LOCKED"
        ? []
        : module.items.map((item) => ({
            courseId: course.id,
            courseTitle: course.title,
            courseItemId: item.id,
            type: item.type,
          })),
    ),
  );
}

function getPracticeCourses(
  db: typeof database,
  userId: string,
  organizationId?: string,
) {
  const now = new Date();
  return db.course.findMany({
    where: {
      organizationId,
      status: "PUBLISHED",
      OR: [
        {
          enrollments: {
            some: {
              userId,
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
                  userId,
                  status: { in: [...activeEnrollmentStatuses] },
                },
              },
            },
          },
        },
      ],
    },
    orderBy: [{ title: "asc" }, { id: "asc" }],
    select: { id: true, title: true },
  });
}

export const practiceRouter = createTRPCRouter({
  getVocabularyPool: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(30).default(24),
        organizationId: z.string().min(1).optional(),
        seed,
      }),
    )
    .query(async ({ ctx, input }) => {
      const available = (
        await getAvailablePracticeItems(
          ctx.db,
          ctx.actorUserId,
          input.organizationId,
        )
      ).filter((item) => item.type === "VOCABULARY_SET");
      const placementById = new Map(
        available.map((item) => [item.courseItemId, item]),
      );
      const placementMetadata = await ctx.db.courseItem.findMany({
        where: {
          id: { in: [...placementById.keys()] },
          isPublished: true,
          type: "VOCABULARY_SET",
        },
        orderBy: [{ position: "asc" }, { id: "asc" }],
        select: {
          id: true,
          vocabularySet: {
            select: {
              id: true,
              title: true,
              _count: { select: { entries: true } },
            },
          },
        },
      });
      const seenSets = new Set<string>();
      const sets = placementMetadata.flatMap((placement) => {
        const set = placement.vocabularySet;
        const source = placementById.get(placement.id);
        if (
          !set ||
          set._count.entries === 0 ||
          !source ||
          seenSets.has(set.id)
        ) {
          return [];
        }
        seenSets.add(set.id);
        return [{ id: placement.id, set, source }];
      });
      const orderedSets = sampleForPractice(
        sets,
        `${ctx.actorUserId}:${input.seed}:vocabulary-sets`,
        sets.length,
      );
      async function loadVocabularyCandidates(
        selectedSets: typeof orderedSets,
      ) {
        const selectedByPlacementId = new Map(
          selectedSets.map((selected) => [selected.id, selected]),
        );
        const placements = await ctx.db.courseItem.findMany({
          where: { id: { in: [...selectedByPlacementId.keys()] } },
          orderBy: [{ position: "asc" }, { id: "asc" }],
          select: {
            id: true,
            vocabularySet: {
              select: {
                id: true,
                title: true,
                entries: {
                  orderBy: [{ createdAt: "asc" }, { id: "asc" }],
                  select: {
                    id: true,
                    term: true,
                    definition: true,
                    imageAssetId: true,
                    progress: {
                      where: { userId: ctx.actorUserId },
                      select: {
                        contentHash: true,
                        nextReviewAt: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });
        return placements.flatMap((placement) => {
          const set = placement.vocabularySet;
          const selected = selectedByPlacementId.get(placement.id);
          if (!set || !selected) return [];
          const entries = set.entries.filter(
            (entry) => entry.term.trim() && entry.definition.trim(),
          );
          const setVersion = vocabularySetVersion(entries);

          return entries.map((entry) => {
            const saved = entry.progress[0];
            const current =
              saved?.contentHash === vocabularyContentHash(entry)
                ? saved
                : null;
            return {
              id: entry.id,
              entryId: entry.id,
              term: entry.term,
              definition: entry.definition,
              imageAssetId: entry.imageAssetId,
              vocabularySetId: set.id,
              vocabularySetTitle: set.title,
              setEntryCount: entries.length,
              setVersion,
              courseId: selected.source.courseId,
              courseTitle: selected.source.courseTitle,
              sourceCourseItemId: selected.source.courseItemId,
              due: !current?.nextReviewAt || current.nextReviewAt <= new Date(),
            };
          });
        });
      }
      const candidates: Awaited<ReturnType<typeof loadVocabularyCandidates>> =
        [];
      const batchSize = Math.min(input.limit * 2, 60);
      for (
        let offset = 0;
        offset < orderedSets.length && candidates.length < input.limit;
        offset += batchSize
      ) {
        candidates.push(
          ...(await loadVocabularyCandidates(
            orderedSets.slice(offset, offset + batchSize),
          )),
        );
      }
      const due = candidates.filter((item) => item.due);
      const items = sampleForPractice(
        due.length ? due : candidates,
        `${ctx.actorUserId}:${input.seed}:vocabulary`,
        input.limit,
      ).map(({ id: _id, due: _due, ...item }) => item);

      return {
        items,
        hasAvailableContent: candidates.length > 0,
        serverTime: new Date(),
      };
    }),

  getAssessmentSample: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(10).default(5),
        organizationId: z.string().min(1).optional(),
        seed,
      }),
    )
    .query(async ({ ctx, input }) => {
      const available = (
        await getAvailablePracticeItems(
          ctx.db,
          ctx.actorUserId,
          input.organizationId,
        )
      ).filter((item) => item.type === "ASSESSMENT");
      const placementById = new Map(
        available.map((item) => [item.courseItemId, item]),
      );
      const placementMetadata = await ctx.db.courseItem.findMany({
        where: {
          id: { in: [...placementById.keys()] },
          isPublished: true,
          type: "ASSESSMENT",
        },
        orderBy: [{ position: "asc" }, { id: "asc" }],
        select: {
          id: true,
          assessment: {
            select: {
              id: true,
              title: true,
              status: true,
              _count: {
                select: {
                  questions: {
                    where: {
                      type: { in: ["SINGLE_CHOICE", "MULTIPLE_CHOICE"] },
                    },
                  },
                },
              },
            },
          },
        },
      });
      const seenAssessments = new Set<string>();
      const assessments = placementMetadata.flatMap((placement) => {
        const assessment = placement.assessment;
        const source = placementById.get(placement.id);
        if (
          assessment?.status !== "PUBLISHED" ||
          assessment._count.questions === 0 ||
          !source ||
          seenAssessments.has(assessment.id)
        ) {
          return [];
        }
        seenAssessments.add(assessment.id);
        return [{ id: placement.id, assessment, source }];
      });
      const orderedAssessments = sampleForPractice(
        assessments,
        `${ctx.actorUserId}:${input.seed}:assessments`,
        assessments.length,
      );
      async function loadAssessmentCandidates(
        selectedAssessments: typeof orderedAssessments,
      ) {
        const selectedByPlacementId = new Map(
          selectedAssessments.map((selected) => [selected.id, selected]),
        );
        const placements = await ctx.db.courseItem.findMany({
          where: { id: { in: [...selectedByPlacementId.keys()] } },
          orderBy: [{ position: "asc" }, { id: "asc" }],
          select: {
            id: true,
            assessment: {
              select: {
                id: true,
                title: true,
                questions: {
                  where: {
                    type: { in: ["SINGLE_CHOICE", "MULTIPLE_CHOICE"] },
                  },
                  orderBy: [{ position: "asc" }, { id: "asc" }],
                  select: {
                    id: true,
                    type: true,
                    prompt: true,
                    options: {
                      orderBy: [{ position: "asc" }, { id: "asc" }],
                      select: { id: true, content: true, isCorrect: true },
                    },
                  },
                },
              },
            },
          },
        });
        return placements.flatMap((placement) => {
          const assessment = placement.assessment;
          const selected = selectedByPlacementId.get(placement.id);
          if (!assessment || !selected) return [];

          return assessment.questions.flatMap((question) => {
            const correctCount = question.options.filter(
              (option) => option.isCorrect,
            ).length;
            const valid =
              question.options.length >= 2 &&
              (question.type === "SINGLE_CHOICE"
                ? correctCount === 1
                : correctCount > 0);
            if (!valid) return [];

            return [
              {
                id: question.id,
                questionId: question.id,
                type: question.type,
                prompt: question.prompt,
                options: question.options,
                assessmentTitle: assessment.title,
                courseId: selected.source.courseId,
                courseTitle: selected.source.courseTitle,
                sourceCourseItemId: selected.source.courseItemId,
              },
            ];
          });
        });
      }
      const candidates: Awaited<ReturnType<typeof loadAssessmentCandidates>> =
        [];
      const batchSize = Math.min(input.limit * 3, 20);
      for (
        let offset = 0;
        offset < orderedAssessments.length && candidates.length < input.limit;
        offset += batchSize
      ) {
        candidates.push(
          ...(await loadAssessmentCandidates(
            orderedAssessments.slice(offset, offset + batchSize),
          )),
        );
      }
      const questions = sampleForPractice(
        candidates,
        `${ctx.actorUserId}:${input.seed}:assessment`,
        input.limit,
      ).map(({ id: _id, options, ...question }) => ({
        ...question,
        options: preparePracticeOptions(
          options,
          `${ctx.actorUserId}:${input.seed}:${question.questionId}:options`,
        ),
      }));

      return {
        questions,
        hasAvailableContent: candidates.length > 0,
        serverTime: new Date(),
      };
    }),

  gradeAssessmentAnswer: protectedProcedure
    .input(
      z.object({
        questionId: z.string().min(1),
        sourceCourseItemId: z.string().min(1),
        optionIds: z.array(z.string().min(1)).min(1).max(20),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const source = await ctx.db.courseItem.findFirst({
        where: {
          id: input.sourceCourseItemId,
          isPublished: true,
          type: "ASSESSMENT",
        },
        select: { module: { select: { courseId: true } } },
      });
      const courses = await getPracticeCourses(ctx.db, ctx.actorUserId);
      if (
        !source ||
        !courses.some((course) => course.id === source.module.courseId)
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const outline = await getCourseOutlineForUser(
        source.module.courseId,
        ctx.actorUserId,
        { managementAccess: false },
      );
      const available = outline.modules.some(
        (module) =>
          module.access !== "LOCKED" &&
          module.items.some((item) => item.id === input.sourceCourseItemId),
      );
      if (!available) throw new TRPCError({ code: "FORBIDDEN" });
      const question = await ctx.db.assessmentQuestion.findFirst({
        where: {
          id: input.questionId,
          type: { in: ["SINGLE_CHOICE", "MULTIPLE_CHOICE"] },
          assessment: {
            status: "PUBLISHED",
            courseItems: {
              some: {
                id: input.sourceCourseItemId,
                isPublished: true,
                type: "ASSESSMENT",
              },
            },
          },
        },
        select: {
          type: true,
          explanation: true,
          options: { select: { id: true, isCorrect: true } },
        },
      });
      if (!question) throw new TRPCError({ code: "NOT_FOUND" });
      const correctCount = question.options.filter(
        (option) => option.isCorrect,
      ).length;
      if (
        question.options.length < 2 ||
        correctCount === 0 ||
        (question.type === "SINGLE_CHOICE" && correctCount !== 1)
      ) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "This question is not configured for automatic practice",
        });
      }
      const result = gradePracticeChoice(question.options, input.optionIds);
      if (!result) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "The answer contains an option from another question",
        });
      }

      return { ...result, explanation: question.explanation };
    }),
});
