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

export type ContentSyncSummary = {
  claimed: number;
  succeeded: number;
  failed: number;
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
      if (error instanceof ContentSyncConflictError && operation.draftKey) {
        await store.setDraftSyncStatus(operation.draftKey, "conflict");
      }
      await store.failOperation(operation.id, operation.leaseId, error, {
        retryDelayMs: options.retryDelayMs,
        maxAttempts:
          error instanceof ContentSyncConflictError ? 0 : options.maxAttempts,
      });
    }
  }

  return {
    claimed: operations.length,
    succeeded,
    failed,
    storage: await store.estimateStorage(),
  };
}
