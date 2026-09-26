import type { QueryClient } from "@tanstack/react-query";
import {
  BUNDLE_SCHEMA,
  bundleEtag,
  CLIENT_HEADER,
  formatClientHeader,
  SYNC_PROTOCOL,
  type BundleContent,
  type BundleStructure,
  type CourseBundle,
} from "@hakgyo/shared/mobile-sync";

import type { LocalBundleRecord } from "./local-data";
import { syncQueryKeys } from "./query-keys";
import type { MobileSyncStore, StoredBundleMeta } from "./store";
import type {
  BundleFetchInput,
  BundleFetchResult,
  BundleSyncProgress,
  MobileSyncTransport,
  UpgradeRequired,
} from "./types";

/** Parallel bundle downloads. */
export const BUNDLE_CONCURRENCY = 2;
/** Background (not currently opened) courses start after a random delay. */
export const BUNDLE_BACKGROUND_JITTER_MS = 30_000;
/** Attempts per enqueue before a course is reported failed (re-queued by the next refresh). */
export const BUNDLE_MAX_ATTEMPTS = 5;
export const BUNDLE_BACKOFF_BASE_MS = 2_000;
export const BUNDLE_BACKOFF_MAX_MS = 5 * 60_000;

export type BundlePriority = "requested" | "background";

export type BundleSyncRequest = {
  courseId: string;
  priority?: BundlePriority;
};

export type BundleSyncOptions = {
  userId: string;
  store: MobileSyncStore;
  queryClient: QueryClient;
  fetchBundle: MobileSyncTransport["fetchBundle"];
  concurrency?: number;
  backgroundJitterMs?: number;
  maxAttempts?: number;
  backoffBaseMs?: number;
  random?: () => number;
  now?: () => number;
  onProgress?: (progress: BundleSyncProgress) => void;
  onUpgradeRequired?: (upgrade: UpgradeRequired) => void;
};

type Job = {
  courseId: string;
  priority: 0 | 1;
  readyAt: number;
  attempts: number;
  running: boolean;
};

function bundleRecord<T>(
  meta: StoredBundleMeta,
  data: T,
): LocalBundleRecord<T> {
  return {
    courseId: meta.courseId,
    revision: meta.revision,
    schema: meta.schema,
    updatedAt: meta.updatedAt,
    data,
  };
}

