import {
  BUNDLE_SCHEMA,
  INDEX_SCHEMA,
  MIN_SYNC_PROTOCOL,
  SYNC_PROTOCOL,
  type SyncCommitPatch,
  type SyncIndexResult,
  type SyncManifest,
} from "@hakgyo/shared/mobile-sync";
import { z } from "zod";

import { assessmentRouter } from "~/server/api/routers/assessment";
import { gamificationRouter } from "~/server/api/routers/gamification";
import { createTRPCRouter } from "~/server/api/trpc";
import {
  applySyncOperations,
  looseSyncOperation,
  markSidebarSeenForLearner,
  markSidebarSeenInput,
  MAX_OPERATIONS_PER_COMMIT,
  startAssessmentForLearner,
  startAssessmentInput,
  startEventAssessmentForLearner,
  startEventAssessmentInput,
} from "~/server/mobile/apply-operations";
import {
  buildLearnerIndex,
  getIndexToken,
  requireOrganizationAccess,
  type LearnerIndex,
} from "~/server/mobile/learner-index";
import { buildLearnerState } from "~/server/mobile/learner-state";
import { mobileProtocolProcedure } from "~/server/mobile/protocol";
import { createRequestCache } from "~/server/request-cache";

/** Server-suggested poll interval for `getManifest`. */
export const MANIFEST_CHECK_AFTER_MS = 15 * 60 * 1000;

const protocol = z.number().int();
const organizationId = z.string().min(1).optional();

type GamificationSummary = Awaited<
  ReturnType<ReturnType<typeof gamificationRouter.createCaller>["getMySummary"]>
>;
type MyAttempts = Awaited<
  ReturnType<ReturnType<typeof assessmentRouter.createCaller>["listMyAttempts"]>
>;
export type MobileSyncCommitPatch = SyncCommitPatch<
  GamificationSummary,
  MyAttempts
>;

async function buildCommitPatch(
  ctx: Parameters<typeof applySyncOperations>[0],
  affectedCourseItemIds: string[],
  scope: { organizationId: string } | undefined,
): Promise<MobileSyncCommitPatch> {
  const patchCtx = { ...ctx, requestCache: createRequestCache() };
  const affectedCourses = affectedCourseItemIds.length
    ? await ctx.db.courseItem.findMany({
        where: { id: { in: affectedCourseItemIds } },
        select: { module: { select: { courseId: true } } },
      })
    : [];
  const [learner, gamification, attempts] = await Promise.all([
    buildLearnerState(
      ctx.db,
      ctx.actorUserId,
      affectedCourses.map((item) => item.module.courseId),
    ),
    gamificationRouter.createCaller(patchCtx).getMySummary(),
    assessmentRouter.createCaller(patchCtx).listMyAttempts(scope),
  ]);
  return { learner, gamification, attempts };
}

/**
 * Mobile offline sync, protocol 2. Shared course content is served by the
 * bundle route (`/api/mobile/v2/courses/[courseId]/bundle`); this router
 * covers the per-user manifest, index, commit and the learner mutations.
 */
export const mobileSyncV2Router = createTRPCRouter({
  getManifest: mobileProtocolProcedure
    .input(z.object({ protocol, organizationId }))
    .query(async ({ ctx, input }): Promise<SyncManifest> => {
      await requireOrganizationAccess(
        ctx.db,
        ctx.actorUserId,
        input.organizationId,
      );
      const { indexToken, courses } = await getIndexToken(ctx, input);
      return {
        protocol: SYNC_PROTOCOL,
        minProtocol: MIN_SYNC_PROTOCOL,
        bundleSchema: BUNDLE_SCHEMA,
        indexSchema: INDEX_SCHEMA,
        indexToken,
        courses: courses.map((course) => ({
          courseId: course.courseId,
          organizationId: course.organizationId,
          revision: course.revisions.bundle,
        })),
        checkAfterMs: MANIFEST_CHECK_AFTER_MS,
      };
    }),

  getIndex: mobileProtocolProcedure
    .input(
      z.object({
        protocol,
        organizationId,
        knownIndexToken: z.string().min(1).optional(),
      }),
    )
    .query(async ({ ctx, input }): Promise<SyncIndexResult<LearnerIndex>> => {
      await requireOrganizationAccess(
        ctx.db,
        ctx.actorUserId,
        input.organizationId,
      );
      if (input.knownIndexToken) {
        const { indexToken } = await getIndexToken(ctx, input);
        if (indexToken === input.knownIndexToken) {
          return { status: "unchanged", indexToken };
        }
      }
      return { status: "ok", index: await buildLearnerIndex(ctx, input) };
    }),

  commit: mobileProtocolProcedure
    .input(
      z.object({
        protocol,
        organizationId,
        // Each operation is validated on its own, so one malformed operation
        // fails alone instead of rejecting (and blocking) the batch.
        operations: z.array(looseSyncOperation).max(MAX_OPERATIONS_PER_COMMIT),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const {
        acknowledgedOperationIds,
        failures,
        results,
        budgetExhausted,
        affectedCourseItemIds,
      } = await applySyncOperations(ctx, input);
      const scope = input.organizationId
        ? { organizationId: input.organizationId }
        : undefined;
      // Skipped once the time budget ran out: the client re-sends the
      // unprocessed operations and gets the patch with the final batch.
      // Reads run in a fresh request cache so nothing loaded while applying
      // the operations leaks pre-write state into the patch.
      const patch: MobileSyncCommitPatch | null = budgetExhausted
        ? null
        : await buildCommitPatch(ctx, affectedCourseItemIds, scope);
      return {
        acknowledgedOperationIds,
        failures,
        results,
        budgetExhausted,
        patch,
      };
    }),

  startAssessment: mobileProtocolProcedure
    .input(startAssessmentInput.extend({ protocol }))
    .mutation(({ ctx, input }) => startAssessmentForLearner(ctx, input)),

  startEventAssessment: mobileProtocolProcedure
    .input(startEventAssessmentInput.extend({ protocol }))
    .mutation(({ ctx, input }) => startEventAssessmentForLearner(ctx, input)),

  markSidebarSeen: mobileProtocolProcedure
    .input(markSidebarSeenInput.extend({ protocol }))
    .mutation(({ ctx, input }) => markSidebarSeenForLearner(ctx, input)),
});
