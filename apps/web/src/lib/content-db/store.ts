import { HakgyoContentDatabase } from "./database";
import type {
  ContentDbScope,
  ContentDraft,
  ContentDraftPayloadMap,
  ContentEntityType,
  ContentMutationInputMap,
  ContentMutationName,
  DraftSyncStatus,
  PendingAsset,
  PendingAssetStatus,
  StorageEstimate,
  SyncOperation,
} from "./types";

const DEFAULT_LEASE_MS = 30_000;
const DEFAULT_MAX_ATTEMPTS = 8;
const MAX_ERROR_LENGTH = 2_000;

type CreateStoreOptions = {
  name?: string;
  indexedDB?: IDBFactory;
  IDBKeyRange?: typeof globalThis.IDBKeyRange;
};

type SaveDraftInput<T extends ContentEntityType> = ContentDbScope & {
  entityType: T;
  entityId: string;
  payload: ContentDraftPayloadMap[T];
  editorSchemaVersion: number;
  syncStatus?: DraftSyncStatus;
  baseRevision?: number;
  serverUpdatedAt?: string;
};

type EnqueueOperationInput<T extends ContentMutationName> = ContentDbScope & {
  mutation: T;
  input: ContentMutationInputMap[T];
  draftKey?: string;
  dedupeKey?: string;
  dependencyIds?: string[];
};

type AddPendingAssetInput = ContentDbScope & {
  draftKey: string;
  file: Blob;
  fileName: string;
  id?: string;
};

export class ContentDbUnavailableError extends Error {
  constructor(message = "IndexedDB is unavailable in this environment") {
    super(message);
    this.name = "ContentDbUnavailableError";
  }
}

export class ContentDbQuotaError extends Error {
  constructor(message = "Browser storage quota was exceeded") {
    super(message);
    this.name = "ContentDbQuotaError";
  }
}

export function createDraftKey(
  scope: ContentDbScope,
  entityType: ContentEntityType,
  entityId: string,
) {
  return JSON.stringify([
    scope.userId,
    scope.organizationId,
    entityType,
    entityId,
  ]);
}

export function createContentLocalStore(options: CreateStoreOptions = {}) {
  const indexedDB = options.indexedDB ?? globalThis.indexedDB;
  const IDBKeyRange = options.IDBKeyRange ?? globalThis.IDBKeyRange;
  if (!indexedDB || !IDBKeyRange) throw new ContentDbUnavailableError();

  const database = new HakgyoContentDatabase(options.name, {
    indexedDB,
    IDBKeyRange,
  });
  return new ContentLocalStore(database);
}

export class ContentLocalStore {
  constructor(readonly database: HakgyoContentDatabase) {}

  async saveDraft<T extends ContentEntityType>(input: SaveDraftInput<T>) {
    return this.withStorageErrors(async () => {
      const key = createDraftKey(input, input.entityType, input.entityId);
      const existing = await this.database.drafts.get(key);
      const now = Date.now();
      const draft: ContentDraft<T> = {
        key,
        userId: input.userId,
        organizationId: input.organizationId,
        entityType: input.entityType,
        entityId: input.entityId,
        payload: input.payload,
        editorSchemaVersion: input.editorSchemaVersion,
        syncStatus: input.syncStatus ?? "dirty",
        baseRevision: input.baseRevision ?? existing?.baseRevision,
        serverUpdatedAt: input.serverUpdatedAt ?? existing?.serverUpdatedAt,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        lastSyncedAt: existing?.lastSyncedAt,
      };
      await this.database.drafts.put(draft);
      return draft;
    });
  }

  async getDraft<T extends ContentEntityType>(
    scope: ContentDbScope,
    entityType: T,
    entityId: string,
  ) {
    const draft = await this.database.drafts.get(
      createDraftKey(scope, entityType, entityId),
    );
    return draft as ContentDraft<T> | undefined;
  }

