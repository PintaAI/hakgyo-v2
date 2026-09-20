import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { assessmentRouter } from "~/server/api/routers/assessment";
import { assessmentEventRouter } from "~/server/api/routers/assessment-event";
import { gamificationRouter } from "~/server/api/routers/gamification";
import { learningRouter } from "~/server/api/routers/learning";
import { practiceRouter } from "~/server/api/routers/practice";
import {
  createTRPCRouter,
  protectedProcedure,
  type TRPCContext,
} from "~/server/api/trpc";
import { r2, r2Bucket } from "~/server/r2";

const ASSET_DOWNLOAD_TTL_SECONDS = 5 * 60;
const MOBILE_PRACTICE_SEED = "mobile-sync-v1";

const organizationScope = z
  .object({ organizationId: z.string().min(1).optional() })
  .optional();

const vocabularyAttempt = z.object({
  attemptId: z.string().trim().min(1).max(200),
  sourceCourseItemId: z.string().min(1),
  vocabularySetId: z.string().min(1),
  entryId: z.string().min(1),
  evidence: z.enum(["RECOGNITION", "RECALL", "APPLICATION"]),
  result: z.enum(["CORRECT", "INCORRECT", "REVEALED"]),
});

const answer = z.object({
  questionId: z.string().min(1),
  optionIds: z.array(z.string().min(1)).max(100),
  content: z.string().max(20_000).optional(),
});

const syncOperation = z.discriminatedUnion("kind", [
  z.object({
    id: z.string().min(1).max(240),
    kind: z.literal("CONTENT_COMPLETED"),
    courseItemId: z.string().min(1),
  }),
  z.object({
    id: z.string().min(1).max(240),
    kind: z.literal("VOCABULARY_SESSION_COMPLETED"),
    gameKey: z.string().trim().min(1).max(100),
    sessionId: z.string().trim().min(1).max(200),
    timeZone: z.string().trim().min(1).max(100).optional(),
    attempts: z.array(vocabularyAttempt).min(1).max(500),
  }),
  z.object({
    id: z.string().min(1).max(240),
    kind: z.literal("ASSESSMENT_COMPLETED"),
    attemptId: z.string().min(1),
    answers: z.array(answer).max(200),
  }),
]);

