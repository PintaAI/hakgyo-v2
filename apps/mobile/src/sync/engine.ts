import type { QueryCacheNotifyEvent, QueryClient } from "@tanstack/react-query";
import SuperJSON from "superjson";
import {
  BUNDLE_SCHEMA,
  mergeLearnerState,
  SYNC_PROTOCOL,
  UPGRADE_REQUIRED_MESSAGE,
  type BundleStructure,
  type LearnerState,
} from "@hakgyo/shared/mobile-sync";

import { createBundleSync, type BundleSyncOptions } from "./bundle-sync";
import type { LocalData, LocalIndexRecord } from "./local-data";
import { createLocalData } from "./local-data-impl";
import { indexScope, syncQueryKeys } from "./query-keys";
import type { MobileSyncDeadLetter, MobileSyncStore } from "./store";
import type {
  LearnerIndex,
  LearnerStatePatch,
  MobileSyncCommitPatch,
  MobileSyncCommitResult,
  MobileSyncEngineState,
  MobileSyncOperation,
  MobileSyncTransport,
  SyncCheckpointResult,
  SyncRefreshResult,
  SyncUpdateResult,
  UpgradeRequired,
  VocabularySyncAttempt,
} from "./types";

/** Operations per commit request. */
export const COMMIT_BATCH_SIZE = 50;
/** Server limit for attempts in one VOCABULARY_SESSION_COMPLETED operation. */
export const MAX_VOCABULARY_ATTEMPTS_PER_OPERATION = 500;
// Retrying these is not expected to succeed. The operation stays queued (a
// racing replay or a server-side recovery may still settle it) and moves to
// the dead-letter list only once it keeps failing, so it cannot block every
// later sync forever. Everything else (server errors, timeouts, rate limits,
// auth, network) is transient and retried indefinitely.
/** Terminal failures of one payload before it may be dead-lettered... */
export const DEAD_LETTER_MIN_FAILURES = 5;
/** ...and the minimum time since its first terminal failure. */
export const DEAD_LETTER_MIN_AGE_MS = 24 * 60 * 60 * 1000;
/** A stored bundle older than this is refreshed even when its revision matches. */
export const BUNDLE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
/** Default poll spacing when the manifest did not suggest one. */
export const DEFAULT_CHECK_AFTER_MS = 60_000;
/** Debounce for persisting a whitelisted query result. */
const QUERY_PERSIST_DELAY_MS = 250;
const TERMINAL_FAILURE_CODES = new Set([
  "BAD_REQUEST",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "PRECONDITION_FAILED",
]);

/** tRPC procedures whose results are persisted row-by-row (`mobile_sync_query`). */
export const PERSISTED_QUERY_PATHS = new Set([
  "assessment.getMyAttempt",
  "assessment.getForCourseItem",
  "learning.getVocabularyProgress",
  "assessmentEvent.getForLearner",
]);
const PERSISTED_TRPC_PREFIX = "trpc:";

type VocabularyOperation = Extract<
  MobileSyncOperation,
  { kind: "VOCABULARY_SESSION_COMPLETED" }
>;

export function isTerminalSyncFailure(code: string) {
  return TERMINAL_FAILURE_CODES.has(code);
}

/** Recognizes the PRECONDITION_FAILED "UPGRADE_REQUIRED" error of every v2 procedure. */
export function upgradeRequiredFromError(
  error: unknown,
): UpgradeRequired | null {
  if (!error || typeof error !== "object") return null;
  const candidate = error as {
    message?: unknown;
    data?: { upgradeRequired?: { minProtocol?: unknown } } | null;
  };
  const minProtocol = candidate.data?.upgradeRequired?.minProtocol;
  if (typeof minProtocol === "number") return { minProtocol };
  if (candidate.message === UPGRADE_REQUIRED_MESSAGE) {
    return { minProtocol: SYNC_PROTOCOL + 1 };
  }
  return null;
}

