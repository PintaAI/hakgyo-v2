import type {
  BundleContent,
  BundleStructure,
} from "@hakgyo/shared/mobile-sync";

import {
  MAX_SYNC_NOTICES,
  SYNC_NOTICE_MAX_AGE_MS,
  type SyncNotice,
  type SyncNoticeUpdate,
} from "./notices";
import type {
  MobileSyncDeadLetter,
  MobileSyncStore,
  StoredBundle,
  StoredBundleMeta,
  StoredIndex,
  StoredQuery,
} from "./store";
import type { MobileSyncOperation } from "./types";

/**
 * In-memory `MobileSyncStore` for tests (and a reference for the SQLite
 * semantics: per-user rows, outbox ordering, failure counting).
 */
export function createMemoryStore(): MobileSyncStore & {
  bundles: Map<
    string,
    StoredBundle<{ structure: BundleStructure; content: BundleContent }>
  >;
  indexes: Map<string, StoredIndex>;
  queries: Map<string, StoredQuery>;
  meta: Map<string, string>;
  noticeBaselines: Map<string, string>;
  /** Fails the next notice write (bundle saves with notices included). */
  failNextNoticeWrite: () => void;
} {
  const meta = new Map<string, string>();
  const indexes = new Map<string, StoredIndex>();
  const bundles = new Map<
    string,
    StoredBundle<{ structure: BundleStructure; content: BundleContent }>
  >();
  const queries = new Map<string, StoredQuery>();
  const operations = new Map<
    string,
    {
      operation: MobileSyncOperation;
      createdAt: number;
      sequence: number;
      failureCount: number;
      firstFailedAt: number | null;
    }
  >();
  const deadLetters: Array<MobileSyncDeadLetter & { userId: string }> = [];
  const notices: Array<{
    userId: string;
    notice: SyncNotice;
    dismissedAt: number | null;
  }> = [];
  const noticeBaselines = new Map<string, string>();
  let failNoticeWrite = false;
  let sequence = 0;
  const key = (userId: string, id: string) => `${userId}:${id}`;
  const rowsFor = (userId: string) =>
    [...operations.entries()]
      .filter(([operationKey]) => operationKey.startsWith(`${userId}:`))
      .map(([, row]) => row)
      .sort(
        (left, right) =>
          left.createdAt - right.createdAt || left.sequence - right.sequence,
      );
  const put = (
    userId: string,
    operation: MobileSyncOperation,
    createdAt?: number,
  ) => {
    const existing = operations.get(key(userId, operation.id));
    const unchanged =
      !!existing &&
      JSON.stringify(existing.operation) === JSON.stringify(operation);
    operations.set(key(userId, operation.id), {
      operation: structuredClone(operation),
      createdAt: createdAt ?? existing?.createdAt ?? Date.now(),
      sequence: existing?.sequence ?? (sequence += 1),
      failureCount: unchanged ? existing.failureCount : 0,
      firstFailedAt: unchanged ? existing.firstFailedAt : null,
    });
  };
  const deadLettersFor = (userId: string) =>
    deadLetters
      .filter((entry) => entry.userId === userId)
      .map(({ userId: _userId, ...entry }) => structuredClone(entry));
  const bundleMeta = (bundle: StoredBundle<unknown>): StoredBundleMeta => ({
    courseId: bundle.courseId,
    revision: bundle.revision,
    schema: bundle.schema,
    etag: bundle.etag,
    bytes: bundle.bytes,
    updatedAt: bundle.updatedAt,
    openedAt: bundle.openedAt,
  });
  const writeNotices = (
    userId: string,
    update: SyncNoticeUpdate,
    recordedAt: number,
  ) => {
    if (failNoticeWrite) {
      failNoticeWrite = false;
      throw new Error("Notice write failed");
    }
    for (const notice of update.notices) {
      const owned = (row: (typeof notices)[number]) => row.userId === userId;
      if (notices.some((row) => owned(row) && row.notice.id === notice.id))
        continue;
      for (let index = notices.length - 1; index >= 0; index -= 1) {
        const row = notices[index]!;
        if (owned(row) && row.notice.group === notice.group)
          notices.splice(index, 1);
      }
      notices.push({
        userId,
        notice: structuredClone(notice),
        dismissedAt: null,
      });
    }
    for (const baseline of update.baselines) {
      noticeBaselines.set(key(userId, baseline.key), baseline.value);
    }
    if (!update.notices.length) return;
    const kept = notices
      .filter((row) => row.userId === userId)
      .filter(
        (row) => row.notice.createdAt >= recordedAt - SYNC_NOTICE_MAX_AGE_MS,
      )
      .slice(-MAX_SYNC_NOTICES);
    for (let index = notices.length - 1; index >= 0; index -= 1) {
      const row = notices[index]!;
      if (row.userId === userId && !kept.includes(row))
        notices.splice(index, 1);
    }
  };
  const userBundles = (userId: string) =>
    [...bundles.entries()]
      .filter(([bundleKey]) => bundleKey.startsWith(`${userId}:`))
      .map(([, bundle]) => bundle);

  return {
    bundles,
    indexes,
    queries,
    meta,
    noticeBaselines,
    failNextNoticeWrite: () => {
      failNoticeWrite = true;
    },
    initialize: async () => undefined,
    getMeta: async (userId, metaKey) => meta.get(key(userId, metaKey)) ?? null,
    setMeta: async (userId, metaKey, value) => {
      meta.set(key(userId, metaKey), value);
    },
    loadIndex: async (userId, scope) =>
      structuredClone(indexes.get(key(userId, scope)) ?? null),
    saveIndex: async (userId, index) => {
      indexes.set(key(userId, index.scope), {
        ...index,
        updatedAt: index.updatedAt ?? Date.now(),
      });
    },
    markIndexStale: async (userId, scope) => {
      for (const [indexKey, index] of indexes) {
        if (!indexKey.startsWith(`${userId}:`)) continue;
        if (scope !== undefined && index.scope !== scope) continue;
        index.stale = true;
      }
    },
    listBundleRevisions: async (userId) => userBundles(userId).map(bundleMeta),
    loadBundleStructure: async (userId, courseId) => {
      const bundle = bundles.get(key(userId, courseId));
      return bundle
        ? {
            ...bundleMeta(bundle),
            data: structuredClone(bundle.data.structure),
          }
        : null;
    },
    loadBundleContent: async (userId, courseId) => {
      const bundle = bundles.get(key(userId, courseId));
      return bundle
        ? { ...bundleMeta(bundle), data: structuredClone(bundle.data.content) }
        : null;
    },
    listBundleStructures: async (userId) =>
      userBundles(userId).map((bundle) => ({
        ...bundleMeta(bundle),
        data: structuredClone(bundle.data.structure),
      })),
    saveBundle: async (userId, bundle, update) => {
      // One transaction: a failed notice write stores nothing.
      if (update) writeNotices(userId, update, bundle.updatedAt ?? Date.now());
      const existing = bundles.get(key(userId, bundle.courseId));
      bundles.set(key(userId, bundle.courseId), {
        courseId: bundle.courseId,
        revision: bundle.revision,
        schema: bundle.schema,
        etag: bundle.etag,
        bytes: bundle.bytes ?? 0,
        updatedAt: bundle.updatedAt ?? Date.now(),
        openedAt: existing?.openedAt ?? null,
        data: structuredClone({
          structure: bundle.structure,
          content: bundle.content,
        }),
      });
    },
    touchBundleChecked: async (userId, courseId, checkedAt = Date.now()) => {
      const bundle = bundles.get(key(userId, courseId));
      if (bundle) bundle.updatedAt = checkedAt;
    },
    touchBundleOpened: async (userId, courseId, openedAt = Date.now()) => {
      const bundle = bundles.get(key(userId, courseId));
      if (bundle) bundle.openedAt = openedAt;
    },
    pruneBundles: async (userId, keepCourseIds) => {
      const keep = new Set(keepCourseIds);
      const removed: string[] = [];
      for (const bundle of userBundles(userId)) {
        if (keep.has(bundle.courseId)) continue;
        bundles.delete(key(userId, bundle.courseId));
        removed.push(bundle.courseId);
      }
      return removed;
    },
    loadQuery: async (userId, queryKey) =>
      structuredClone(queries.get(key(userId, queryKey)) ?? null),
    listQueries: async (userId) =>
      [...queries.entries()]
        .filter(([queryKey]) => queryKey.startsWith(`${userId}:`))
        .map(([, query]) => structuredClone(query)),
    saveQuery: async (userId, queryKey, payload, updatedAt = Date.now()) => {
      queries.set(key(userId, queryKey), { queryKey, payload, updatedAt });
    },
    deleteQuery: async (userId, queryKey) => {
      queries.delete(key(userId, queryKey));
    },
    clearQueries: async (userId) => {
      for (const queryKey of [...queries.keys()]) {
        if (queryKey.startsWith(`${userId}:`)) queries.delete(queryKey);
      }
    },
    clearLocalData: async (userId) => {
      for (const map of [meta, indexes, bundles, queries]) {
        for (const mapKey of [...map.keys()]) {
          if (mapKey.startsWith(`${userId}:`)) map.delete(mapKey);
        }
      }
    },
    clearAllData: async () => {
      for (const map of [
        meta,
        indexes,
        bundles,
        queries,
        operations,
        noticeBaselines,
      ])
        map.clear();
      deadLetters.length = 0;
      notices.length = 0;
    },
    getOperation: async (userId, id) =>
      structuredClone(operations.get(key(userId, id))?.operation ?? null),
    putOperation: async (userId, operation) => {
      put(userId, operation);
    },
    splitOperation: async (userId, chunks) => {
      const [first, ...rest] = chunks;
      if (!first) return;
      const createdAt = operations.get(key(userId, first.id))?.createdAt;
      put(userId, first);
      for (const chunk of rest) put(userId, chunk, createdAt);
    },
    listOperations: async (userId) =>
      rowsFor(userId).map((row) => structuredClone(row.operation)),
    listOperationsByIdPrefix: async (userId, prefix) =>
      rowsFor(userId)
        .filter((row) => row.operation.id.startsWith(prefix))
        .map((row) => structuredClone(row.operation)),
    recordOperationFailures: async (userId, ids, failedAt) =>
      ids.flatMap((id) => {
        const row = operations.get(key(userId, id));
        if (!row) return [];
        row.failureCount += 1;
        row.firstFailedAt ??= failedAt;
        return [
          {
            id,
            failureCount: row.failureCount,
            firstFailedAt: row.firstFailedAt,
          },
        ];
      }),
    removeOperations: async (userId, ids) => {
      for (const id of ids) operations.delete(key(userId, id));
    },
    countOperations: async (userId) => rowsFor(userId).length,
    deadLetterOperations: async (userId, entries) => {
      for (const entry of entries) {
        operations.delete(key(userId, entry.operation.id));
        deadLetters.push({ userId, ...structuredClone(entry) });
      }
    },
    listDeadLetters: async (userId) => deadLettersFor(userId),
    countDeadLetters: async (userId) => deadLettersFor(userId).length,
    getLocalDataStats: async (userId) => {
      const owned = <T>(map: Map<string, T>) =>
        [...map.entries()]
          .filter(([mapKey]) => mapKey.startsWith(`${userId}:`))
          .map(([, value]) => value);
      const bundleRows = owned(bundles);
      const indexRows = owned(indexes);
      const queryRows = owned(queries);
      return {
        bundles: {
          count: bundleRows.length,
          bytes: bundleRows.reduce((sum, row) => sum + row.bytes, 0),
        },
        indexes: {
          count: indexRows.length,
          bytes: indexRows.reduce((sum, row) => sum + row.payload.length, 0),
        },
        queries: {
          count: queryRows.length,
          bytes: queryRows.reduce((sum, row) => sum + row.payload.length, 0),
        },
        operations: rowsFor(userId).length,
        deadLetters: deadLettersFor(userId).length,
      };
    },
    loadNoticeBaseline: async (userId, baselineKey) =>
      noticeBaselines.get(key(userId, baselineKey)) ?? null,
    recordNotices: async (userId, update, recordedAt = Date.now()) => {
      if (!update.notices.length && !update.baselines.length) return;
      writeNotices(userId, update, recordedAt);
    },
    listNotices: async (userId, now = Date.now()) =>
      notices
        .filter(
          (row) =>
            row.userId === userId &&
            row.dismissedAt === null &&
            row.notice.createdAt >= now - SYNC_NOTICE_MAX_AGE_MS,
        )
        .map((row) => structuredClone(row.notice))
        .reverse(),
    dismissNotices: async (userId, ids, dismissedAt = Date.now()) => {
      const dismissed = new Set(ids);
      for (const row of notices) {
        if (row.userId === userId && dismissed.has(row.notice.id))
          row.dismissedAt ??= dismissedAt;
      }
    },
  };
}
