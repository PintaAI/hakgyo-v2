import type { ContentLocalStore } from "./store";
import type {
  AnySyncOperation,
  ContentDbScope,
  StorageEstimate,
} from "./types";

export type ContentSyncResult = {
  serverVersion?: { revision?: number; updatedAt?: string };
};

export type ContentMutationExecutor = (
  operation: AnySyncOperation,
) => Promise<ContentSyncResult | void>;

export type ContentSyncRejection = {
  operationId: string;
  mutation: AnySyncOperation["mutation"];
  draftKey?: string;
  /** Server message (Indonesian), meant to be shown to the author. */
  message: string;
};

export type ContentSyncSummary = {
  claimed: number;
  succeeded: number;
  failed: number;
  /** Operations blocked permanently because the server rejected them. */
  rejected: ContentSyncRejection[];
  storage: StorageEstimate;
};

export class ContentSyncConflictError extends Error {
  constructor(
    message = "The server content changed since this draft was created",
  ) {
    super(message);
    this.name = "ContentSyncConflictError";
  }
}

/**
 * Thrown by an executor (or detected from a tRPC error) when the server
 * rejects a change in a way retrying cannot fix.
 */
export class ContentSyncRejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContentSyncRejectedError";
  }
}

/** tRPC codes the publishing rules use for permanent rejections. */
const permanentRejectionCodes = new Set(["PRECONDITION_FAILED", "BAD_REQUEST"]);

function trpcErrorCode(error: unknown) {
  if (typeof error !== "object" || error === null) return undefined;
  const candidate = error as {
    data?: { code?: unknown } | null;
    shape?: { data?: { code?: unknown } } | null;
    code?: unknown;
  };
  const code = candidate.data?.code ?? candidate.shape?.data?.code;
  return typeof code === "string"
    ? code
    : typeof candidate.code === "string"
      ? candidate.code
      : undefined;
}

/**
 * Whether a failed mutation must not be retried: a live assessment
 * (PRECONDITION_FAILED "… sedang tayang …") or a readiness / validation
 * rejection (BAD_REQUEST). Network and server errors stay retryable.
 */
export function isPermanentContentSyncRejection(error: unknown) {
  if (error instanceof ContentSyncRejectedError) return true;
  const code = trpcErrorCode(error);
  return code !== undefined && permanentRejectionCodes.has(code);
}

function rejectionMessage(error: unknown) {
  return error instanceof Error && error.message
    ? error.message
    : "Perubahan ditolak oleh server.";
}

export async function processContentSyncQueue(
  store: ContentLocalStore,
  scope: ContentDbScope,
  execute: ContentMutationExecutor,
  options: {
    limit?: number;
    leaseMs?: number;
    maxAttempts?: number;
    retryDelayMs?: number;
  } = {},
): Promise<ContentSyncSummary> {
  const operations = await store.claimOperations(scope, options);
  let succeeded = 0;
  let failed = 0;
  const rejected: ContentSyncRejection[] = [];

  for (const operation of operations) {
    try {
      const result = await execute(operation);
      const completed = await store.completeOperation(
        operation.id,
        operation.leaseId,
      );
      if (!completed) continue;

      succeeded += 1;
      if (operation.draftKey) {
        const remaining = await store.database.syncOperations
          .where("draftKey")
          .equals(operation.draftKey)
          .count();
        if (remaining === 0) {
          await store.setDraftSyncStatus(
            operation.draftKey,
            "clean",
            result?.serverVersion,
          );
        }
      }
    } catch (error) {
      failed += 1;
      const conflict = error instanceof ContentSyncConflictError;
      const permanent = !conflict && isPermanentContentSyncRejection(error);
      if (conflict && operation.draftKey) {
        await store.setDraftSyncStatus(operation.draftKey, "conflict");
      }
      if (permanent) {
        if (operation.draftKey) {
          await store.setDraftSyncStatus(operation.draftKey, "rejected");
        }
        rejected.push({
          operationId: operation.id,
          mutation: operation.mutation,
          draftKey: operation.draftKey,
          message: rejectionMessage(error),
        });
      }
      // Conflicts and permanent rejections are blocked right away (with the
      // message kept in `lastError`) instead of retrying forever.
      await store.failOperation(operation.id, operation.leaseId, error, {
        retryDelayMs: options.retryDelayMs,
        maxAttempts: conflict || permanent ? 0 : options.maxAttempts,
      });
    }
  }

  return {
    claimed: operations.length,
    succeeded,
    failed,
    rejected,
    storage: await store.estimateStorage(),
  };
}
