import { attemptLogEntrySchema } from "@hakgyo/shared";
import {
  OPERATION_VERSION,
  upcastOperation,
  type UpcastOperationResult,
} from "@hakgyo/shared/mobile-sync";
import { z } from "zod";

/**
 * Wire schemas of the offline sync operations replayed by
 * `mobileSyncV2.commit`. Kept free of routers and env so the frozen fixture
 * tests (`__fixtures__/sync-operations`) run with plain `bun test`.
 *
 * Operations queued by older app JavaScript replay against this schema, so
 * never change an existing field incompatibly without bumping
 * `OPERATION_VERSION` and adding an upcaster (see `docs/mobile-sync.md`).
 */

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

export type SyncOperationAnswer = z.infer<typeof answer>;

// Fields every operation kind carries. `v` is the operation version; absent
// means 1 (every client built before versioning).
const operationBase = z.object({
  id: z.string().min(1).max(240),
  v: z.number().int().positive().optional(),
});

export const syncOperation = z.discriminatedUnion("kind", [
  operationBase.extend({
    kind: z.literal("CONTENT_COMPLETED"),
    courseItemId: z.string().min(1),
  }),
  operationBase.extend({
    kind: z.literal("VOCABULARY_SESSION_COMPLETED"),
    gameKey: z.string().trim().min(1).max(100),
    sessionId: z.string().trim().min(1).max(200),
    timeZone: z.string().trim().min(1).max(100).optional(),
    attempts: z.array(vocabularyAttempt).min(1).max(500),
  }),
  operationBase.extend({
    kind: z.literal("ASSESSMENT_COMPLETED"),
    attemptId: z.string().min(1),
    answers: z.array(answer).max(200),
    /**
     * The attempt's progress log (answers, shown questions, the submission), added in runtime
     * version 1. Older clients send only `answers`.
     */
    entries: z.array(attemptLogEntrySchema).max(1000).optional(),
  }),
  operationBase.extend({
    // Progress of an attempt still being taken, queued as the learner answers so the server has
    // the answers before the event closes. One per attempt (`assessment-progress:<attemptId>`).
    kind: z.literal("ASSESSMENT_PROGRESS"),
    attemptId: z.string().min(1),
    entries: z.array(attemptLogEntrySchema).min(1).max(1000),
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
    "ASSESSMENT_PROGRESS",
  ] satisfies SyncOperationKind[]),
});

/**
 * Each operation is validated on its own inside `applySyncOperations`, so one
 * malformed operation fails alone instead of rejecting (and blocking) the
 * whole batch. Any `v` passes here, so operations from a newer client fail
 * individually (and transiently) instead of rejecting the batch.
 */
export const looseSyncOperation = z.custom<z.input<typeof syncOperation>>(
  (value) => syncOperationEnvelope.safeParse(value).success,
  { message: "Sync operation needs a valid id and kind" },
);

/**
 * Failure code of an operation written by a client newer than this server
 * (for example after a server rollback). Transient: the client keeps it
 * queued and retries until a server that understands it is deployed.
 */
export const UNSUPPORTED_OPERATION_VERSION = "UNSUPPORTED_OPERATION_VERSION";

export type ParseSyncOperationResult =
  | { ok: true; operation: SyncOperation }
  | { ok: false; code: string; message: string };

/**
 * Upcasts a raw operation to `OPERATION_VERSION` and validates it. Malformed
 * operations fail with BAD_REQUEST; too-new ones with the transient
 * UNSUPPORTED_OPERATION_VERSION.
 */
export function parseSyncOperation(raw: unknown): ParseSyncOperationResult {
  let upcasted: UpcastOperationResult;
  try {
    upcasted = upcastOperation(raw);
  } catch (cause) {
    // A gap in the upcaster registry is a server bug: retry after a fix.
    return {
      ok: false,
      code: "INTERNAL_SERVER_ERROR",
      message:
        cause instanceof Error ? cause.message : "Sync operation upcast failed",
    };
  }
  if (upcasted.status === "too-new") {
    return {
      ok: false,
      code: UNSUPPORTED_OPERATION_VERSION,
      message: `Sync operation version ${upcasted.version} is newer than this server supports (${OPERATION_VERSION})`,
    };
  }
  if (upcasted.status === "invalid") {
    return { ok: false, code: "BAD_REQUEST", message: upcasted.message };
  }
  const parsed = syncOperation.safeParse(upcasted.operation);
  if (!parsed.success) {
    return {
      ok: false,
      code: "BAD_REQUEST",
      message: z.prettifyError(parsed.error),
    };
  }
  return { ok: true, operation: parsed.data };
}
