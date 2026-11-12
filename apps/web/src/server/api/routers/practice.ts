import { TRPCError } from "@trpc/server";
import { entryMeanings } from "@hakgyo/shared";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  getCourseOutlineForUser,
  getCourseOutlinesForUser,
  type CourseOutline,
} from "~/server/learning/course-outline";
import { enrolledCourseWhere } from "~/server/learning/enrolled-courses";
import type { db as database } from "~/server/db";
import { memoizeForRequest } from "~/server/request-cache";
import { vocabularyContentHash } from "~/server/vocabulary/progress-policy";
import {
  gradePracticeChoice,
  preparePracticeOptions,
  vocabularySetVersion,
} from "~/server/practice/policy";
import {
  prioritizeQuestions,
  prioritizeVocabulary,
  RECENT_MISS_DAYS,
} from "~/server/practice/priorities";

/**
 * Sets or quizzes one practice sample ranks: plenty for any course, and a
 * bound on what one request loads.
 */
const MAX_PRACTICE_SETS = 120;
const MAX_PRACTICE_ASSESSMENTS = 60;

const seed = z.string().trim().min(1).max(100);

export type PracticeItem = {
  courseId: string;
  courseTitle: string;
  courseItemId: string;
  type: CourseOutline["modules"][number]["items"][number]["type"];
};

