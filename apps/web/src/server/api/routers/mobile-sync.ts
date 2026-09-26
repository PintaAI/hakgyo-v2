import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { assessmentRouter } from "~/server/api/routers/assessment";
import { assessmentEventRouter } from "~/server/api/routers/assessment-event";
import { gamificationRouter } from "~/server/api/routers/gamification";
import {
  learningRouter,
  recordVocabularyAttemptsForUser,
  recordVocabularyAttemptsInput,
} from "~/server/api/routers/learning";
import {
  getAssessmentSample,
  getVocabularyPool,
  practiceItemsFromOutlines,
} from "~/server/api/routers/practice";
import {
  createTRPCRouter,
  protectedProcedure,
  type TRPCContext,
} from "~/server/api/trpc";
import { getLearnerAssessmentsForCourseItems } from "~/server/assessment/learner-view";
import { getCourseItemDetails } from "~/server/learning/course-item-detail";
import { getCourseOutlineViewsForUser } from "~/server/learning/course-outline";
import { buildSidebarIndicatorCandidates } from "~/server/mobile/sidebar-indicators";
import { requireCourseItemAccess } from "~/server/authorization";
import { r2, r2Bucket } from "~/server/r2";
import {
  createRequestCache,
  runWithRequestCache,
} from "~/server/request-cache";

// Same validation (and BAD_REQUEST error) as calling the procedure.
async function parseVocabularyAttempts(input: unknown) {
  try {
    return await recordVocabularyAttemptsInput.parseAsync(input);
  } catch (cause) {
    throw new TRPCError({ code: "BAD_REQUEST", cause });
  }
}

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

async function getRevision(
  ctx: TRPCContext,
  input: z.infer<typeof organizationScope>,
) {
  const userId = ctx.actorUserId;
  if (!userId) throw new TRPCError({ code: "UNAUTHORIZED" });
  const organizationId = input?.organizationId;
  if (organizationId) {
    const access = await Promise.all([
      ctx.db.organizationMember.findFirst({
        where: { userId, organizationId },
        select: { id: true },
      }),
      ctx.db.courseEnrollment.findFirst({
        where: { userId, course: { organizationId } },
        select: { id: true },
      }),
      ctx.db.cohortEnrollment.findFirst({
        where: { userId, cohort: { organizationId } },
        select: { id: true },
      }),
    ]);
    if (access.every((entry) => !entry)) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
  }
  const organizationIds = organizationId
    ? [organizationId]
    : [
        ...new Set(
          (
            await Promise.all([
              ctx.db.organizationMember.findMany({
                where: { userId },
                select: { organizationId: true },
              }),
              ctx.db.courseEnrollment.findMany({
                where: { userId },
                select: { course: { select: { organizationId: true } } },
              }),
              ctx.db.cohortEnrollment.findMany({
                where: { userId },
                select: { cohort: { select: { organizationId: true } } },
              }),
            ])
          )
            .flatMap((entries) =>
              entries.map((entry) =>
                "organizationId" in entry
                  ? entry.organizationId
                  : "course" in entry
                    ? entry.course.organizationId
                    : entry.cohort.organizationId,
              ),
            )
            .sort(),
        ),
      ];
  const revisions = await ctx.db.mobileSyncRevision.findMany({
    where: {
      OR: [
        { scopeType: "user", scopeId: userId },
        ...organizationIds.map((scopeId) => ({
          scopeType: "organization",
          scopeId,
        })),
      ],
    },
    select: { scopeType: true, scopeId: true, revision: true },
  });
  const userRevision =
    revisions.find((entry) => entry.scopeType === "user")?.revision ?? 0n;
  const organizationRevisions = organizationIds.map(
    (id) =>
      `${id}=${revisions.find((entry) => entry.scopeType === "organization" && entry.scopeId === id)?.revision ?? 0n}`,
  );
  return `${userRevision}:${organizationRevisions.join(",")}`;
}