  async listDrafts<T extends ContentEntityType>(
    scope: ContentDbScope,
    entityType?: T,
  ) {
    const collection = entityType
      ? this.database.drafts
          .where("[userId+organizationId+entityType]")
          .equals([scope.userId, scope.organizationId, entityType])
      : this.database.drafts
          .where("[userId+organizationId]")
          .equals([scope.userId, scope.organizationId]);
    const drafts = await collection.reverse().sortBy("updatedAt");
    return drafts as ContentDraft<T>[];
  }

  async setDraftSyncStatus(
    draftKey: string,
    syncStatus: DraftSyncStatus,
    serverVersion?: { revision?: number; updatedAt?: string },
  ) {
    const now = Date.now();
    await this.database.drafts.update(draftKey, {
      syncStatus,
      ...(serverVersion?.revision === undefined
        ? {}
        : { baseRevision: serverVersion.revision }),
      ...(serverVersion?.updatedAt === undefined
        ? {}
        : { serverUpdatedAt: serverVersion.updatedAt }),
      ...(syncStatus === "clean" ? { lastSyncedAt: now } : {}),
      updatedAt: now,
    });
  }

  async deleteDraft(draftKey: string) {
    await this.withStorageErrors(() =>
      this.database.transaction(
        "rw",
        [
          this.database.drafts,
          this.database.syncOperations,
          this.database.pendingAssets,
        ],
        async () => {
          await Promise.all([
            this.database.drafts.delete(draftKey),
            this.database.syncOperations
              .where("draftKey")
              .equals(draftKey)
              .delete(),
            this.database.pendingAssets
              .where("draftKey")
              .equals(draftKey)
              .delete(),
          ]);
        },
      ),
    );
  }

  async enqueueOperation<T extends ContentMutationName>(
    input: EnqueueOperationInput<T>,
  ) {
    return this.withStorageErrors(() =>
      this.database.transaction(
        "rw",
        this.database.syncOperations,
        async () => {
          const existing = input.dedupeKey
            ? await this.database.syncOperations
                .where("[userId+organizationId+dedupeKey]")
                .equals([input.userId, input.organizationId, input.dedupeKey])
                .filter((operation) => operation.status !== "processing")
                .first()
            : undefined;
          const now = Date.now();
          const operation: SyncOperation<T> = {
            id: existing?.id ?? createId(),
            userId: input.userId,
            organizationId: input.organizationId,
            draftKey: input.draftKey,
            mutation: input.mutation,
            input: input.input,
            dedupeKey: input.dedupeKey,
            dependencyIds: input.dependencyIds ?? [],
            status: "queued",
            attemptCount: existing?.attemptCount ?? 0,
            nextAttemptAt: now,
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
          };
          await this.database.syncOperations.put(operation);
          return operation;
        },
      ),
    );
  }

  async saveDraftAndEnqueue<
    TEntity extends ContentEntityType,
    TMutation extends ContentMutationName,
  >(
    draft: SaveDraftInput<TEntity>,
    operation: EnqueueOperationInput<TMutation>,
  ) {
    return this.withStorageErrors(() =>
      this.database.transaction(
        "rw",
        [this.database.drafts, this.database.syncOperations],
        async () => {
          const savedDraft = await this.saveDraft(draft);
          const queuedOperation = await this.enqueueOperation({
            ...operation,
            draftKey: operation.draftKey ?? savedDraft.key,
          });
          return { draft: savedDraft, operation: queuedOperation };
        },
      ),
    );
  }