/** Items of learner-view outlines (`managementAccess: false`) outside locked modules. */
export function practiceItemsFromOutlines(
  outlines: readonly CourseOutline[],
): PracticeItem[] {
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

// Shared by the vocabulary pool and the assessment sample in one request.
function getAvailablePracticeItems(userId: string, organizationId?: string) {
  return memoizeForRequest(
    `practiceItems:${userId}:${organizationId ?? ""}`,
    async () =>
      practiceItemsFromOutlines(
        await getCourseOutlinesForUser(
          await enrolledCourseWhere({ userId, organizationId }),
          userId,
          { managementAccess: false },
        ),
      ),
  );
}

const vocabularyPoolInput = z.object({
  limit: z.number().int().min(1).max(30).default(24),
  organizationId: z.string().min(1).optional(),
  seed,
});

const assessmentSampleInput = z.object({
  limit: z.number().int().min(1).max(10).default(5),
  organizationId: z.string().min(1).optional(),
  seed,
});

type PracticeContext = { db: typeof database; actorUserId: string };

/**
 * `available` lets callers that already built learner-view outlines for the same courses (the
 * mobile dashboard) skip loading them again.
 */
export async function getVocabularyPool(
  ctx: PracticeContext,
  input: z.infer<typeof vocabularyPoolInput>,
  availableItems?: readonly PracticeItem[],
) {
  const available = (
    availableItems ??
    (await getAvailablePracticeItems(ctx.actorUserId, input.organizationId))
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
        },
      },
    },
  });
  // Sets without entries are skipped. Checked per page of set ids instead of
  // a relation `_count`, which aggregates the whole entry table.
  const vocabularySetIds = [
    ...new Set(
      placementMetadata.flatMap((placement) =>
        placement.vocabularySet ? [placement.vocabularySet.id] : [],
      ),
    ),
  ];
  const setsWithEntries = new Set(
    vocabularySetIds.length === 0
      ? []
      : (
          await ctx.db.vocabularyEntry.groupBy({
            by: ["vocabularySetId"],
            where: { vocabularySetId: { in: vocabularySetIds } },
          })
        ).map((row) => row.vocabularySetId),
  );
  // Course order of every placement, for "the set the learner is on".
  const outlineOrder = new Map(
    available.map((item, index) => [item.courseItemId, index]),
  );
  const seenSets = new Set<string>();
  const sets = placementMetadata
    .flatMap((placement) => {
      const set = placement.vocabularySet;
      const source = placementById.get(placement.id);
      if (
        !set ||
        !setsWithEntries.has(set.id) ||
        !source ||
        seenSets.has(set.id)
      ) {
        return [];
      }
      seenSets.add(set.id);
      return [{ id: placement.id, set, source }];
    })
    .sort(
      (a, b) => (outlineOrder.get(a.id) ?? 0) - (outlineOrder.get(b.id) ?? 0),
    )
    .slice(0, MAX_PRACTICE_SETS);
  const now = new Date();
  const missSince = new Date(
    now.getTime() - RECENT_MISS_DAYS * 24 * 60 * 60 * 1000,
  );
  const [placements, completedSets, recentAttempts] = await Promise.all([
    sets.length === 0
      ? []
      : ctx.db.courseItem.findMany({
          where: { id: { in: sets.map((selected) => selected.id) } },
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
                    meanings: true,
                    definition: true,
                    imageAssetId: true,
                    progress: {
                      where: { userId: ctx.actorUserId },
                      select: {
                        contentHash: true,
                        practicedAt: true,
                        masteredAt: true,
                        nextReviewAt: true,
                      },
                    },
                  },
                },
              },
            },
          },
        }),
    sets.length === 0
      ? []
      : ctx.db.contentProgress.findMany({
          where: {
            userId: ctx.actorUserId,
            status: "COMPLETED",
            courseItemId: { in: sets.map((selected) => selected.id) },
          },
          select: { courseItemId: true },
        }),
    ctx.db.vocabularyPracticeAttempt.findMany({
      where: { userId: ctx.actorUserId, createdAt: { gte: missSince } },
      orderBy: { createdAt: "desc" },
      select: { entryId: true, result: true },
    }),
  ]);
  const completedSetIds = new Set(
    completedSets.map((progress) => progress.courseItemId),
  );
  // The latest answer per word decides: right since then clears a miss.
  const latestResult = new Map<string, string>();
  for (const attempt of recentAttempts) {
    if (!latestResult.has(attempt.entryId)) {
      latestResult.set(attempt.entryId, attempt.result);
    }
  }
  const selectedById = new Map(sets.map((selected) => [selected.id, selected]));
  const candidates = placements.flatMap((placement) => {
    const set = placement.vocabularySet;
    const selected = selectedById.get(placement.id);
    if (!set || !selected) return [];
    const entries = set.entries.filter(
      (entry) => entry.term.trim() && entry.definition.trim(),
    );
    const setVersion = vocabularySetVersion(entries);
    return entries.map((entry, entryOrder) => {
      const saved = entry.progress[0];
      const current =
        saved?.contentHash === vocabularyContentHash(entry) ? saved : null;
      const latest = latestResult.get(entry.id);
      return {
        id: entry.id,
        progress: current
          ? {
              practicedAt: current.practicedAt,
              masteredAt: current.masteredAt,
              nextReviewAt: current.nextReviewAt,
            }
          : null,
        recentlyMissed: latest !== undefined && latest !== "CORRECT",
        setCompleted: completedSetIds.has(placement.id),
        setOrder: outlineOrder.get(placement.id) ?? 0,
        entryOrder,
        item: {
          entryId: entry.id,
          term: entry.term,
          meanings: entryMeanings(entry),
          /** Joined meanings, for app builds that predate `meanings`. */
          definition: entry.definition,
          imageAssetId: entry.imageAssetId,
          vocabularySetId: set.id,
          vocabularySetTitle: set.title,
          setEntryCount: entries.length,
          setVersion,
          courseId: selected.source.courseId,
          courseTitle: selected.source.courseTitle,
          sourceCourseItemId: selected.source.courseItemId,
        },
      };
    });
  });
  const items = prioritizeVocabulary(candidates, {
    now,
    limit: input.limit,
    seed: `${ctx.actorUserId}:${input.seed}:vocabulary`,
  }).map((candidate) => candidate.item);

  return {
    items,
    hasAvailableContent: candidates.length > 0,
    serverTime: now,
  };
}