async function getDashboard(
  ctx: TRPCContext,
  input: z.infer<typeof organizationScope>,
) {
  const actorUserId = ctx.actorUserId;
  if (!actorUserId) throw new TRPCError({ code: "UNAUTHORIZED" });
  // Capture before the snapshot. A concurrent write then changes the revision
  // again, so the next check repairs any partially-read dashboard.
  const revision = await getRevision(ctx, input);
  const learning = learningRouter.createCaller(ctx);
  const assessment = assessmentRouter.createCaller(ctx);
  const assessmentEvent = assessmentEventRouter.createCaller(ctx);
  const gamification = gamificationRouter.createCaller(ctx);
  const scope = input?.organizationId
    ? { organizationId: input.organizationId }
    : undefined;

  const coursesPromise = learning.listMyCourses(scope);
  const cohortsPromise = learning.listMyCohorts(scope);
  // One batched load gives both outline views of every listed course: the
  // default view (what getCourseOutline returns) and the learner view that
  // practice uses.
  const outlineViewsPromise = Promise.all([
    coursesPromise,
    cohortsPromise,
  ]).then(async ([courses, cohorts]) => {
    const courseIds = [
      ...new Set([
        ...courses.map((course) => course.id),
        ...cohorts.map((cohort) => cohort.course.id),
      ]),
    ];
    const views = courseIds.length
      ? await getCourseOutlineViewsForUser(
          { id: { in: courseIds } },
          actorUserId,
        )
      : [];
    const viewsById = new Map(views.map((view) => [view.outline.id, view]));
    return courseIds.flatMap((courseId) => {
      const view = viewsById.get(courseId);
      return view ? [[courseId, view] as const] : [];
    });
  });
  // Practice covers the enrolled courses, which are exactly listMyCourses.
  const practiceContext = { db: ctx.db, actorUserId };
  const practicePromise = Promise.all([
    coursesPromise,
    outlineViewsPromise,
  ]).then(([courses, outlineViews]) => {
    const viewsById = new Map(outlineViews);
    const available = practiceItemsFromOutlines(
      courses.flatMap((course) => {
        const view = viewsById.get(course.id);
        return view ? [view.learnerOutline] : [];
      }),
    );
    return Promise.all([
      getVocabularyPool(
        practiceContext,
        { ...scope, limit: 30, seed: MOBILE_PRACTICE_SEED },
        available,
      ),
      getAssessmentSample(
        practiceContext,
        { ...scope, limit: 10, seed: MOBILE_PRACTICE_SEED },
        available,
      ),
    ]);
  });
  // Outline access is exactly what getCourseItem enforces for each item:
  // learners only see published items of published, enrolled courses, and
  // LOCKED modules are skipped; staff get the full management view.
  const itemDetailsPromise = outlineViewsPromise.then(async (outlineViews) => {
    const availableItemIds = [
      ...new Set(
        outlineViews.flatMap(([, { outline }]) =>
          outline.modules.flatMap((module) =>
            module.access === "LOCKED"
              ? []
              : module.items.map((item) => item.id),
          ),
        ),
      ),
    ];
    const details = await getCourseItemDetails(
      ctx.db,
      actorUserId,
      availableItemIds,
    );
    const itemDetailEntries = availableItemIds.flatMap((courseItemId) => {
      const detail = details.get(courseItemId);
      return detail ? [[courseItemId, detail] as const] : [];
    });
    const assessmentDetails = await getLearnerAssessmentsForCourseItems(
      ctx.db,
      actorUserId,
      itemDetailEntries.flatMap(([courseItemId, item]) =>
        item.assessment ? [courseItemId] : [],
      ),
    );
    return {
      itemDetailEntries,
      assessmentDetailEntries: itemDetailEntries.flatMap(([courseItemId]) => {
        const detail = assessmentDetails.get(courseItemId);
        return detail ? [[courseItemId, detail] as const] : [];
      }),
    };
  });
  const attemptsPromise = assessment.listMyAttempts(scope);
  const resumableAttemptsPromise = attemptsPromise.then((attempts) =>
    Promise.all(
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
    ),
  );

  const [
    courses,
    cohorts,
    events,
    milestones,
    attempts,
    gamificationSummary,
    [vocabularyPractice, assessmentPractice],
    outlineViews,
    { itemDetailEntries, assessmentDetailEntries },
    resumableAttemptEntries,
  ] = await Promise.all([
    coursesPromise,
    cohortsPromise,
    assessmentEvent.listForLearner(scope),
    learning.listMyCohortMilestones(scope),
    attemptsPromise,
    gamification.getMySummary(),
    practicePromise,
    outlineViewsPromise,
    itemDetailsPromise,
    resumableAttemptsPromise,
  ]);
  const outlineEntries = outlineViews.map(
    ([courseId, { outline }]) => [courseId, outline] as const,
  );
  const itemDetails = Object.fromEntries(itemDetailEntries);
  const assessmentDetails = Object.fromEntries(assessmentDetailEntries);

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

  const sidebarOrganizationId = input?.organizationId;
  const sidebarCandidates = sidebarOrganizationId
    ? buildSidebarIndicatorCandidates({
        outlines: outlineEntries,
        events,
        cohorts,
      })
    : [];
  const sidebarSeen = sidebarOrganizationId
    ? await ctx.db.learnerSidebarSeen.findMany({
        where: {
          userId: actorUserId,
          organizationId: sidebarOrganizationId,
          indicatorKey: {
            in: sidebarCandidates.map((candidate) => candidate.key),
          },
        },
        select: { indicatorKey: true },
      })
    : [];
  const seenKeys = new Set(sidebarSeen.map((entry) => entry.indicatorKey));
  const sidebarItems = sidebarCandidates.map((candidate) => ({
    ...candidate,
    unread: !seenKeys.has(candidate.key),
  }));

  return {
    generatedAt: new Date(),
    revision,
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
    sidebarIndicators: {
      unreadCount: sidebarItems.filter((item) => item.unread).length,
      items: sidebarItems,
    },
    assetDownloads,
  };
}

