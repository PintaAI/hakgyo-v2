import { describe, expect, mock, test } from "bun:test";
import { gunzipSync } from "node:zlib";

import { BUNDLE_SCHEMA, type CourseBundle } from "@hakgyo/shared/mobile-sync";

import { bundleCacheKey, createCourseBundleCache } from "./course-bundle-cache";

function bundle(courseId: string, revision: string, padding = 0): CourseBundle {
  return {
    schema: BUNDLE_SCHEMA,
    courseId,
    organizationId: "org",
    revision,
    structure: {
      title: courseId,
      // Random text defeats gzip so the byte cap is meaningful.
      description: padding
        ? Array.from({ length: padding }, () =>
            Math.random().toString(36).slice(2),
          ).join("")
        : null,
      thumbnailUrl: null,
      status: "PUBLISHED",
      progressionMode: "OPEN",
      modules: [],
    },
    content: {
      placements: {},
      materials: {},
      vocabularySets: {},
      assessments: {},
      pdfBooks: {},
      assets: {},
    },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => (resolve = done));
  return { promise, resolve };
}

describe("createCourseBundleCache", () => {
  test("keys entries by schema, course and revision", async () => {
    const build = mock((courseId: string) =>
      Promise.resolve(bundle(courseId, "3")),
    );
    const cache = createCourseBundleCache({ build });
    const entry = await cache.get("course", "3");
    expect(entry.key).toBe(`${BUNDLE_SCHEMA}:course@3`);
    expect(bundleCacheKey("course", "3")).toBe(entry.key);
    expect(entry.etag).toBe(`"${BUNDLE_SCHEMA}:course@3"`);
    expect(JSON.parse(gunzipSync(entry.gzip).toString())).toMatchObject({
      courseId: "course",
      revision: "3",
    });
    await cache.get("course", "3");
    expect(build).toHaveBeenCalledTimes(1);
  });

  test("shares one build between concurrent requests for a key", async () => {
    const pending = deferred<CourseBundle>();
    const build = mock(() => pending.promise);
    const cache = createCourseBundleCache({ build });
    const first = cache.get("course", "1");
    const second = cache.get("course", "1");
    expect(build).toHaveBeenCalledTimes(1);
    pending.resolve(bundle("course", "1"));
    const [a, b] = await Promise.all([first, second]);
    expect(a).toBe(b);
  });

  test("serves the last build with its true revision inside the rebuild window", async () => {
    let clock = 1_000;
    const build = mock((courseId: string, revision?: string) =>
      Promise.resolve(bundle(courseId, revision ?? "1")),
    );
    const cache = createCourseBundleCache({
      build: (courseId: string) => build(courseId),
      minRebuildIntervalMs: 15_000,
      now: () => clock,
    });
    const first = await cache.get("course", "1");
    clock += 5_000;
    const reused = await cache.get("course", "2");
    expect(reused).toBe(first);
    expect(reused.revision).toBe("1");
    expect(build).toHaveBeenCalledTimes(1);
    clock += 15_000;
    const rebuilt = await cache.get("course", "2");
    expect(build).toHaveBeenCalledTimes(2);
    expect(rebuilt).not.toBe(first);
  });

  test("resolves the requested revision to a build that observed a newer one", async () => {
    const cache = createCourseBundleCache({
      build: (courseId) => Promise.resolve(bundle(courseId, "9")),
      minRebuildIntervalMs: 0,
    });
    const entry = await cache.get("course", "8");
    expect(entry.revision).toBe("9");
    expect(cache.has("course", "8")).toBe(true);
    expect(cache.has("course", "9")).toBe(true);
    expect(cache.stats().entries).toBe(1);
  });

  test("evicts least recently used entries beyond the byte cap", async () => {
    const cache = createCourseBundleCache({
      build: (courseId) => Promise.resolve(bundle(courseId, "1", 400)),
      maxBytes: 8_000,
      minRebuildIntervalMs: 0,
    });
    const a = await cache.get("a", "1");
    // Two entries fit under the cap, three do not.
    expect(a.bytes).toBeGreaterThan(2_800);
    expect(a.bytes).toBeLessThan(4_000);
    await cache.get("b", "1");
    // Touch "a" so "b" is the least recently used.
    await cache.get("a", "1");
    await cache.get("c", "1");
    expect(cache.stats().bytes).toBeLessThanOrEqual(8_000);
    expect(cache.has("a", "1")).toBe(true);
    expect(cache.has("b", "1")).toBe(false);
    expect(cache.has("c", "1")).toBe(true);
  });
});
