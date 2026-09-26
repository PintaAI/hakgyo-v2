import { gzipSync } from "node:zlib";

import {
  BUNDLE_SCHEMA,
  bundleEtag,
  type CourseBundle,
  type SyncRevision,
} from "@hakgyo/shared/mobile-sync";

import { db } from "~/server/db";
import { buildCourseBundle } from "~/server/mobile/course-bundle";

export type CachedCourseBundle = {
  key: string;
  courseId: string;
  revision: SyncRevision;
  etag: string;
  /** gzip-compressed JSON of the bundle. */
  gzip: Buffer;
  /** Compressed size. */
  bytes: number;
  builtAt: number;
};

export type CourseBundleCacheOptions = {
  build: (courseId: string) => Promise<CourseBundle>;
  /** Cap on the sum of compressed bundle bytes (default 64 MiB). */
  maxBytes?: number;
  /**
   * A course is rebuilt at most this often (default 15s). Requests for a
   * newer revision inside the window get the last built bundle, with its
   * true (older) revision, so a burst of edits cannot stampede rebuilds.
   */
  minRebuildIntervalMs?: number;
  now?: () => number;
};

export const DEFAULT_MAX_BUNDLE_CACHE_BYTES = 64 * 1024 * 1024;
export const DEFAULT_MIN_REBUILD_INTERVAL_MS = 15_000;

export function bundleCacheKey(courseId: string, revision: SyncRevision) {
  return `${BUNDLE_SCHEMA}:${courseId}@${revision}`;
}

/**
 * In-process LRU of compressed course bundles keyed by schema, course and
 * revision. Concurrent requests for one key share a single build.
 */
export function createCourseBundleCache(options: CourseBundleCacheOptions) {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BUNDLE_CACHE_BYTES;
  const minRebuildIntervalMs =
    options.minRebuildIntervalMs ?? DEFAULT_MIN_REBUILD_INTERVAL_MS;
  const now = options.now ?? Date.now;

  // Insertion order is the LRU order: a hit re-inserts the entry.
  const entries = new Map<string, CachedCourseBundle>();
  const inflight = new Map<string, Promise<CachedCourseBundle>>();
  const latestByCourse = new Map<string, CachedCourseBundle>();
  // Requested key -> key of the entry that was actually built for it (the
  // build observed a newer revision). Resolved lazily; dropped on a miss.
  const aliases = new Map<string, string>();
  let totalBytes = 0;

  function touch(entry: CachedCourseBundle) {
    entries.delete(entry.key);
    entries.set(entry.key, entry);
    return entry;
  }

  function insert(entry: CachedCourseBundle) {
    const previous = entries.get(entry.key);
    if (previous) totalBytes -= previous.bytes;
    entries.delete(entry.key);
    entries.set(entry.key, entry);
    totalBytes += entry.bytes;
    latestByCourse.set(entry.courseId, entry);
    for (const [key, candidate] of entries) {
      if (totalBytes <= maxBytes) break;
      if (key === entry.key) continue;
      entries.delete(key);
      totalBytes -= candidate.bytes;
      if (latestByCourse.get(candidate.courseId) === candidate) {
        latestByCourse.delete(candidate.courseId);
      }
    }
  }

  async function build(courseId: string, key: string) {
    const bundle = await options.build(courseId);
    const gzip = gzipSync(Buffer.from(JSON.stringify(bundle)));
    const entry: CachedCourseBundle = {
      key: bundleCacheKey(courseId, bundle.revision),
      courseId,
      revision: bundle.revision,
      etag: bundleEtag(courseId, bundle.revision),
      gzip,
      bytes: gzip.byteLength,
      builtAt: now(),
    };
    insert(entry);
    // The build may have observed a newer revision than requested; the
    // requested key then also resolves to it until it is evicted.
    if (entry.key !== key) aliases.set(key, entry.key);
    return entry;
  }

  function lookup(key: string) {
    const direct = entries.get(key);
    if (direct) return direct;
    const alias = aliases.get(key);
    if (!alias) return undefined;
    const target = entries.get(alias);
    if (!target) aliases.delete(key);
    return target;
  }

  /**
   * The bundle for `courseId` at `revision`, or the most recently built one
   * of the course when it was built less than `minRebuildIntervalMs` ago.
   */
  function get(courseId: string, revision: SyncRevision) {
    const key = bundleCacheKey(courseId, revision);
    const cached = lookup(key);
    if (cached) return Promise.resolve(touch(cached));
    const pending = inflight.get(key);
    if (pending) return pending;
    const latest = latestByCourse.get(courseId);
    if (latest && now() - latest.builtAt < minRebuildIntervalMs) {
      return Promise.resolve(touch(latest));
    }
    const job = build(courseId, key).finally(() => inflight.delete(key));
    inflight.set(key, job);
    return job;
  }

  return {
    get,
    /** Testing and diagnostics. */
    stats: () => ({ entries: entries.size, bytes: totalBytes }),
    has: (courseId: string, revision: SyncRevision) =>
      lookup(bundleCacheKey(courseId, revision)) !== undefined,
    clear() {
      entries.clear();
      inflight.clear();
      aliases.clear();
      latestByCourse.clear();
      totalBytes = 0;
    },
  };
}

export type CourseBundleCache = ReturnType<typeof createCourseBundleCache>;

const globalForBundleCache = globalThis as unknown as {
  courseBundleCache: CourseBundleCache | undefined;
};

/** Process-wide cache used by the bundle route (survives dev reloads). */
export const courseBundleCache =
  globalForBundleCache.courseBundleCache ??
  createCourseBundleCache({
    build: (courseId) => buildCourseBundle(db, courseId),
  });

if (process.env.NODE_ENV !== "production") {
  globalForBundleCache.courseBundleCache = courseBundleCache;
}