async function getDashboard(
  ctx: TRPCContext,
  input: z.infer<typeof organizationScope>,
) {
  const learning = learningRouter.createCaller(ctx);
  const assessment = assessmentRouter.createCaller(ctx);
  const assessmentEvent = assessmentEventRouter.createCaller(ctx);
  const gamification = gamificationRouter.createCaller(ctx);
  const practice = practiceRouter.createCaller(ctx);
  const scope = input?.organizationId
    ? { organizationId: input.organizationId }
    : undefined;

  const [
    courses,
    cohorts,
    events,
    milestones,
    attempts,
    gamificationSummary,
    vocabularyPractice,
    assessmentPractice,
  ] = await Promise.all([
    learning.listMyCourses(scope),
    learning.listMyCohorts(scope),
    assessmentEvent.listForLearner(scope),
    learning.listMyCohortMilestones(scope),
    assessment.listMyAttempts(scope),
    gamification.getMySummary(),
    practice.getVocabularyPool({
      ...scope,
      limit: 30,
      seed: MOBILE_PRACTICE_SEED,
    }),
    practice.getAssessmentSample({
      ...scope,
      limit: 10,
      seed: MOBILE_PRACTICE_SEED,
    }),
  ]);

  const courseIds = [
    ...new Set([
      ...courses.map((course) => course.id),
      ...cohorts.map((cohort) => cohort.course.id),
    ]),
  ];
  const outlineEntries = await Promise.all(
    courseIds.map(
      async (courseId) =>
        [courseId, await learning.getCourseOutline({ courseId })] as const,
    ),
  );
  const availableItemIds = [
    ...new Set(
      outlineEntries.flatMap(([, outline]) =>
        outline.modules.flatMap((module) =>
          module.access === "LOCKED" ? [] : module.items.map((item) => item.id),
        ),
      ),
    ),
  ];
  const itemDetailEntries: Array<
    readonly [
      string,
      NonNullable<Awaited<ReturnType<typeof learning.getCourseItem>>>,
    ]
  > = [];
  for (let offset = 0; offset < availableItemIds.length; offset += 10) {
    const batch = await Promise.all(
      availableItemIds.slice(offset, offset + 10).map(async (courseItemId) => {
        const detail = await learning.getCourseItem({ courseItemId });
        return detail ? ([courseItemId, detail] as const) : null;
      }),
    );
    itemDetailEntries.push(...batch.filter((entry) => entry !== null));
  }
  const itemDetails = Object.fromEntries(itemDetailEntries);

  const assessmentDetailEntries = await Promise.all(
    itemDetailEntries.flatMap(([courseItemId, item]) =>
      item.assessment
        ? [
            assessment
              .getForCourseItem({ courseItemId })
              .then((detail) => [courseItemId, detail] as const),
          ]
        : [],
    ),
  );
  const assessmentDetails = Object.fromEntries(assessmentDetailEntries);
  const resumableAttemptEntries = await Promise.all(
    attempts
      .filter((attempt) => attempt.status === "IN_PROGRESS")
      .map(async (attempt) => {
        const [attemptDetail, assessmentDetail] = await Promise.all([
          assessment.getMyAttempt({ attemptId: attempt.id }),
          assessment.getForCourseItem({
            courseItemId: attempt.courseItemId,
            attemptId: attempt.id,
          }),
        ]);
        return [attempt.id, { attemptDetail, assessmentDetail }] as const;
      }),
  );

  const assetIds = new Set<string>();
  for (const [, item] of itemDetailEntries) {
    for (const relation of item.material?.assets ?? []) {
      assetIds.add(relation.asset.id);
    }
    for (const entry of item.vocabularySet?.entries ?? []) {
      if (entry.audioAsset) assetIds.add(entry.audioAsset.id);
      if (entry.imageAsset) assetIds.add(entry.imageAsset.id);
    }
    for (const vocabularySet of item.embeddedResources.vocabularySets) {
      for (const entry of vocabularySet.entries) {
        if (entry.audioAsset) assetIds.add(entry.audioAsset.id);
        if (entry.imageAsset) assetIds.add(entry.imageAsset.id);
      }
    }
  }
  const assets = assetIds.size
    ? await ctx.db.asset.findMany({
        where: {
          id: { in: [...assetIds] },
          confirmedAt: { not: null },
          deletedAt: null,
        },
        select: {
          id: true,
          objectKey: true,
          fileName: true,
          contentType: true,
          size: true,
        },
      })
    : [];
  const assetDownloads = Object.fromEntries(
    await Promise.all(
      assets.map(
        async (asset) =>
          [
            asset.id,
            {
              downloadUrl: await getSignedUrl(
                r2,
                new GetObjectCommand({
                  Bucket: r2Bucket,
                  Key: asset.objectKey,
                  ResponseContentDisposition: "inline",
                }),
                { expiresIn: ASSET_DOWNLOAD_TTL_SECONDS },
              ),
              expiresIn: ASSET_DOWNLOAD_TTL_SECONDS,
              fileName: asset.fileName,
              contentType: asset.contentType,
              size: asset.size,
            },
          ] as const,
      ),
    ),
  );

  return {
    generatedAt: new Date(),
    organizationId: input?.organizationId ?? null,
    courses,
    cohorts,
    events,
    milestones,
    attempts,
    gamification: gamificationSummary,
    outlines: Object.fromEntries(outlineEntries),
    itemDetails,
    assessmentDetails,
    attemptDetails: Object.fromEntries(
      resumableAttemptEntries.map(([attemptId, entry]) => [
        attemptId,
        entry.attemptDetail,
      ]),
    ),
    assessmentAttemptDetails: Object.fromEntries(
      resumableAttemptEntries.map(([attemptId, entry]) => [
        attemptId,
        entry.assessmentDetail,
      ]),
    ),
    practice: {
      vocabulary: vocabularyPractice,
      assessment: assessmentPractice,
    },
    assetDownloads,
  };
}