export async function getAssessmentSample(
  ctx: PracticeContext,
  input: z.infer<typeof assessmentSampleInput>,
  availableItems?: readonly PracticeItem[],
) {
  const available = (
    availableItems ??
    (await getAvailablePracticeItems(ctx.actorUserId, input.organizationId))
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
        },
      },
    },
  });
  // Assessments without choice questions are skipped; checked for this page
  // of assessment ids instead of a relation `_count` over every question.
  const assessmentIds = [
    ...new Set(
      placementMetadata.flatMap((placement) =>
        placement.assessment ? [placement.assessment.id] : [],
      ),
    ),
  ];
  const assessmentsWithQuestions = new Set(
    assessmentIds.length === 0
      ? []
      : (
          await ctx.db.assessmentQuestion.groupBy({
            by: ["assessmentId"],
            where: {
              assessmentId: { in: assessmentIds },
              type: { in: ["SINGLE_CHOICE", "MULTIPLE_CHOICE"] },
              groupId: null,
            },
          })
        ).map((row) => row.assessmentId),
  );
  const outlineOrder = new Map(
    available.map((item, index) => [item.courseItemId, index]),
  );
  const seenAssessments = new Set<string>();
  const assessments = placementMetadata
    .flatMap((placement) => {
      const assessment = placement.assessment;
      const source = placementById.get(placement.id);
      if (
        !assessment ||
        !assessmentsWithQuestions.has(assessment.id) ||
        !source ||
        seenAssessments.has(assessment.id)
      ) {
        return [];
      }
      seenAssessments.add(assessment.id);
      return [{ id: placement.id, assessment, source }];
    })
    .sort(
      (a, b) => (outlineOrder.get(a.id) ?? 0) - (outlineOrder.get(b.id) ?? 0),
    )
    .slice(0, MAX_PRACTICE_ASSESSMENTS);
  const [placements, passedPlacements] = await Promise.all([
    assessments.length === 0
      ? []
      : ctx.db.courseItem.findMany({
          where: { id: { in: assessments.map((selected) => selected.id) } },
          select: {
            id: true,
            assessment: {
              select: {
                id: true,
                title: true,
                questions: {
                  // Grouped questions need their group's passage or picture, so practice skips them.
                  where: {
                    type: { in: ["SINGLE_CHOICE", "MULTIPLE_CHOICE"] },
                    groupId: null,
                  },
                  orderBy: [{ position: "asc" }, { id: "asc" }],
                  select: {
                    id: true,
                    type: true,
                    prompt: true,
                    points: true,
                    options: {
                      orderBy: [{ position: "asc" }, { id: "asc" }],
                      select: { id: true, content: true, isCorrect: true },
                    },
                  },
                },
              },
            },
          },
        }),
    assessments.length === 0
      ? []
      : ctx.db.contentProgress.findMany({
          where: {
            userId: ctx.actorUserId,
            status: "COMPLETED",
            courseItemId: { in: assessments.map((selected) => selected.id) },
          },
          select: { courseItemId: true },
        }),
  ]);
  const passedIds = new Set(
    passedPlacements.map((progress) => progress.courseItemId),
  );
  const selectedById = new Map(
    assessments.map((selected) => [selected.id, selected]),
  );
  const questions = placements.flatMap((placement) => {
    const assessment = placement.assessment;
    const selected = selectedById.get(placement.id);
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
      return valid ? [{ question, assessment, selected, placement }] : [];
    });
  });
  // The learner's latest graded answer per question, from submitted
  // attempts: not full marks means it still needs practice.
  const answers =
    questions.length === 0
      ? []
      : await ctx.db.assessmentAnswer.findMany({
          where: {
            questionId: { in: questions.map((entry) => entry.question.id) },
            attempt: {
              userId: ctx.actorUserId,
              status: { in: ["SUBMITTED", "IN_REVIEW", "GRADED"] },
            },
          },
          orderBy: { createdAt: "desc" },
          select: { questionId: true, autoScore: true, manualScore: true },
        });
  const latestScore = new Map<string, number | null>();
  for (const answer of answers) {
    if (!latestScore.has(answer.questionId)) {
      latestScore.set(
        answer.questionId,
        answer.manualScore ?? answer.autoScore,
      );
    }
  }
  const candidates = questions.map(
    ({ question, assessment, selected, placement }) => {
      const score = latestScore.get(question.id);
      return {
        id: question.id,
        answeredWrong:
          score !== undefined && score !== null && score < question.points,
        assessmentPassed: passedIds.has(placement.id),
        question: {
          questionId: question.id,
          type: question.type,
          prompt: question.prompt,
          options: question.options,
          assessmentTitle: assessment.title,
          courseId: selected.source.courseId,
          courseTitle: selected.source.courseTitle,
          sourceCourseItemId: selected.source.courseItemId,
        },
      };
    },
  );
  const sample = prioritizeQuestions(candidates, {
    limit: input.limit,
    seed: `${ctx.actorUserId}:${input.seed}:assessment`,
  }).map(({ question: { options, ...question } }) => ({
    ...question,
    options: preparePracticeOptions(
      options,
      `${ctx.actorUserId}:${input.seed}:${question.questionId}:options`,
    ),
  }));

  return {
    questions: sample,
    hasAvailableContent: candidates.length > 0,
    serverTime: new Date(),
  };
}