export const mobileSyncRouter = createTRPCRouter({
  getRevision: protectedProcedure
    .input(organizationScope)
    .query(({ ctx, input }) => getRevision(ctx, input)),
  getDashboard: protectedProcedure
    .input(organizationScope)
    .query(({ ctx, input }) => getDashboard(ctx, input)),

  markSidebarSeen: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().min(1),
        keys: z.array(z.string().min(1).max(240)).min(1).max(100),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const keys = [...new Set(input.keys)];
      await ctx.db.learnerSidebarSeen.createMany({
        data: keys.map((indicatorKey) => ({
          userId: ctx.actorUserId,
          organizationId: input.organizationId,
          indicatorKey,
        })),
        skipDuplicates: true,
      });
      return { seen: keys };
    }),

  startAssessment: protectedProcedure
    .input(
      z.object({
        courseItemId: z.string().min(1),
        cohortId: z.string().min(1).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Fresh cache: nested query reads must not reuse lookups from sibling
      // mutations in the same HTTP batch.
      const assessment = assessmentRouter.createCaller({
        ...ctx,
        requestCache: createRequestCache(),
      });
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
      const scopedCtx = { ...ctx, requestCache: createRequestCache() };
      const assessmentEvent = assessmentEventRouter.createCaller(scopedCtx);
      const assessment = assessmentRouter.createCaller(scopedCtx);
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
        includeDashboard: z.boolean().optional(),
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
      // Vocabulary chunks and sessions of one commit authorize the same items
      // repeatedly. Only successful final results are shared: this commit's
      // writes only ever add progress, which can unlock but never revoke
      // access. Each check runs outside any request cache so it never reuses
      // an outline (with LOCKED modules) loaded before an earlier write.
      const grantedAccess = new Map<
        string,
        ReturnType<typeof requireCourseItemAccess>
      >();
      const authorizeCourseItem: typeof requireCourseItemAccess = (access) => {
        const key = `${access.courseItemId}:${access.userId}`;
        const cached = grantedAccess.get(key);
        if (cached) return cached;
        const pending = runWithRequestCache(undefined, () =>
          requireCourseItemAccess(access),
        );
        grantedAccess.set(key, pending);
        pending.catch(() => grantedAccess.delete(key));
        return pending;
      };

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
              vocabulary = await recordVocabularyAttemptsForUser(
                ctx.db,
                ctx.actorUserId,
                await parseVocabularyAttempts({
                  gameKey: operation.gameKey,
                  sessionId: operation.sessionId,
                  timeZone: operation.timeZone,
                  attempts: operation.attempts.slice(index, index + 50),
                }),
                authorizeCourseItem,
              );
            }
            results.push({
              id: operation.id,
              kind: operation.kind,
              vocabulary,
            });
            continue;
          }

          // The attempt status is the durable receipt. If the client lost the
          // previous response, replay acknowledges the already-applied submit.
          const receipt = await ctx.db.assessmentAttempt.findFirst({
            where: { id: operation.attemptId, userId: ctx.actorUserId },
            select: { status: true, courseItemId: true },
          });
          if (!receipt) throw new TRPCError({ code: "NOT_FOUND" });
          if (receipt.status === "IN_PROGRESS") {
            if (operation.answers.length) {
              await assessment.saveAnswers({
                attemptId: operation.attemptId,
                answers: operation.answers,
              });
            }
            await assessment.submitAttempt({ attemptId: operation.attemptId });
          }
          // Read after this operation's writes with a fresh request cache, so
          // both reads share one access check without seeing earlier state.
          const reader = assessmentRouter.createCaller({
            ...ctx,
            requestCache: createRequestCache(),
          });
          const [current, assessmentDetail] = await Promise.all([
            reader.getMyAttempt({ attemptId: operation.attemptId }),
            reader.getForCourseItem({
              courseItemId: receipt.courseItemId,
              attemptId: operation.attemptId,
            }),
          ]);
          results.push({
            id: operation.id,
            kind: operation.kind,
            assessment: current,
            assessmentDetail,
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
        // A fresh request cache: reads made while applying the operations
        // must not leak pre-write state into the dashboard.
        dashboard:
          input.includeDashboard === false
            ? null
            : await getDashboard(
                { ...ctx, requestCache: createRequestCache() },
                input.organizationId
                  ? { organizationId: input.organizationId }
                  : undefined,
              ),
      };
    }),
});
