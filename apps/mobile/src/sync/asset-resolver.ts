import {
  composeCourseOutline,
  lessonAssetIds,
  nextCourseItemId,
  type CourseBundle,
  type LearnerState,
} from "@hakgyo/shared/mobile-sync";

import type {
  AssetDownload,
  AssetDownloadMap,
  AssetFileStore,
  createAssetCache,
} from "./asset-cache";

/** Ids collected for this long before one `createDownloadUrls` call is made. */
export const ASSET_URL_BATCH_DELAY_MS = 30;
/** Server limit (`storage.createDownloadUrls`). */
export const ASSET_URL_BATCH_SIZE = 100;
/** A signed URL is reused until this long before it expires. */
export const ASSET_URL_SAFETY_MARGIN_MS = 30_000;

export type SignedAssetDownload = {
  downloadUrl: string;
  expiresIn: number;
  fileName: string;
  contentType: string;
  size: number;
};

export type CreateDownloadUrls = (
  assetIds: string[],
) => Promise<Record<string, SignedAssetDownload | null>>;

export type AssetResolverOptions = {
  assetCache: ReturnType<typeof createAssetCache>;
  createDownloadUrls: CreateDownloadUrls;
  /** Lets prefetches skip signing URLs for files already on the device. */
  fileStore?: Pick<AssetFileStore, "getUri">;
  /** Local bundle lookup for lesson prefetches (null when not downloaded). */
  loadBundle?: (courseId: string) => Promise<CourseBundle | null>;
  /** Learner state for a course (drives which next lesson is unlocked). */
  loadLearnerState?: (courseId: string) => Promise<LearnerState | null>;
  batchDelayMs?: number;
  batchSize?: number;
  now?: () => number;
};

type Waiter = {
  resolve: (download: AssetDownload) => void;
  reject: (error: unknown) => void;
};

export class AssetUnavailableError extends Error {
  constructor(public readonly assetId: string) {
    super(`Asset ${assetId} is not available`);
    this.name = "AssetUnavailableError";
  }
}

export function createAssetResolver(options: AssetResolverOptions) {
  const {
    assetCache,
    createDownloadUrls,
    fileStore,
    batchDelayMs = ASSET_URL_BATCH_DELAY_MS,
    batchSize = ASSET_URL_BATCH_SIZE,
    now = Date.now,
  } = options;
  const urlCache = new Map<
    string,
    { download: SignedAssetDownload; expiresAt: number }
  >();
  const waiting = new Map<string, Waiter[]>();
  let timer: ReturnType<typeof setTimeout> | undefined;

  function cached(assetId: string) {
    const entry = urlCache.get(assetId);
    if (!entry) return null;
    if (entry.expiresAt <= now()) {
      urlCache.delete(assetId);
      return null;
    }
    return entry.download;
  }

  async function flush() {
    timer = undefined;
    const ids = [...waiting.keys()].slice(0, batchSize);
    if (!ids.length) return;
    const waiters = ids.map((id) => {
      const list = waiting.get(id) ?? [];
      waiting.delete(id);
      return [id, list] as const;
    });
    if (waiting.size) schedule();
    try {
      const signed = await createDownloadUrls(ids);
      const signedAt = now();
      for (const [assetId, list] of waiters) {
        const download = signed[assetId];
        if (!download) {
          const error = new AssetUnavailableError(assetId);
          for (const waiter of list) waiter.reject(error);
          continue;
        }
        urlCache.set(assetId, {
          download,
          expiresAt:
            signedAt + download.expiresIn * 1000 - ASSET_URL_SAFETY_MARGIN_MS,
        });
        for (const waiter of list) waiter.resolve(download);
      }
    } catch (error) {
      for (const [, list] of waiters) {
        for (const waiter of list) waiter.reject(error);
      }
    }
  }

  function schedule() {
    if (timer) return;
    timer = setTimeout(() => void flush(), batchDelayMs);
  }

  function getDownload(assetId: string): Promise<AssetDownload> {
    const hit = cached(assetId);
    if (hit) return Promise.resolve(hit);
    return new Promise<AssetDownload>((resolve, reject) => {
      const list = waiting.get(assetId);
      if (list) list.push({ resolve, reject });
      else waiting.set(assetId, [{ resolve, reject }]);
      if (waiting.size >= batchSize) {
        if (timer) clearTimeout(timer);
        timer = undefined;
        void flush();
      } else {
        schedule();
      }
    });
  }

  /** Local file URI for an asset, downloading it through a batched signed URL when missing. */
  function resolveAssetUrl(assetId: string) {
    return assetCache.resolve(assetId, () => getDownload(assetId));
  }

  async function prefetchAssets(assetIds: string[]) {
    const missing: string[] = [];
    for (const assetId of new Set(assetIds)) {
      if (fileStore && (await fileStore.getUri(assetId))) continue;
      missing.push(assetId);
    }
    if (!missing.length) return;
    const downloads: AssetDownloadMap = {};
    await Promise.all(
      missing.map(async (assetId) => {
        try {
          downloads[assetId] = await getDownload(assetId);
        } catch {
          // Unsignable assets are skipped; the screen retries on demand.
        }
      }),
    );
    if (Object.keys(downloads).length) await assetCache.preload(downloads);
  }

  /** Downloads every asset a lesson renders (material, referenced PDF pages, vocabulary media). */
  async function prefetchLesson(courseId: string, courseItemId: string) {
    const bundle = await options.loadBundle?.(courseId);
    if (!bundle) return;
    await prefetchAssets(lessonAssetIds(bundle, courseItemId));
  }

  /** Prefetches the next unlocked lesson after `courseItemId` in module order. */
  async function prefetchNextLesson(courseId: string, courseItemId: string) {
    const bundle = await options.loadBundle?.(courseId);
    if (!bundle) return;
    const state = (await options.loadLearnerState?.(courseId)) ?? undefined;
    const outline = composeCourseOutline(bundle, state);
    const nextId = nextCourseItemId(outline, courseItemId);
    if (!nextId) return;
    await prefetchAssets(lessonAssetIds(bundle, nextId));
  }

  function dispose() {
    if (timer) clearTimeout(timer);
    timer = undefined;
    const error = new Error("Asset resolver disposed");
    for (const [, list] of waiting) {
      for (const waiter of list) waiter.reject(error);
    }
    waiting.clear();
    urlCache.clear();
  }

  return {
    resolveAssetUrl,
    getDownload,
    prefetchAssets,
    prefetchLesson,
    prefetchNextLesson,
    dispose,
  };
}

export type AssetResolver = ReturnType<typeof createAssetResolver>;