export const practiceRouter = createTRPCRouter({
  getVocabularyPool: protectedProcedure
    .input(vocabularyPoolInput)
    .query(({ ctx, input }) => getVocabularyPool(ctx, input)),

  getAssessmentSample: protectedProcedure
    .input(assessmentSampleInput)
    .query(({ ctx, input }) => getAssessmentSample(ctx, input)),

  gradeAssessmentAnswer: protectedProcedure
    .input(
      z.object({
        questionId: z.string().min(1),
        sourceCourseItemId: z.string().min(1),
        optionIds: z.array(z.string().min(1)).min(1).max(20),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // The question is only used after the access checks below pass.
      const [source, question] = await Promise.all([
        ctx.db.courseItem.findFirst({
          where: {
            id: input.sourceCourseItemId,
            isPublished: true,
            type: "ASSESSMENT",
          },
          select: { module: { select: { courseId: true } } },
        }),
        ctx.db.assessmentQuestion.findFirst({
          where: {
            id: input.questionId,
            type: { in: ["SINGLE_CHOICE", "MULTIPLE_CHOICE"] },
            assessment: {
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
        }),
      ]);
      if (!source) throw new TRPCError({ code: "FORBIDDEN" });
      // Practice is limited to courses the learner is enrolled in (staff
      // access alone does not count), outside locked modules.
      const [enrolledCourse, outline] = await Promise.all([
        enrolledCourseWhere({ userId: ctx.actorUserId }).then((enrolled) =>
          ctx.db.course.findFirst({
            where: { AND: [{ id: source.module.courseId }, enrolled] },
            select: { id: true },
          }),
        ),
        getCourseOutlineForUser(source.module.courseId, ctx.actorUserId, {
          managementAccess: false,
        }),
      ]);
      if (!enrolledCourse) throw new TRPCError({ code: "FORBIDDEN" });
      const available = outline.modules.some(
        (module) =>
          module.access !== "LOCKED" &&
          module.items.some((item) => item.id === input.sourceCourseItemId),
      );
      if (!available) throw new TRPCError({ code: "FORBIDDEN" });
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
          message: "Soal ini tidak dapat dipakai untuk latihan otomatis.",
        });
      }
      const result = gradePracticeChoice(question.options, input.optionIds);
      if (!result) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Jawaban berisi pilihan dari soal lain.",
        });
      }

      return { ...result, explanation: question.explanation };
    }),
});