export const mobileSyncRouter = createTRPCRouter({
  getDashboard: protectedProcedure
    .input(organizationScope)
    .query(({ ctx, input }) => getDashboard(ctx, input)),

  startAssessment: protectedProcedure
    .input(
      z.object({
        courseItemId: z.string().min(1),
        cohortId: z.string().min(1).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const assessment = assessmentRouter.createCaller(ctx);
      const started = await assessment.startAttempt(input);
      const [attempt, assessmentDetail] = await Promise.all([
        assessment.getMyAttempt({ attemptId: started.id }),
        assessment.getForCourseItem({
          courseItemId: input.courseItemId,
          attemptId: started.id,
        }),
      ]);
      return { attempt, assessmentDetail };
    }),

  startEventAssessment: protectedProcedure
    .input(z.object({ eventId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const assessmentEvent = assessmentEventRouter.createCaller(ctx);
      const assessment = assessmentRouter.createCaller(ctx);
      const started = await assessmentEvent.startAttempt(input);
      const attempt = await assessment.getMyAttempt({ attemptId: started.id });
      const assessmentDetail = await assessment.getForCourseItem({
        courseItemId: attempt.courseItemId,
        attemptId: attempt.id,
      });
      return { attempt, assessmentDetail };
    }),

  commit: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().min(1).optional(),
        operations: z.array(syncOperation).max(500),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const learning = learningRouter.createCaller(ctx);
      const assessment = assessmentRouter.createCaller(ctx);
      const results: Array<{
        id: string;
        kind: z.infer<typeof syncOperation>["kind"];
        assessment?: Awaited<ReturnType<typeof assessment.getMyAttempt>>;
        assessmentDetail?: Awaited<
          ReturnType<typeof assessment.getForCourseItem>
        >;
        vocabulary?: Awaited<
          ReturnType<typeof learning.recordVocabularyAttempts>
        >;
      }> = [];
      const failures: Array<{
        id: string;
        kind: z.infer<typeof syncOperation>["kind"];
        code: string;
        message: string;
      }> = [];

      for (const operation of input.operations) {
        try {
          if (operation.kind === "CONTENT_COMPLETED") {
            await learning.markContentProgress({
              courseItemId: operation.courseItemId,
              status: "COMPLETED",
            });
            results.push({ id: operation.id, kind: operation.kind });
            continue;
          }

          if (operation.kind === "VOCABULARY_SESSION_COMPLETED") {
            let vocabulary:
              | Awaited<ReturnType<typeof learning.recordVocabularyAttempts>>
              | undefined;
            for (
              let index = 0;
              index < operation.attempts.length;
              index += 50
            ) {
              vocabulary = await learning.recordVocabularyAttempts({
                gameKey: operation.gameKey,
                sessionId: operation.sessionId,
                timeZone: operation.timeZone,
                attempts: operation.attempts.slice(index, index + 50),
              });
            }
            results.push({
              id: operation.id,
              kind: operation.kind,
              vocabulary,
            });
            continue;
          }

          let current = await assessment.getMyAttempt({
            attemptId: operation.attemptId,
          });
          // The attempt status is the durable receipt. If the client lost the
          // previous response, replay acknowledges the already-applied submit.
          if (current.status === "IN_PROGRESS") {
            if (operation.answers.length) {
              await assessment.saveAnswers({
                attemptId: operation.attemptId,
                answers: operation.answers,
              });
            }
            await assessment.submitAttempt({ attemptId: operation.attemptId });
            current = await assessment.getMyAttempt({
              attemptId: operation.attemptId,
            });
          }
          results.push({
            id: operation.id,
            kind: operation.kind,
            assessment: current,
            assessmentDetail: await assessment.getForCourseItem({
              courseItemId: current.courseItemId,
              attemptId: operation.attemptId,
            }),
          });
        } catch (cause) {
          failures.push({
            id: operation.id,
            kind: operation.kind,
            code:
              cause instanceof TRPCError ? cause.code : "INTERNAL_SERVER_ERROR",
            message:
              cause instanceof Error ? cause.message : "Sync operation failed",
          });
        }
      }

      return {
        acknowledgedOperationIds: results.map((result) => result.id),
        failures,
        results,
        dashboard: await getDashboard(
          ctx,
          input.organizationId
            ? { organizationId: input.organizationId }
            : undefined,
        ),
      };
    }),
});