export function createBundleSync(options: BundleSyncOptions) {
  const {
    userId,
    store,
    queryClient,
    fetchBundle,
    concurrency = BUNDLE_CONCURRENCY,
    backgroundJitterMs = BUNDLE_BACKGROUND_JITTER_MS,
    maxAttempts = BUNDLE_MAX_ATTEMPTS,
    backoffBaseMs = BUNDLE_BACKOFF_BASE_MS,
    random = Math.random,
    now = Date.now,
  } = options;
  const jobs = new Map<string, Job>();
  const metaByCourse = new Map<string, StoredBundleMeta>();
  const itemCourseMap = new Map<string, string>();
  const idleWaiters: Array<() => void> = [];
  let running = 0;
  let completed = 0;
  let failed = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;
  let stopped = false;

  function progress(): BundleSyncProgress {
    return {
      pending: jobs.size,
      completed,
      failed,
      activeCourseIds: [...jobs.values()]
        .filter((job) => job.running)
        .map((job) => job.courseId),
    };
  }

  function publishProgress() {
    options.onProgress?.(progress());
  }

  function publishItemCourseMap() {
    queryClient.setQueryData(
      syncQueryKeys.itemCourseMap(),
      Object.fromEntries(itemCourseMap),
    );
  }

  function indexStructure(courseId: string, structure: BundleStructure) {
    for (const [itemId, mapped] of itemCourseMap) {
      if (mapped === courseId) itemCourseMap.delete(itemId);
    }
    for (const module of structure.modules) {
      for (const item of module.items) itemCourseMap.set(item.id, courseId);
    }
  }

  /** Seeds the metadata and item map from SQLite (called once by the engine). */
  async function load() {
    const structures = await store.listBundleStructures(userId);
    metaByCourse.clear();
    itemCourseMap.clear();
    for (const { data, ...meta } of structures) {
      metaByCourse.set(meta.courseId, meta);
      indexStructure(meta.courseId, data);
    }
    publishItemCourseMap();
  }

  function forget(courseIds: string[]) {
    for (const courseId of courseIds) {
      metaByCourse.delete(courseId);
      const job = jobs.get(courseId);
      if (job && !job.running) jobs.delete(courseId);
      for (const [itemId, mapped] of itemCourseMap) {
        if (mapped === courseId) itemCourseMap.delete(itemId);
      }
      queryClient.removeQueries({
        queryKey: syncQueryKeys.bundleStructure(courseId),
      });
      queryClient.removeQueries({
        queryKey: syncQueryKeys.bundleContent(courseId),
      });
    }
    publishItemCourseMap();
    publishProgress();
    settleIdle();
  }

  function settleIdle() {
    if (jobs.size) return;
    completed = 0;
    failed = 0;
    while (idleWaiters.length) idleWaiters.shift()?.();
  }

  function whenIdle() {
    if (!jobs.size) return Promise.resolve();
    return new Promise<void>((resolve) => idleWaiters.push(resolve));
  }

  function publishBundle(
    meta: StoredBundleMeta,
    bundle: Pick<CourseBundle, "structure" | "content">,
  ) {
    queryClient.setQueryData(
      syncQueryKeys.bundleStructure(meta.courseId),
      bundleRecord(meta, bundle.structure),
    );
    const contentKey = syncQueryKeys.bundleContent(meta.courseId);
    const contentQuery = queryClient.getQueryCache().find({
      queryKey: contentKey,
    });
    if (
      contentQuery &&
      (contentQuery.getObserversCount() > 0 ||
        contentQuery.state.data !== undefined)
    ) {
      queryClient.setQueryData(
        contentKey,
        bundleRecord<BundleContent>(meta, bundle.content),
      );
    } else {
      void queryClient.invalidateQueries({ queryKey: contentKey });
    }
  }

  async function applyResult(job: Job, result: BundleFetchResult) {
    if (result.status === "upgrade-required") {
      stopped = true;
      for (const [courseId, pending] of jobs) {
        if (!pending.running) jobs.delete(courseId);
      }
      options.onUpgradeRequired?.({ minProtocol: result.minProtocol });
      return;
    }
    const checkedAt = now();
    if (result.status === "not-modified") {
      const meta = metaByCourse.get(job.courseId);
      if (meta) {
        await store.touchBundleChecked(userId, job.courseId, checkedAt);
        metaByCourse.set(job.courseId, { ...meta, updatedAt: checkedAt });
      }
      return;
    }
    const { bundle } = result;
    if (bundle.schema !== BUNDLE_SCHEMA) {
      // A bundle this client cannot compose; the app needs an update.
      throw new BundleSchemaError(bundle.schema);
    }
    const structure = JSON.stringify(bundle.structure);
    const content = JSON.stringify(bundle.content);
    const meta: StoredBundleMeta = {
      courseId: job.courseId,
      revision: result.revision,
      schema: bundle.schema,
      etag: result.etag,
      bytes: structure.length + content.length,
      updatedAt: checkedAt,
      openedAt: metaByCourse.get(job.courseId)?.openedAt ?? null,
    };
    await store.saveBundle(userId, {
      courseId: job.courseId,
      revision: result.revision,
      schema: bundle.schema,
      etag: result.etag,
      structure: bundle.structure,
      content: bundle.content,
      bytes: meta.bytes,
      updatedAt: checkedAt,
    });
    metaByCourse.set(job.courseId, meta);
    indexStructure(job.courseId, bundle.structure);
    publishBundle(meta, bundle);
    publishItemCourseMap();
  }

  async function run(job: Job) {
    job.running = true;
    running += 1;
    publishProgress();
    try {
      const meta = metaByCourse.get(job.courseId);
      const input: BundleFetchInput = {
        courseId: job.courseId,
        etag:
          meta && meta.schema === BUNDLE_SCHEMA
            ? (meta.etag ?? bundleEtag(job.courseId, meta.revision))
            : null,
      };
      const result = await fetchBundle(input);
      await applyResult(job, result);
      jobs.delete(job.courseId);
      if (result.status !== "upgrade-required") completed += 1;
    } catch (error) {
      job.attempts += 1;
      if (error instanceof BundleSchemaError || job.attempts >= maxAttempts) {
        jobs.delete(job.courseId);
        failed += 1;
      } else {
        const backoff = Math.min(
          backoffBaseMs * 2 ** (job.attempts - 1),
          BUNDLE_BACKOFF_MAX_MS,
        );
        job.readyAt = now() + backoff + random() * backoff * 0.25;
      }
    } finally {
      job.running = false;
      running -= 1;
      publishProgress();
      settleIdle();
      pump();
    }
  }

  function pump() {
    if (disposed || stopped) return;
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }
    const current = now();
    const waiting = [...jobs.values()]
      .filter((job) => !job.running)
      .sort(
        (left, right) =>
          left.priority - right.priority || left.readyAt - right.readyAt,
      );
    for (const job of waiting) {
      if (running >= concurrency) break;
      if (job.readyAt > current) continue;
      void run(job);
    }
    const next = waiting.find((job) => !job.running && job.readyAt > current);
    if (next && running < concurrency) {
      timer = setTimeout(pump, Math.max(0, next.readyAt - current));
    }
  }

  function enqueue(requests: BundleSyncRequest[]) {
    if (disposed) return;
    stopped = false;
    const current = now();
    for (const request of requests) {
      const priority = request.priority === "requested" ? 0 : 1;
      const existing = jobs.get(request.courseId);
      if (existing) {
        if (priority < existing.priority) {
          existing.priority = priority;
          existing.readyAt = Math.min(existing.readyAt, current);
        }
        continue;
      }
      jobs.set(request.courseId, {
        courseId: request.courseId,
        priority,
        readyAt:
          priority === 0 ? current : current + random() * backgroundJitterMs,
        attempts: 0,
        running: false,
      });
    }
    publishProgress();
    pump();
  }

  function requestBundle(courseId: string) {
    enqueue([{ courseId, priority: "requested" }]);
  }

  function dispose() {
    disposed = true;
    if (timer) clearTimeout(timer);
    timer = undefined;
    for (const [courseId, job] of jobs) if (!job.running) jobs.delete(courseId);
    settleIdle();
  }

  return {
    load,
    enqueue,
    requestBundle,
    forget,
    whenIdle,
    dispose,
    progress,
    /** Metadata of every stored bundle (revision, schema, timestamps). */
    stored: () => [...metaByCourse.values()],
    courseIdForItem: (courseItemId: string) =>
      itemCourseMap.get(courseItemId) ?? null,
    isStopped: () => stopped,
  };
}

