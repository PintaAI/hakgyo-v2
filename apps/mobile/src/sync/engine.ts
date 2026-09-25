import {
  dehydrate,
  hydrate,
  type DehydratedState,
  type QueryCacheNotifyEvent,
  type QueryClient,
} from "@tanstack/react-query";
import SuperJSON from "superjson";

import type { MobileSyncStore } from "./store";
import type {
  MobileDashboard,
  MobileSyncCommitResult,
  MobileSyncOperation,
  MobileSyncTransport,
  SyncCheckpointResult,
  VocabularySyncAttempt,
} from "./types";

const QUERY_CACHE_VERSION = 2;
const MAX_DASHBOARD_AGE_MS = 24 * 60 * 60 * 1000;

type PersistedQueryCache = {
  version: typeof QUERY_CACHE_VERSION;
  state: DehydratedState;
};

type EngineOptions = {
  userId: string;
  queryClient: QueryClient;
  store: MobileSyncStore;
  transport: MobileSyncTransport;
  isOnline: () => Promise<boolean>;
  applyDashboard: (dashboard: MobileDashboard) => void;
  getCachedDashboard?: (organizationId?: string) => MobileDashboard | undefined;
  onPendingCountChange?: (count: number) => void;
};

export type RecordVocabularyAttemptInput = {
  gameKey: string;
  sessionId: string;
  timeZone?: string;
  attempt: VocabularySyncAttempt;
};

