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
  MobileSyncOperation,
  MobileSyncTransport,
  SyncCheckpointResult,
  VocabularySyncAttempt,
} from "./types";

const QUERY_CACHE_VERSION = 2;

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

    const operations = (await store.listOperations(userId)).slice(0, 500);
    try {
      const result = await transport.commit({ organizationId, operations });
      await serialized(async () => {
        await store.removeOperations(userId, result.acknowledgedOperationIds);
        applyDashboard(result.dashboard);
        if (persistTimer) {
          clearTimeout(persistTimer);
          persistTimer = undefined;
        }
        await persistCache();
        await updatePendingCount();
      });
      return { state: "synced", result };
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
    dispose,
  };
}