export type BundleSync = ReturnType<typeof createBundleSync>;

export class BundleSchemaError extends Error {
  constructor(public readonly schema: number) {
    super(`Unsupported bundle schema ${schema}`);
    this.name = "BundleSchemaError";
  }
}

// ---------------------------------------------------------------------------
// HTTP fetcher: GET /api/mobile/v2/courses/:courseId/bundle
// ---------------------------------------------------------------------------

export type BundleFetcherOptions = {
  apiUrl: string;
  getCookie: () =>
    Promise<string | null | undefined> | string | null | undefined;
  runtime?: string | null;
  update?: string | null;
  fetch?: typeof fetch;
};

export class BundleFetchError extends Error {
  constructor(
    public readonly status: number,
    message?: string,
  ) {
    super(message ?? `Bundle request failed with status ${status}`);
    this.name = "BundleFetchError";
  }
}

export function createBundleFetcher(
  options: BundleFetcherOptions,
): MobileSyncTransport["fetchBundle"] {
  const doFetch = options.fetch ?? fetch;
  const clientHeader = formatClientHeader({
    protocol: SYNC_PROTOCOL,
    runtime: options.runtime,
    update: options.update,
  });
  return async ({ courseId, etag }) => {
    const cookie = await options.getCookie();
    const response = await doFetch(
      `${options.apiUrl}/api/mobile/v2/courses/${encodeURIComponent(courseId)}/bundle`,
      {
        method: "GET",
        credentials: "omit",
        headers: {
          // No explicit accept-encoding: the native stacks (OkHttp, NSURLSession)
          // add gzip themselves and only then decompress transparently; on
          // Android a manual header leaves the body compressed.
          accept: "application/json",
          [CLIENT_HEADER]: clientHeader,
          ...(cookie ? { cookie } : {}),
          ...(etag ? { "if-none-match": etag } : {}),
        },
      },
    );
    if (response.status === 304) return { status: "not-modified" };
    if (response.status === 426) {
      const body = (await response.json().catch(() => null)) as {
        upgradeRequired?: { minProtocol?: number };
      } | null;
      return {
        status: "upgrade-required",
        minProtocol: body?.upgradeRequired?.minProtocol ?? SYNC_PROTOCOL + 1,
      };
    }
    if (!response.ok) throw new BundleFetchError(response.status);
    const bundle = (await response.json()) as CourseBundle;
    return {
      status: "ok",
      bundle,
      etag: response.headers.get("etag"),
      revision: response.headers.get("x-bundle-revision") ?? bundle.revision,
    };
  };
}