  async claimOperations(
    scope: ContentDbScope,
    options: { limit?: number; leaseMs?: number; now?: number } = {},
  ) {
    const limit = Math.max(1, options.limit ?? 20);
    const leaseMs = Math.max(1_000, options.leaseMs ?? DEFAULT_LEASE_MS);
    const now = options.now ?? Date.now();
    const leaseId = createId();

    return this.database.transaction(
      "rw",
      this.database.syncOperations,
      async () => {
        const operations = await this.database.syncOperations
          .where("[userId+organizationId]")
          .equals([scope.userId, scope.organizationId])
          .toArray();
        const existingIds = new Set(
          operations.map((operation) => operation.id),
        );
        const eligible = operations.map((operation) => {
          const leaseExpired =
            operation.status === "processing" &&
            (operation.leaseExpiresAt ?? 0) <= now;
          return leaseExpired
            ? {
                ...operation,
                status: "queued" as const,
                leaseId: undefined,
                leaseExpiresAt: undefined,
                updatedAt: now,
              }
            : operation;
        });

        await Promise.all(
          eligible
            .filter((operation, index) => operation !== operations[index])
            .map((operation) => this.database.syncOperations.put(operation)),
        );

        const ready = eligible
          .filter(
            (operation) =>
              operation.status === "queued" &&
              operation.nextAttemptAt <= now &&
              operation.dependencyIds.every(
                (dependencyId) => !existingIds.has(dependencyId),
              ),
          )
          .sort((a, b) => a.createdAt - b.createdAt);
        const claimed = ready.slice(0, limit);

        await Promise.all(
          claimed.map((operation) =>
            this.database.syncOperations.update(operation.id, {
              status: "processing",
              leaseId,
              leaseExpiresAt: now + leaseMs,
              attemptCount: operation.attemptCount + 1,
              updatedAt: now,
            }),
          ),
        );

        return claimed.map((operation) => ({
          ...operation,
          status: "processing" as const,
          leaseId,
          leaseExpiresAt: now + leaseMs,
          attemptCount: operation.attemptCount + 1,
          updatedAt: now,
        }));
      },
    );
  }

  async completeOperation(operationId: string, leaseId: string) {
    return this.database.transaction(
      "rw",
      this.database.syncOperations,
      async () => {
        const operation = await this.database.syncOperations.get(operationId);
        if (operation?.leaseId !== leaseId) return false;
        await this.database.syncOperations.delete(operationId);
        return true;
      },
    );
  }

  async failOperation(
    operationId: string,
    leaseId: string,
    error: unknown,
    options: { retryDelayMs?: number; maxAttempts?: number } = {},
  ) {
    return this.database.transaction(
      "rw",
      this.database.syncOperations,
      async () => {
        const operation = await this.database.syncOperations.get(operationId);
        if (operation?.leaseId !== leaseId) return false;
        const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
        const retryDelayMs =
          options.retryDelayMs ?? getRetryDelay(operation.attemptCount);
        await this.database.syncOperations.update(operationId, {
          status: operation.attemptCount >= maxAttempts ? "blocked" : "queued",
          nextAttemptAt: Date.now() + retryDelayMs,
          leaseId: undefined,
          leaseExpiresAt: undefined,
          lastError: getErrorMessage(error),
          updatedAt: Date.now(),
        });
        return true;
      },
    );
  }

  async unblockOperation(operationId: string) {
    await this.database.syncOperations.update(operationId, {
      status: "queued",
      attemptCount: 0,
      nextAttemptAt: Date.now(),
      lastError: undefined,
      updatedAt: Date.now(),
    });
  }

  async replaceQueuedOperationInput<T extends ContentMutationName>(
    operationId: string,
    mutation: T,
    input: ContentMutationInputMap[T],
  ) {
    return this.database.transaction(
      "rw",
      this.database.syncOperations,
      async () => {
        const operation = await this.database.syncOperations.get(operationId);
        if (!operation || operation.status === "processing") return false;
        if (operation.mutation !== mutation) {
          throw new Error(
            `Cannot replace ${operation.mutation} input with ${mutation} input`,
          );
        }
        await this.database.syncOperations.update(operationId, {
          input,
          updatedAt: Date.now(),
        });
        return true;
      },
    );
  }

  async listOperations(scope: ContentDbScope) {
    return this.database.syncOperations
      .where("[userId+organizationId]")
      .equals([scope.userId, scope.organizationId])
      .sortBy("createdAt");
  }