export function createMobileSyncEngine({
  userId,
  queryClient,
  store,
  transport,
  isOnline,
  applyDashboard,
  getCachedDashboard,
  onPendingCountChange,
}: EngineOptions) {
  let disposed = false;
  let persistTimer: ReturnType<typeof setTimeout> | undefined;
  let writeTail: Promise<unknown> = Promise.resolve();
  let writeVersion = 0;
  let checkpointTail: Promise<unknown> = Promise.resolve();
  let pendingCount = 0;
  let hasPublishedPendingCount = false;
  const activeCheckpoints = new Map<
    string,
    { version: number; promise: Promise<SyncCheckpointResult> }
  >();
  let unsubscribe: (() => void) | undefined;

  function serialized<T>(work: () => Promise<T>) {
    const result = writeTail.then(work, work);
    writeTail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  function publishPendingCount(nextCount: number) {
    if (hasPublishedPendingCount && pendingCount === nextCount) return;
    pendingCount = nextCount;
    hasPublishedPendingCount = true;
    onPendingCountChange?.(nextCount);
  }

  async function updatePendingCount() {
    publishPendingCount(await store.countOperations(userId));
  }

  function serializeCache() {
    const state = dehydrate(queryClient, {
      shouldDehydrateQuery: (query) => query.state.status === "success",
    });
    return SuperJSON.stringify({
      version: QUERY_CACHE_VERSION,
      state,
    } satisfies PersistedQueryCache);
  }

  async function persistCache(payload = serializeCache()) {
    await store.saveCache(userId, payload);
  }

  function schedulePersist(event?: QueryCacheNotifyEvent) {
    if (disposed) return;
    if (
      event &&
      event.type !== "removed" &&
      !(
        event.type === "updated" &&
        (event.action.type === "success" || event.action.type === "setState")
      )
    ) {
      return;
    }
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      persistTimer = undefined;
      void serialized(persistCache);
    }, 250);
  }

  async function initialize() {
    await store.initialize();
    queryClient.clear();
    const cached = await store.loadCache(userId);
    if (cached) {
      try {
        const parsed = SuperJSON.parse<PersistedQueryCache>(cached);
        if (parsed.version === QUERY_CACHE_VERSION) {
          hydrate(queryClient, parsed.state);
        }
      } catch {
        // A cache written by an older client is disposable; the outbox is not.
      }
    }
    unsubscribe = queryClient.getQueryCache().subscribe(schedulePersist);
    await updatePendingCount();
  }

  async function putOperation(operation: MobileSyncOperation) {
    await serialized(async () => {
      await store.putOperation(userId, operation);
      writeVersion += 1;
      await updatePendingCount();
    });
  }

  async function recordVocabularyAttempt(input: RecordVocabularyAttemptInput) {
    const operationId = `vocabulary:${input.sessionId}`;
    await serialized(async () => {
      const existing = await store.getOperation(userId, operationId);
      const attempts =
        existing?.kind === "VOCABULARY_SESSION_COMPLETED"
          ? existing.attempts.filter(
              (attempt) => attempt.attemptId !== input.attempt.attemptId,
            )
          : [];
      attempts.push(input.attempt);
      await store.putOperation(userId, {
        id: operationId,
        kind: "VOCABULARY_SESSION_COMPLETED",
        gameKey: input.gameKey,
        sessionId: input.sessionId,
        timeZone: input.timeZone,
        attempts,
      });
      writeVersion += 1;
      if (!existing) publishPendingCount(pendingCount + 1);
    });
  }

  async function runCheckpoint(
    organizationId?: string,
  ): Promise<SyncCheckpointResult> {
    await writeTail;
    try {
      if (!(await isOnline())) return { state: "queued", reason: "offline" };
    } catch {
      return { state: "queued", reason: "unavailable" };
    }

    const operations = await store.listOperations(userId, 5000);
    try {
      const acknowledgedOperationIds: string[] = [];
      const failures: MobileSyncCommitResult["failures"] = [];
      const results: MobileSyncCommitResult["results"] = [];
      let dashboard: MobileDashboard | null = null;
      const batches = Math.max(1, Math.ceil(operations.length / 500));
      for (let index = 0; index < batches; index += 1) {
        const batch = operations.slice(index * 500, (index + 1) * 500);
        const result = await transport.commit({
          organizationId,
          operations: batch,
          includeDashboard: index === batches - 1,
        });
        acknowledgedOperationIds.push(...result.acknowledgedOperationIds);
        failures.push(...result.failures);
        results.push(...result.results);
        await serialized(async () => {
          const sentById = new Map(
            batch.map((operation) => [operation.id, operation]),
          );
          const safeToRemove: string[] = [];
          for (const id of result.acknowledgedOperationIds) {
            const current = await store.getOperation(userId, id);
            if (
              current &&
              JSON.stringify(current) === JSON.stringify(sentById.get(id))
            ) {
              safeToRemove.push(id);
            }
          }
          await store.removeOperations(userId, safeToRemove);
          await updatePendingCount();
        });
        if (result.dashboard) dashboard = result.dashboard;
      }
      if (!dashboard)
        throw new Error("Dashboard missing from final sync batch");
      await serialized(async () => {
        applyDashboard(dashboard);
        if (persistTimer) {
          clearTimeout(persistTimer);
          persistTimer = undefined;
        }
        await persistCache();
      });
      return {
        state: "synced",
        result: { acknowledgedOperationIds, failures, results, dashboard },
      };
    } catch {
      return { state: "queued", reason: "unavailable" };
    }
  }

  function checkpoint(organizationId?: string): Promise<SyncCheckpointResult> {
    const scope = organizationId ?? "__default__";
    const version = writeVersion;
    const active = activeCheckpoints.get(scope);
    if (active?.version === version) return active.promise;

    const promise = checkpointTail
      .then(() => runCheckpoint(organizationId))
      .finally(() => {
        if (activeCheckpoints.get(scope)?.promise === promise)
          activeCheckpoints.delete(scope);
      });
    checkpointTail = promise.then(
      () => undefined,
      () => undefined,
    );
    activeCheckpoints.set(scope, { version, promise });
    return promise;
  }

  async function checkForUpdates(organizationId?: string) {
    await writeTail;
    if (pendingCount > 0) {
      const result = await checkpoint(organizationId);
      if (result.state === "synced" && pendingCount > 0) {
        return { state: "queued", reason: "unavailable" } as const;
      }
      return result;
    }
    const dashboard = getCachedDashboard?.(organizationId);
    if (!dashboard) return checkpoint(organizationId);
    if (!transport.getRevision) return checkpoint(organizationId);
    const generatedAt = new Date(dashboard.generatedAt).getTime();
    if (
      !Number.isFinite(generatedAt) ||
      Date.now() - generatedAt >= MAX_DASHBOARD_AGE_MS
    ) {
      return checkpoint(organizationId);
    }
    try {
      if (!(await isOnline()))
        return { state: "queued", reason: "offline" } as const;
      const revision = await transport.getRevision(
        organizationId ? { organizationId } : undefined,
      );
      if (revision === dashboard.revision) return { state: "current" } as const;
      return checkpoint(organizationId);
    } catch {
      return { state: "queued", reason: "unavailable" } as const;
    }
  }

  async function clearLocalCache() {
    await checkpointTail;
    await serialized(async () => {
      if (await store.countOperations(userId)) {
        throw new Error(
          "Pending learning progress must sync before clearing local data.",
        );
      }
      if (persistTimer) clearTimeout(persistTimer);
      persistTimer = undefined;
      queryClient.clear();
      await store.clearCache(userId);
    });
  }

  async function dispose() {
    disposed = true;
    unsubscribe?.();
    if (persistTimer) clearTimeout(persistTimer);
    const finalCache = serializeCache();
    await checkpointTail;
    await writeTail;
    await persistCache(finalCache);
  }

  return {
    initialize,
    putOperation,
    recordVocabularyAttempt,
    checkpoint,
    checkForUpdates,
    clearLocalCache,
    dispose,
  };
}