function vocabularyOperationId(sessionId: string, chunk: number) {
  return chunk === 1
    ? `vocabulary:${sessionId}`
    : `vocabulary:${sessionId}#${chunk}`;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${stableJson((value as Record<string, unknown>)[key])}`,
      )
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

/** Storage key of a persisted tRPC query (`path:input`), e.g. `assessment.getMyAttempt:{"attemptId":"a"}`. */
export function persistedQueryKey(path: readonly string[], input: unknown) {
  return `${path.join(".")}:${stableJson(input ?? null)}`;
}

/** Recognizes a tRPC react-query key `[["assessment","getMyAttempt"], { input, type: "query" }]`. */
function persistedTrpcKey(queryKey: readonly unknown[]) {
  const [path, meta] = queryKey;
  if (!Array.isArray(path) || !path.every((part) => typeof part === "string"))
    return null;
  const joined = (path as string[]).join(".");
  if (!PERSISTED_QUERY_PATHS.has(joined)) return null;
  const options = (meta ?? {}) as { input?: unknown; type?: string };
  if (options.type && options.type !== "query") return null;
  return persistedQueryKey(path as string[], options.input);
}

type PersistedTrpcRow = {
  queryKey: readonly unknown[];
  data: unknown;
  dataUpdatedAt: number;
};

type IndexEntry = {
  index: LearnerIndex;
  token: string;
  validUntil: number;
  stale: boolean;
};

export type EngineOptions = {
  userId: string;
  queryClient: QueryClient;
  store: MobileSyncStore;
  transport: MobileSyncTransport;
  isOnline: () => Promise<boolean>;
  onPendingCountChange?: (count: number) => void;
  onDeadLetterCountChange?: (count: number) => void;
  onStateChange?: (state: MobileSyncEngineState) => void;
  /**
   * Called whenever an index is stored or patched, so the provider can mirror
   * its sections into the tRPC query keys (listMyCourses, getMySummary...).
   */
  onIndexApplied?: (scope: string, index: LearnerIndex) => void;
  /** Runtime/update identifiers are sent by the transport; these tune scheduling. */
  bundleSync?: Pick<
    BundleSyncOptions,
    | "concurrency"
    | "backgroundJitterMs"
    | "maxAttempts"
    | "backoffBaseMs"
    | "random"
  >;
  bundleMaxAgeMs?: number;
  now?: () => number;
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
  onPendingCountChange,
  onDeadLetterCountChange,
  onStateChange,
  onIndexApplied,
  bundleSync: bundleSyncOptions,
  bundleMaxAgeMs = BUNDLE_MAX_AGE_MS,
  now = Date.now,
}: EngineOptions) {
  let disposed = false;
  let writeTail: Promise<unknown> = Promise.resolve();
  let writeVersion = 0;
  let checkpointTail: Promise<unknown> = Promise.resolve();
  let pendingCount = 0;
  let hasPublishedPendingCount = false;
  const activeCheckpoints = new Map<
    string,
    { version: number; promise: Promise<SyncCheckpointResult> }
  >();
  const activeRefreshes = new Map<string, Promise<SyncRefreshResult>>();
  const indexes = new Map<string, IndexEntry>();
  const indexLoads = new Map<string, Promise<IndexEntry | null>>();
  const persistTimers = new Map<string, ReturnType<typeof setTimeout>>();
  let unsubscribe: (() => void) | undefined;
  const state: MobileSyncEngineState = {
    upgradeRequired: null,
    isRefreshing: false,
    bundles: { pending: 0, completed: 0, failed: 0, activeCourseIds: [] },
    nextCheckAfterMs: DEFAULT_CHECK_AFTER_MS,
    lastRefreshedAt: null,
  };

  const stateListeners = new Set<(state: MobileSyncEngineState) => void>();

  function snapshot(): MobileSyncEngineState {
    return { ...state, bundles: { ...state.bundles } };
  }

  function publishState(patch: Partial<MobileSyncEngineState>) {
    Object.assign(state, patch);
    const current = snapshot();
    onStateChange?.(current);
    for (const listener of stateListeners) listener(current);
  }

  function subscribe(listener: (state: MobileSyncEngineState) => void) {
    stateListeners.add(listener);
    return () => {
      stateListeners.delete(listener);
    };
  }

  const bundles = createBundleSync({
    userId,
    store,
    queryClient,
    fetchBundle: transport.fetchBundle,
    now,
    ...bundleSyncOptions,
    onProgress: (progress) => publishState({ bundles: progress }),
    onUpgradeRequired: (upgrade) => publishState({ upgradeRequired: upgrade }),
  });

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

  async function updateDeadLetterCount() {
    onDeadLetterCountChange?.(await store.countDeadLetters(userId));
  }

  // ---------------------------------------------------------------------------
  // Learner index
  // ---------------------------------------------------------------------------

  function indexRecord(entry: IndexEntry): LocalIndexRecord<LearnerIndex> {
    return { index: entry.index, stale: entry.stale };
  }

  function publishIndex(scope: string, entry: IndexEntry) {
    indexes.set(scope, entry);
    queryClient.setQueryData(syncQueryKeys.index(scope), indexRecord(entry));
    onIndexApplied?.(scope, entry.index);
  }

  async function loadIndex(scope: string): Promise<IndexEntry | null> {
    const cached = indexes.get(scope);
    if (cached) return cached;
    const active = indexLoads.get(scope);
    if (active) return active;
    const load = (async () => {
      const row = await store.loadIndex(userId, scope);
      if (!row) return null;
      try {
        const index = SuperJSON.parse<LearnerIndex>(row.payload);
        const entry: IndexEntry = {
          index,
          token: row.token,
          validUntil: row.validUntil,
          stale: row.stale,
        };
        if (!indexes.has(scope)) {
          indexes.set(scope, entry);
          queryClient.setQueryData(
            syncQueryKeys.index(scope),
            indexRecord(entry),
          );
        }
        return indexes.get(scope) ?? entry;
      } catch {
        return null;
      }
    })().finally(() => indexLoads.delete(scope));
    indexLoads.set(scope, load);
    return load;
  }

  async function storeIndex(scope: string, entry: IndexEntry) {
    publishIndex(scope, entry);
    await store.saveIndex(userId, {
      scope,
      token: entry.token,
      payload: SuperJSON.stringify(entry.index),
      validUntil: entry.validUntil,
      stale: entry.stale,
      updatedAt: now(),
    });
  }

  async function applyIndex(scope: string, index: LearnerIndex) {
    const validUntil = new Date(index.validUntil).getTime();
    await storeIndex(scope, {
      index,
      token: index.indexToken,
      validUntil: Number.isFinite(validUntil) ? validUntil : now(),
      stale: false,
    });
  }

  async function bundleStructuresFor(courseIds: string[]) {
    const record: Record<string, { structure: BundleStructure }> = {};
    await Promise.all(
      courseIds.map(async (courseId) => {
        const stored = await store.loadBundleStructure(userId, courseId);
        if (stored) record[courseId] = { structure: stored.data };
      }),
    );
    return record;
  }

  /** Merges a commit patch: learner state per affected course, gamification and attempts. */
  async function applyPatch(scope: string, patch: MobileSyncCommitPatch) {
    const structures = await bundleStructuresFor(patch.learner.courseIds);
    const finishedAttemptIds = new Set(
      (patch.attempts as Array<{ id: string; status: string }>)
        .filter((attempt) => attempt.status !== "IN_PROGRESS")
        .map((attempt) => attempt.id),
    );
    const scopes = new Set([scope, ...indexes.keys()]);
    for (const target of scopes) {
      const entry = await loadIndex(target);
      if (!entry) continue;
      const resumableAttempts = Object.fromEntries(
        Object.entries(entry.index.resumableAttempts ?? {}).filter(
          ([attemptId]) => !finishedAttemptIds.has(attemptId),
        ),
      ) as LearnerIndex["resumableAttempts"];
      const index: LearnerIndex = {
        ...entry.index,
        learner: mergeLearnerState(
          entry.index.learner,
          patch.learner,
          structures,
        ),
        gamification: patch.gamification as LearnerIndex["gamification"],
        // Attempts are scoped by organization: only the committed scope's list
        // is replaced.
        attempts:
          target === scope
            ? (patch.attempts as LearnerIndex["attempts"])
            : entry.index.attempts,
        resumableAttempts,
      };
      await storeIndex(target, { ...entry, index, stale: true });
    }
  }

  async function markIndexesStale() {
    for (const [scope, entry] of indexes) {
      if (!entry.stale) publishIndex(scope, { ...entry, stale: true });
    }
    await store.markIndexStale(userId);
  }

  /** Optimistic local change (content completed offline, set practiced). */
  async function patchLearnerState(scope: string, patch: LearnerStatePatch) {
    const scopes = new Set([scope, ...indexes.keys()]);
    for (const target of scopes) {
      const entry = await loadIndex(target);
      if (!entry) continue;
      const learner: LearnerState = {
        ...entry.index.learner,
        contentProgress: {
          ...entry.index.learner.contentProgress,
          ...(patch.contentProgress ?? {}),
        },
        practicedVocabularySetIds: [
          ...new Set([
            ...entry.index.learner.practicedVocabularySetIds,
            ...(patch.practicedVocabularySetIds ?? []),
          ]),
        ],
      };
      await storeIndex(target, {
        ...entry,
        index: { ...entry.index, learner },
        stale: true,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Whitelisted query persistence
  // ---------------------------------------------------------------------------

  function schedulePersist(event?: QueryCacheNotifyEvent) {
    if (disposed || !event) return;
    const key = persistedTrpcKey(event.query.queryKey);
    if (!key) return;
    const rowKey = `${PERSISTED_TRPC_PREFIX}${key}`;
    if (event.type === "removed") {
      const timer = persistTimers.get(rowKey);
      if (timer) clearTimeout(timer);
      persistTimers.delete(rowKey);
      void store.deleteQuery(userId, rowKey).catch(() => undefined);
      return;
    }
    if (
      event.type !== "updated" ||
      (event.action.type !== "success" && event.action.type !== "setState")
    ) {
      return;
    }
    const query = event.query;
    if (query.state.status !== "success" || query.state.data === undefined)
      return;
    const existing = persistTimers.get(rowKey);
    if (existing) clearTimeout(existing);
    persistTimers.set(
      rowKey,
      setTimeout(() => {
        persistTimers.delete(rowKey);
        if (query.state.status !== "success") return;
        const row: PersistedTrpcRow = {
          queryKey: query.queryKey,
          data: query.state.data,
          dataUpdatedAt: query.state.dataUpdatedAt,
        };
        void store
          .saveQuery(userId, rowKey, SuperJSON.stringify(row), now())
          .catch(() => undefined);
      }, QUERY_PERSIST_DELAY_MS),
    );
  }

  async function hydratePersistedQueries() {
    const rows = await store.listQueries(userId);
    for (const row of rows) {
      if (!row.queryKey.startsWith(PERSISTED_TRPC_PREFIX)) continue;
      try {
        const parsed = SuperJSON.parse<PersistedTrpcRow>(row.payload);
        if (!Array.isArray(parsed.queryKey)) continue;
        if (queryClient.getQueryData(parsed.queryKey) !== undefined) continue;
        queryClient.setQueryData(parsed.queryKey, parsed.data, {
          updatedAt: parsed.dataUpdatedAt,
        });
      } catch {
        // Rows written by another client version are disposable.
      }
    }
  }

  function flushPersistTimers() {
    for (const [, timer] of persistTimers) clearTimeout(timer);
    persistTimers.clear();
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async function initialize() {
    await store.initialize();
    queryClient.clear();
    indexes.clear();
    await hydratePersistedQueries();
    await bundles.load();
    unsubscribe = queryClient.getQueryCache().subscribe(schedulePersist);
    await updatePendingCount();
    await updateDeadLetterCount();
  }

  // ---------------------------------------------------------------------------
  // Outbox
  // ---------------------------------------------------------------------------

  async function putOperation(operation: MobileSyncOperation) {
    await serialized(async () => {
      await store.putOperation(userId, operation);
      writeVersion += 1;
      await updatePendingCount();
    });
  }

  async function recordVocabularyAttempt(input: RecordVocabularyAttemptInput) {
    await serialized(async () => {
      // A session is split across operations of at most
      // MAX_VOCABULARY_ATTEMPTS_PER_OPERATION attempts. A re-recorded attempt
      // replaces its previous version in whichever chunk holds it.
      const baseId = vocabularyOperationId(input.sessionId, 1);
      const listed = await store.listOperationsByIdPrefix(userId, baseId);
      // Any listed id is taken, even by another session's operation.
      const takenIds = new Set(listed.map((operation) => operation.id));
      const chunks = listed.filter(
        (operation): operation is VocabularyOperation =>
          operation.kind === "VOCABULARY_SESSION_COMPLETED" &&
          operation.sessionId === input.sessionId &&
          (operation.id === baseId || operation.id.startsWith(`${baseId}#`)),
      );
      let target:
        | {
            id: string;
            attempts: VocabularyOperation["attempts"];
            isNew: boolean;
          }
        | undefined;
      const holder = chunks.find((chunk) =>
        chunk.attempts.some(
          (attempt) => attempt.attemptId === input.attempt.attemptId,
        ),
      );
      if (holder) {
        target = {
          id: holder.id,
          attempts: holder.attempts.filter(
            (attempt) => attempt.attemptId !== input.attempt.attemptId,
          ),
          isNew: false,
        };
      } else {
        const open = chunks.find(
          (chunk) =>
            chunk.attempts.length < MAX_VOCABULARY_ATTEMPTS_PER_OPERATION,
        );
        if (open) {
          target = { id: open.id, attempts: open.attempts, isNew: false };
        } else {
          // Chunk 1 may already have synced while later chunks are queued.
          let chunk = 1;
          while (takenIds.has(vocabularyOperationId(input.sessionId, chunk))) {
            chunk += 1;
          }
          target = {
            id: vocabularyOperationId(input.sessionId, chunk),
            attempts: [],
            isNew: true,
          };
        }
      }
      const operation = target;
      operation.attempts.push(input.attempt);
      await store.putOperation(userId, {
        id: operation.id,
        kind: "VOCABULARY_SESSION_COMPLETED",
        gameKey: input.gameKey,
        sessionId: input.sessionId,
        timeZone: input.timeZone,
        attempts: operation.attempts,
      });
      writeVersion += 1;
      if (operation.isNew) publishPendingCount(pendingCount + 1);
    });
  }

  // Outboxes written before the per-operation cap may hold sessions the server
  // rejects as a whole; split them into valid chunks before sending.
  async function splitOversizedVocabularyOperations(
    operations: MobileSyncOperation[],
  ) {
    const oversized = operations.filter(
      (operation): operation is VocabularyOperation =>
        operation.kind === "VOCABULARY_SESSION_COMPLETED" &&
        operation.attempts.length > MAX_VOCABULARY_ATTEMPTS_PER_OPERATION,
    );
    if (!oversized.length) return false;
    await serialized(async () => {
      for (const listed of oversized) {
        const operation = await store.getOperation(userId, listed.id);
        if (
          operation?.kind !== "VOCABULARY_SESSION_COMPLETED" ||
          operation.attempts.length <= MAX_VOCABULARY_ATTEMPTS_PER_OPERATION
        ) {
          continue;
        }
        const chunks: VocabularyOperation[] = [
          {
            ...operation,
            attempts: operation.attempts.slice(
              0,
              MAX_VOCABULARY_ATTEMPTS_PER_OPERATION,
            ),
          },
        ];
        let chunk = 2;
        for (
          let index = MAX_VOCABULARY_ATTEMPTS_PER_OPERATION;
          index < operation.attempts.length;
          index += MAX_VOCABULARY_ATTEMPTS_PER_OPERATION
        ) {
          let id = vocabularyOperationId(operation.sessionId, chunk);
          while (
            id === operation.id ||
            (await store.getOperation(userId, id))
          ) {
            chunk += 1;
            id = vocabularyOperationId(operation.sessionId, chunk);
          }
          chunk += 1;
          chunks.push({
            ...operation,
            id,
            attempts: operation.attempts.slice(
              index,
              index + MAX_VOCABULARY_ATTEMPTS_PER_OPERATION,
            ),
          });
        }
        // One transaction; the new chunks keep the original's queue position.
        await store.splitOperation(userId, chunks);
      }
      writeVersion += 1;
      await updatePendingCount();
    });
    return true;
  }

  function noteUpgradeRequired(error: unknown) {
    const upgrade = upgradeRequiredFromError(error);
    if (upgrade) publishState({ upgradeRequired: upgrade });
    return upgrade;
  }

  async function runCheckpoint(
    organizationId?: string,
  ): Promise<SyncCheckpointResult> {
    await writeTail;
    if (state.upgradeRequired)
      return { state: "queued", reason: "upgrade-required" };
    try {
      if (!(await isOnline())) return { state: "queued", reason: "offline" };
    } catch {
      return { state: "queued", reason: "unavailable" };
    }
    const scope = indexScope(organizationId);

    let operations = await store.listOperations(userId, 5000);
    try {
      if (await splitOversizedVocabularyOperations(operations)) {
        operations = await store.listOperations(userId, 5000);
      }
      const acknowledgedOperationIds: string[] = [];
      const failures: MobileSyncCommitResult["failures"] = [];
      const results: MobileSyncCommitResult["results"] = [];
      let budgetExhausted = false;
      let patched = false;
      let remaining = operations;
      // Every request either makes progress or ends the loop; the cap is a
      // backstop against a server that keeps returning partial results.
      const maxRequests =
        2 * Math.ceil(operations.length / COMMIT_BATCH_SIZE) + 2;
      for (let request = 0; request < maxRequests; request += 1) {
        const batch = remaining.slice(0, COMMIT_BATCH_SIZE);
        const result = await transport.commit({
          protocol: SYNC_PROTOCOL,
          organizationId,
          operations: batch,
        } as Parameters<MobileSyncTransport["commit"]>[0]);
        acknowledgedOperationIds.push(...result.acknowledgedOperationIds);
        failures.push(...result.failures);
        results.push(...result.results);
        budgetExhausted = result.budgetExhausted ?? false;
        await serialized(async () => {
          const sentById = new Map(
            batch.map((operation) => [operation.id, operation]),
          );
          // Only settle an operation that was not changed while in flight;
          // a changed one (e.g. more vocabulary attempts) is sent again.
          const unchanged = async (id: string) => {
            const current = await store.getOperation(userId, id);
            const sent = sentById.get(id);
            return (
              !!current &&
              !!sent &&
              JSON.stringify(current) === JSON.stringify(sent)
            );
          };
          const safeToRemove: string[] = [];
          for (const id of result.acknowledgedOperationIds) {
            if (await unchanged(id)) safeToRemove.push(id);
          }
          await store.removeOperations(userId, safeToRemove);
          // The server stops at the first transient failure. A terminal
          // failure reported after one (by an older server) may be caused by
          // it, so it is not counted.
          const failuresById = new Map(
            result.failures.map((failure) => [failure.id, failure]),
          );
          const transientIndex = batch.findIndex((operation) => {
            const failure = failuresById.get(operation.id);
            return !!failure && !isTerminalSyncFailure(failure.code);
          });
          const countedFailures = (
            transientIndex === -1 ? batch : batch.slice(0, transientIndex)
          ).flatMap((operation) => {
            const failure = failuresById.get(operation.id);
            return failure && isTerminalSyncFailure(failure.code)
              ? [failure]
              : [];
          });
          const failedIds: string[] = [];
          for (const failure of countedFailures) {
            if (await unchanged(failure.id)) failedIds.push(failure.id);
          }
          const at = Date.now();
          const totals = await store.recordOperationFailures(
            userId,
            failedIds,
            at,
          );
          const deadLetters: MobileSyncDeadLetter[] = [];
          for (const total of totals) {
            if (
              total.failureCount < DEAD_LETTER_MIN_FAILURES ||
              at - total.firstFailedAt < DEAD_LETTER_MIN_AGE_MS
            ) {
              continue;
            }
            const failure = failuresById.get(total.id)!;
            deadLetters.push({
              operation: sentById.get(total.id)!,
              code: failure.code,
              message: failure.message,
              failedAt: at,
            });
          }
          if (deadLetters.length) {
            await store.deadLetterOperations(userId, deadLetters);
            await updateDeadLetterCount();
          }
          await updatePendingCount();
        });
        if (result.patch) {
          await applyPatch(scope, result.patch);
          patched = true;
        }
        // Operations the server did not reach (its time budget ran out) are
        // neither acknowledged nor failed: send them again first.
        const settled = new Set([
          ...result.acknowledgedOperationIds,
          ...result.failures.map((failure) => failure.id),
        ]);
        const unprocessed = batch.filter(
          (operation) => !settled.has(operation.id),
        );
        remaining = [...unprocessed, ...remaining.slice(batch.length)];
        // A transient failure: later operations may depend on it, so retry
        // them together later instead of sending them without it.
        if (
          result.failures.some(
            (failure) => !isTerminalSyncFailure(failure.code),
          )
        ) {
          break;
        }
        if (!remaining.length) break;
        // No progress: stop and let the scheduler back off.
        if (batch.length && unprocessed.length === batch.length) {
          if (!patched && !budgetExhausted) {
            return { state: "queued", reason: "unavailable" };
          }
          break;
        }
      }
      // Whatever the server changed is reflected in the next index.
      await markIndexesStale();
      return {
        state: "synced",
        result: {
          acknowledgedOperationIds,
          failures,
          results,
          budgetExhausted,
          patch: null,
        } as MobileSyncCommitResult,
      };
    } catch (error) {
      if (noteUpgradeRequired(error))
        return { state: "queued", reason: "upgrade-required" };
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

  // ---------------------------------------------------------------------------
  // Refresh: manifest → index → bundles
  // ---------------------------------------------------------------------------

  async function runRefresh(
    organizationId: string | undefined,
    force: boolean,
  ): Promise<SyncRefreshResult> {
    if (state.upgradeRequired)
      return { state: "queued", reason: "upgrade-required" };
    try {
      if (!(await isOnline())) return { state: "queued", reason: "offline" };
    } catch {
      return { state: "queued", reason: "unavailable" };
    }
    const scope = indexScope(organizationId);
    publishState({ isRefreshing: true });
    try {
      const manifest = await transport.getManifest({
        protocol: SYNC_PROTOCOL,
        organizationId,
      });
      if (manifest.minProtocol > SYNC_PROTOCOL) {
        publishState({
          upgradeRequired: { minProtocol: manifest.minProtocol },
        });
        return { state: "queued", reason: "upgrade-required" };
      }
      let changed = false;
      const checkAfterMs =
        Number.isFinite(manifest.checkAfterMs) && manifest.checkAfterMs > 0
          ? manifest.checkAfterMs
          : DEFAULT_CHECK_AFTER_MS;

      const local = await loadIndex(scope);
      const needsIndex =
        force ||
        !local ||
        local.stale ||
        local.token !== manifest.indexToken ||
        local.validUntil <= now() ||
        local.index.indexSchema !== manifest.indexSchema;
      if (needsIndex) {
        const result = await transport.getIndex({
          protocol: SYNC_PROTOCOL,
          organizationId,
          knownIndexToken:
            local && !local.stale && !force ? local.token : undefined,
        });
        if (result.status === "ok") {
          await applyIndex(scope, result.index);
          changed = true;
        } else if (local) {
          await storeIndex(scope, {
            ...local,
            token: result.indexToken,
            stale: false,
          });
        }
      }

      const stored = new Map(
        bundles.stored().map((meta) => [meta.courseId, meta]),
      );
      const current = now();
      const requests = manifest.courses.flatMap((course) => {
        const meta = stored.get(course.courseId);
        const outdated =
          !meta ||
          meta.revision !== course.revision ||
          meta.schema !== manifest.bundleSchema ||
          meta.schema !== BUNDLE_SCHEMA ||
          current - meta.updatedAt >= bundleMaxAgeMs;
        return outdated ? [{ courseId: course.courseId }] : [];
      });
      if (requests.length) {
        changed = true;
        bundles.enqueue(requests);
      }
      const keep = manifest.courses.map((course) => course.courseId);
      const removed = await store.pruneBundles(userId, keep);
      if (removed.length) {
        bundles.forget(removed);
        changed = true;
      }
      publishState({ nextCheckAfterMs: checkAfterMs, lastRefreshedAt: now() });
      return changed ? { state: "refreshed" } : { state: "current" };
    } catch (error) {
      if (noteUpgradeRequired(error))
        return { state: "queued", reason: "upgrade-required" };
      return { state: "queued", reason: "unavailable" };
    } finally {
      publishState({ isRefreshing: false });
    }
  }

  function refresh(
    organizationId?: string,
    options: { force?: boolean } = {},
  ): Promise<SyncRefreshResult> {
    const scope = indexScope(organizationId);
    const active = activeRefreshes.get(scope);
    if (active) return active;
    const promise = runRefresh(organizationId, options.force ?? false).finally(
      () => {
        if (activeRefreshes.get(scope) === promise)
          activeRefreshes.delete(scope);
      },
    );
    activeRefreshes.set(scope, promise);
    return promise;
  }

  /**
   * Flushes the outbox when it holds operations, then refreshes the index and
   * bundles. Without `force`, a refresh within `nextCheckAfterMs` of the last
   * one is skipped unless the index is stale.
   */
  async function checkForUpdates(
    organizationId?: string,
    options: { force?: boolean } = {},
  ): Promise<SyncUpdateResult> {
    await writeTail;
    if (pendingCount > 0) {
      const result = await checkpoint(organizationId);
      if (result.state !== "synced") return result;
      if (pendingCount > 0) {
        return { state: "queued", reason: "unavailable" };
      }
    }
    const scope = indexScope(organizationId);
    const local = indexes.get(scope) ?? (await loadIndex(scope));
    if (
      !options.force &&
      local &&
      !local.stale &&
      state.lastRefreshedAt !== null &&
      now() - state.lastRefreshedAt < state.nextCheckAfterMs
    ) {
      return { state: "current" };
    }
    return refresh(organizationId, options);
  }

  // ---------------------------------------------------------------------------
  // Local data helpers
  // ---------------------------------------------------------------------------

  function requestBundle(courseId: string) {
    bundles.requestBundle(courseId);
    void store
      .touchBundleOpened(userId, courseId, now())
      .catch(() => undefined);
  }

  async function clearLocalCache() {
    await checkpointTail;
    await serialized(async () => {
      if (await store.countOperations(userId)) {
        throw new Error(
          "Pending learning progress must sync before clearing local data.",
        );
      }
      flushPersistTimers();
      queryClient.clear();
      indexes.clear();
      await store.clearLocalData(userId);
      await bundles.load();
      publishState({ lastRefreshedAt: null });
    });
  }

  async function dispose() {
    disposed = true;
    unsubscribe?.();
    flushPersistTimers();
    bundles.dispose();
    await checkpointTail;
    await writeTail;
  }

  const engine = {
    initialize,
    putOperation,
    recordVocabularyAttempt,
    checkpoint,
    refresh,
    checkForUpdates,
    requestBundle,
    patchLearnerState,
    /** In-memory or stored index for a scope (null before the first sync). */
    loadIndex: async (scope: string) => {
      const entry = await loadIndex(scope);
      return entry ? indexRecord(entry) : null;
    },
    courseIdForItem: (courseItemId: string) =>
      bundles.courseIdForItem(courseItemId),
    getState: snapshot,
    subscribe,
    whenBundlesIdle: () => bundles.whenIdle(),
    clearLocalCache,
    dispose,
    /** Read side handed to the screen hooks. */
    localData: null as unknown as LocalData<LearnerIndex>,
  };
  engine.localData = createLocalData({ userId, store, engine });
  return engine;
}

export type MobileSyncEngine = ReturnType<typeof createMobileSyncEngine>;