  async addPendingAsset(input: AddPendingAssetInput) {
    return this.withStorageErrors(async () => {
      const now = Date.now();
      const asset: PendingAsset = {
        id: input.id ?? createId(),
        userId: input.userId,
        organizationId: input.organizationId,
        draftKey: input.draftKey,
        file: input.file,
        fileName: input.fileName,
        contentType: input.file.type || "application/octet-stream",
        size: input.file.size,
        status: "pending",
        attemptCount: 0,
        createdAt: now,
        updatedAt: now,
      };
      await this.database.pendingAssets.add(asset);
      return asset;
    });
  }

  async listPendingAssets(scope: ContentDbScope) {
    return this.database.pendingAssets
      .where("[userId+organizationId]")
      .equals([scope.userId, scope.organizationId])
      .sortBy("createdAt");
  }

  async updatePendingAsset(
    id: string,
    update: {
      status?: PendingAssetStatus;
      assetId?: string;
      lastError?: string;
      incrementAttempt?: boolean;
    },
  ) {
    const asset = await this.database.pendingAssets.get(id);
    if (!asset) return false;
    await this.database.pendingAssets.update(id, {
      status: update.status ?? asset.status,
      assetId: update.assetId ?? asset.assetId,
      lastError: update.lastError?.slice(0, MAX_ERROR_LENGTH),
      attemptCount: asset.attemptCount + (update.incrementAttempt ? 1 : 0),
      updatedAt: Date.now(),
    });
    return true;
  }

  async deletePendingAsset(id: string) {
    await this.database.pendingAssets.delete(id);
  }

  async clearScope(scope: ContentDbScope) {
    await this.database.transaction(
      "rw",
      [
        this.database.drafts,
        this.database.syncOperations,
        this.database.pendingAssets,
      ],
      async () => {
        await Promise.all([
          this.database.drafts
            .where("[userId+organizationId]")
            .equals([scope.userId, scope.organizationId])
            .delete(),
          this.database.syncOperations
            .where("[userId+organizationId]")
            .equals([scope.userId, scope.organizationId])
            .delete(),
          this.database.pendingAssets
            .where("[userId+organizationId]")
            .equals([scope.userId, scope.organizationId])
            .delete(),
        ]);
      },
    );
  }

  async clearUser(userId: string) {
    await this.database.transaction(
      "rw",
      [
        this.database.drafts,
        this.database.syncOperations,
        this.database.pendingAssets,
      ],
      async () => {
        await Promise.all([
          this.database.drafts.where("userId").equals(userId).delete(),
          this.database.syncOperations.where("userId").equals(userId).delete(),
          this.database.pendingAssets.where("userId").equals(userId).delete(),
        ]);
      },
    );
  }

  async pruneCleanDrafts(olderThan: number) {
    return this.database.drafts
      .where("updatedAt")
      .below(olderThan)
      .filter((draft) => draft.syncStatus === "clean")
      .delete();
  }

  async estimateStorage(): Promise<StorageEstimate> {
    const estimate = await globalThis.navigator?.storage?.estimate?.();
    if (!estimate) return {};
    return {
      usage: estimate.usage,
      quota: estimate.quota,
      usageRatio:
        estimate.usage !== undefined && estimate.quota
          ? estimate.usage / estimate.quota
          : undefined,
    };
  }

  async requestPersistentStorage() {
    return globalThis.navigator?.storage?.persist?.();
  }

  close() {
    this.database.close();
  }

  private async withStorageErrors<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (
        error instanceof DOMException &&
        (error.name === "QuotaExceededError" ||
          error.name === "NS_ERROR_DOM_QUOTA_REACHED")
      ) {
        throw new ContentDbQuotaError();
      }
      throw error;
    }
  }
}

function createId() {
  return globalThis.crypto.randomUUID();
}

function getRetryDelay(attemptCount: number) {
  const exponentialDelay = 1_000 * 2 ** Math.max(0, attemptCount - 1);
  return Math.min(exponentialDelay, 5 * 60_000);
}

function getErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, MAX_ERROR_LENGTH);
}
