/**
 * Offline copies of assessment media (question images and audio) so a learner's attempt does not
 * depend on the connection once it has started. Files are downloaded ahead into Cache Storage,
 * keyed by asset id (signed URLs change on every signing), and served as object URLs. Media
 * blocks read through `cachedAssetUrl` before signing a download URL; while an asset is being
 * downloaded they wait for that download instead of fetching the file a second time, so they
 * never end up holding a network URL for media that is about to be stored.
 *
 * Browser-only. Without Cache Storage the downloads are kept in memory for the current page.
 */

const CACHE_NAME = "hakgyo-assessment-media-v1";
const CACHED_AT_HEADER = "x-hakgyo-cached-at";
/** Entries older than this are dropped the first time the cache is read in a session. */
const MAX_AGE_MS = 14 * 24 * 60 * 60_000;
const CONCURRENCY = 3;
const RETRIES = 2;

const objectUrls = new Map<string, string>();
/** Downloads in progress, registered synchronously when a preload starts. */
const inflight = new Map<string, Promise<string | null>>();
let index: Promise<Set<string>> | null = null;

function available() {
  return typeof window !== "undefined" && "caches" in window;
}

function cacheKey(assetId: string) {
  return `${window.location.origin}/__assessment-media/${encodeURIComponent(assetId)}`;
}

function assetIdFromKey(url: string) {
  const name = new URL(url).pathname.split("/").pop();
  return name ? decodeURIComponent(name) : null;
}

/** Ids stored in Cache Storage; expired entries are removed while building it. */
function cachedIds() {
  index ??= (async () => {
    const ids = new Set<string>();
    if (!available()) return ids;
    try {
      const cache = await caches.open(CACHE_NAME);
      const now = Date.now();
      for (const request of await cache.keys()) {
        const response = await cache.match(request);
        const cachedAt = Number(response?.headers.get(CACHED_AT_HEADER));
        const assetId = assetIdFromKey(request.url);
        if (
          !assetId ||
          !Number.isFinite(cachedAt) ||
          now - cachedAt > MAX_AGE_MS
        ) {
          await cache.delete(request);
        } else {
          ids.add(assetId);
        }
      }
    } catch {
      // Storage can be blocked (private mode, quota); media then loads from the network.
    }
    return ids;
  })();
  return index;
}

function remember(assetId: string, blob: Blob) {
  const existing = objectUrls.get(assetId);
  if (existing) return existing;
  const url = URL.createObjectURL(blob);
  objectUrls.set(assetId, url);
  return url;
}

/**
 * A local URL for a downloaded asset, or null when it has to come from the network. Waits for
 * a preload that is downloading the asset right now.
 */
export async function cachedAssetUrl(assetId: string): Promise<string | null> {
  const known = objectUrls.get(assetId);
  if (known) return known;
  const pending = inflight.get(assetId);
  if (pending) return pending;
  return readStored(assetId);
}

async function readStored(assetId: string): Promise<string | null> {
  const known = objectUrls.get(assetId);
  if (known) return known;
  if (!available() || !(await cachedIds()).has(assetId)) return null;
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(cacheKey(assetId));
    return response ? remember(assetId, await response.blob()) : null;
  } catch {
    return null;
  }
}

async function download(
  assetId: string,
  sign: (assetId: string) => Promise<string>,
) {
  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRIES; attempt += 1) {
    try {
      const response = await fetch(await sign(assetId));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      try {
        // Without Cache Storage the copy only lives in memory for this page.
        if (!available()) throw new Error("Cache Storage unavailable");
        const cache = await caches.open(CACHE_NAME);
        await cache.put(
          cacheKey(assetId),
          new Response(blob, {
            headers: {
              "content-type": blob.type || "application/octet-stream",
              [CACHED_AT_HEADER]: String(Date.now()),
            },
          }),
        );
        (await cachedIds()).add(assetId);
      } catch {
        // Quota exceeded: keep the in-memory copy for this session.
      }
      remember(assetId, blob);
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
    }
  }
  throw lastError;
}

export type MediaPreloadProgress = {
  total: number;
  ready: number;
  failed: string[];
};

/**
 * Downloads every asset not stored yet, a few at a time, reporting progress after each file.
 * Failed assets are reported, never thrown; the media blocks fall back to the network for them.
 *
 * The downloads are registered before the first `await`, so media blocks whose URL lookups run
 * after this call (see `useAssessmentMediaPreload`, which starts it in a layout effect) wait for
 * the local copy.
 */
export async function preloadAssessmentMedia(
  assetIds: readonly string[],
  sign: (assetId: string) => Promise<string>,
  onProgress?: (progress: MediaPreloadProgress) => void,
): Promise<MediaPreloadProgress> {
  const ids = [...new Set(assetIds)];
  const progress: MediaPreloadProgress = {
    total: ids.length,
    ready: 0,
    failed: [],
  };
  if (ids.length === 0) return progress;
  // Claim every asset this call will settle, synchronously.
  const settle = new Map<string, (url: string | null) => void>();
  const claims = new Map<string, Promise<string | null>>();
  const waitFor = new Map<string, Promise<string | null>>();
  for (const assetId of ids) {
    if (objectUrls.has(assetId)) continue;
    const pending = inflight.get(assetId);
    if (pending) {
      waitFor.set(assetId, pending);
      continue;
    }
    const claimed = new Promise<string | null>((resolve) => {
      settle.set(assetId, resolve);
    });
    inflight.set(assetId, claimed);
    claims.set(assetId, claimed);
  }
  const finish = (assetId: string, url: string | null) => {
    settle.get(assetId)?.(url);
    if (inflight.get(assetId) === claims.get(assetId)) inflight.delete(assetId);
  };
  const report = () =>
    onProgress?.({ ...progress, failed: [...progress.failed] });
  const missing: string[] = [];
  try {
    const stored = await cachedIds();
    for (const assetId of ids) {
      if (objectUrls.has(assetId) && !settle.has(assetId)) {
        progress.ready += 1;
      } else if (waitFor.has(assetId)) {
        missing.push(assetId);
      } else if (stored.has(assetId)) {
        progress.ready += 1;
        finish(assetId, await readStored(assetId));
      } else {
        missing.push(assetId);
      }
    }
    report();
    let next = 0;
    await Promise.all(
      Array.from(
        { length: Math.min(CONCURRENCY, missing.length) },
        async () => {
          while (next < missing.length) {
            const assetId = missing[next++]!;
            const other = waitFor.get(assetId);
            if (other) {
              // Another preload is downloading it.
              if (await other) progress.ready += 1;
              else progress.failed.push(assetId);
            } else {
              try {
                await download(assetId, sign);
                progress.ready += 1;
                finish(assetId, objectUrls.get(assetId) ?? null);
              } catch {
                progress.failed.push(assetId);
                finish(assetId, null);
              }
            }
            report();
          }
        },
      ),
    );
  } finally {
    // Never leave a media block waiting, whatever happened above.
    for (const assetId of settle.keys()) {
      finish(assetId, objectUrls.get(assetId) ?? null);
    }
  }
  return { ...progress, failed: [...progress.failed] };
}
