import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { assessmentRouter } from "~/server/api/routers/assessment";
import { assessmentEventRouter } from "~/server/api/routers/assessment-event";
import {
  learningRouter,
  recordVocabularyAttemptsForUser,
  recordVocabularyAttemptsInput,
} from "~/server/api/routers/learning";
import type { TRPCContext } from "~/server/api/trpc";
import { requireCourseItemAccess } from "~/server/authorization";
import {
  createRequestCache,
  runWithRequestCache,
} from "~/server/request-cache";

/**
 * Applies a batch of offline sync operations for `mobileSyncV2.commit`, which
 * returns a patch next to the per-operation results.
 */

export type LearnerContext = TRPCContext & { actorUserId: string };

// Same validation (and BAD_REQUEST error) as calling the procedure.
async function parseVocabularyAttempts(input: unknown) {
  try {
    return await recordVocabularyAttemptsInput.parseAsync(input);
  } catch (cause) {
    throw new TRPCError({ code: "BAD_REQUEST", cause });
  }
}

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

export const syncOperation = z.discriminatedUnion("kind", [
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

export type SyncOperation = z.infer<typeof syncOperation>;
export type SyncOperationKind = SyncOperation["kind"];

// Only the fields needed to report a per-operation failure. Typed as the full
// operation so the client contract (RouterInputs) is unchanged.
const syncOperationEnvelope = z.looseObject({
  id: z.string().min(1).max(240),
  kind: z.enum([
    "CONTENT_COMPLETED",
    "VOCABULARY_SESSION_COMPLETED",
    "ASSESSMENT_COMPLETED",
  ] satisfies SyncOperationKind[]),
});

/**
 * Each operation is validated on its own inside `applySyncOperations`, so one
 * malformed operation fails alone instead of rejecting (and blocking) the
 * whole batch.
 */
export const looseSyncOperation = z.custom<z.input<typeof syncOperation>>(
  (value) => syncOperationEnvelope.safeParse(value).success,
  { message: "Sync operation needs a valid id and kind" },
);

/** Up to this many operations per commit. */
export const MAX_OPERATIONS_PER_COMMIT = 500;

// Failures that retrying cannot fix. The client may eventually dead-letter
// these; any other failure (a server or database error) is transient.
export const TERMINAL_FAILURE_CODES = new Set<string>([
  "BAD_REQUEST",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "PRECONDITION_FAILED",
]);

function hasTRPCCode(cause: unknown, ...codes: TRPCError["code"][]) {
  return cause instanceof TRPCError && codes.includes(cause.code);
}

/**
 * True when every answer of an offline assessment operation is already stored
 * on the attempt, e.g. saved by an earlier (timed out) copy of the same
 * commit. Blank answers (no options, no content) count as stored: grading
 * treats them like unanswered questions.
 */
export async function storedAnswersMatch(
  ctx: Pick<TRPCContext, "db">,
  attemptId: string,
  answers: Array<z.infer<typeof answer>>,
) {
  if (!answers.length) return true;
  const stored = await ctx.db.assessmentAnswer.findMany({
    where: {
      attemptId,
      questionId: { in: answers.map((entry) => entry.questionId) },
    },
    select: {
      questionId: true,
      content: true,
      selectedOptions: { select: { optionId: true } },
    },
  });
  const storedByQuestionId = new Map(
    stored.map((entry) => [entry.questionId, entry]),
  );
  return answers.every((entry) => {
    const saved = storedByQuestionId.get(entry.questionId);
    if (!saved) {
      return !entry.optionIds.length && !entry.content;
    }
    // Omitted content keeps the stored content when saving, so only compare
    // content the operation actually carries. Grading stores a blank written
    // answer as null content.
    if (
      entry.content !== undefined &&
      saved.content !== entry.content &&
      !(entry.content === "" && saved.content === null)
    ) {
      return false;
    }
    const savedOptionIds = new Set(
      saved.selectedOptions.map((selection) => selection.optionId),
    );
    const optionIds = new Set(entry.optionIds);
    return (
      savedOptionIds.size === optionIds.size &&
      [...optionIds].every((optionId) => savedOptionIds.has(optionId))
    );
  });
}

// Stop starting new operations after this long so a large commit returns
// well within client and platform request timeouts.
export const COMMIT_TIME_BUDGET_MS = 8_000;

type AssessmentCaller = ReturnType<typeof assessmentRouter.createCaller>;
type LearningCaller = ReturnType<typeof learningRouter.createCaller>;

export type SyncOperationResult = {
  id: string;
  kind: SyncOperationKind;
  assessment?: Awaited<ReturnType<AssessmentCaller["getMyAttempt"]>>;
  assessmentDetail?: Awaited<ReturnType<AssessmentCaller["getForCourseItem"]>>;
  vocabulary?: Awaited<ReturnType<LearningCaller["recordVocabularyAttempts"]>>;
};

export type SyncOperationFailure = {
  id: string;
  kind: SyncOperationKind;
  code: string;
  message: string;
};

export type ApplySyncOperationsResult = {
  acknowledgedOperationIds: string[];
  failures: SyncOperationFailure[];
  results: SyncOperationResult[];
  /** True when unprocessed operations remain; the client re-sends them. */
  budgetExhausted: boolean;
  /**
   * Course items whose learner state this batch may have changed (completed
   * content, practiced vocabulary placements, submitted assessments).
   */
  affectedCourseItemIds: string[];
};

export async function applySyncOperations(
  ctx: LearnerContext,
  input: { operations: Array<z.input<typeof syncOperation>> },
): Promise<ApplySyncOperationsResult> {
  const startedAt = Date.now();
  const learning = learningRouter.createCaller(ctx);
  const assessment = assessmentRouter.createCaller(ctx);
  const results: SyncOperationResult[] = [];
  const failures: SyncOperationFailure[] = [];
  const affectedCourseItemIds = new Set<string>();
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

  let budgetExhausted = false;
  for (const rawOperation of input.operations) {
    // Stop starting new operations near the request budget. Unprocessed
    // operations are neither acknowledged nor failed, so the client keeps
    // them queued and sends them again.
    if (Date.now() - startedAt >= COMMIT_TIME_BUDGET_MS) {
      budgetExhausted = true;
      break;
    }
    const parsed = syncOperation.safeParse(rawOperation);
    if (!parsed.success) {
      failures.push({
        id: rawOperation.id,
        kind: rawOperation.kind,
        code: "BAD_REQUEST",
        message: z.prettifyError(parsed.error),
      });
      continue;
    }
    const operation = parsed.data;
    try {
      if (operation.kind === "CONTENT_COMPLETED") {
        await learning.markContentProgress({
          courseItemId: operation.courseItemId,
          status: "COMPLETED",
        });
        affectedCourseItemIds.add(operation.courseItemId);
        results.push({ id: operation.id, kind: operation.kind });
        continue;
      }

      if (operation.kind === "VOCABULARY_SESSION_COMPLETED") {
        let vocabulary: SyncOperationResult["vocabulary"];
        for (let index = 0; index < operation.attempts.length; index += 50) {
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
        for (const attempt of operation.attempts) {
          affectedCourseItemIds.add(attempt.sourceCourseItemId);
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
      // Writes below may land even when the operation ultimately fails, so
      // the item counts as affected from here on.
      affectedCourseItemIds.add(receipt.courseItemId);
      // The mobile client sends all answers only with this operation, so
      // it may only be acknowledged once they are stored. Otherwise (e.g.
      // the deadline passed or the event closed and auto-submitted
      // without them) fail it, so the client keeps the answers.
      const requireStoredAnswers = async (cause?: unknown) => {
        if (
          !(await storedAnswersMatch(
            ctx,
            operation.attemptId,
            operation.answers,
          ))
        ) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "The assessment is no longer accepting these offline answers",
            cause,
          });
        }
      };
      // Acknowledge a save/submit rejected because the attempt is no
      // longer open: a replayed commit (the client timed out and retried)
      // raced the first one, or the event closed.
      const acknowledgeIfSettled = async (cause: unknown) => {
        const current = await ctx.db.assessmentAttempt.findFirst({
          where: { id: operation.attemptId, userId: ctx.actorUserId },
          select: {
            status: true,
            assessmentEvent: { select: { status: true } },
          },
        });
        const settled =
          !!current &&
          (current.status !== "IN_PROGRESS" ||
            current.assessmentEvent?.status === "CLOSED" ||
            current.assessmentEvent?.status === "CANCELLED");
        if (!settled) throw cause;
        await requireStoredAnswers(cause);
      };
      if (receipt.status !== "IN_PROGRESS") {
        await requireStoredAnswers();
      } else {
        let open = true;
        if (operation.answers.length) {
          try {
            await assessment.saveAnswers({
              attemptId: operation.attemptId,
              answers: operation.answers,
            });
          } catch (cause) {
            if (!hasTRPCCode(cause, "CONFLICT", "PRECONDITION_FAILED")) {
              throw cause;
            }
            if (hasTRPCCode(cause, "CONFLICT")) {
              // No longer IN_PROGRESS: nothing left to submit.
              await acknowledgeIfSettled(cause);
              open = false;
            } else {
              // Time limit expired or event closed. An earlier copy of
              // this commit may have stored the answers already; then,
              // like the web client, still submit so they get graded.
              await requireStoredAnswers(cause);
            }
          }
        }
        if (open) {
          try {
            await assessment.submitAttempt({
              attemptId: operation.attemptId,
            });
          } catch (cause) {
            if (!hasTRPCCode(cause, "CONFLICT", "PRECONDITION_FAILED")) {
              throw cause;
            }
            await acknowledgeIfSettled(cause);
          }
        }
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
      const code =
        cause instanceof TRPCError ? cause.code : "INTERNAL_SERVER_ERROR";
      failures.push({
        id: operation.id,
        kind: operation.kind,
        code,
        message:
          cause instanceof Error ? cause.message : "Sync operation failed",
      });
      // Later operations may depend on this one (e.g. completed content
      // unlocking a module), so leave them unprocessed, like when the time
      // budget runs out; the client retries them after this one.
      if (!TERMINAL_FAILURE_CODES.has(code)) break;
    }
  }

  return {
    acknowledgedOperationIds: results.map((result) => result.id),
    failures,
    results,
    budgetExhausted,
    affectedCourseItemIds: [...affectedCourseItemIds],
  };
}

// ---------------------------------------------------------------------------
// Mutations exposed by the v2 router.
// ---------------------------------------------------------------------------

export const startAssessmentInput = z.object({
  courseItemId: z.string().min(1),
  cohortId: z.string().min(1).optional(),
});

export async function startAssessmentForLearner(
  ctx: LearnerContext,
  input: z.infer<typeof startAssessmentInput>,
) {
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
}

export const startEventAssessmentInput = z.object({
  eventId: z.string().min(1),
});

export async function startEventAssessmentForLearner(
  ctx: LearnerContext,
  input: z.infer<typeof startEventAssessmentInput>,
) {
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
}

export const markSidebarSeenInput = z.object({
  organizationId: z.string().min(1),
  keys: z.array(z.string().min(1).max(240)).min(1).max(100),
});

export async function markSidebarSeenForLearner(
  ctx: LearnerContext,
  input: z.infer<typeof markSidebarSeenInput>,
) {
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
}
