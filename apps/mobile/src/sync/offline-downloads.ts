import type { AssetPrefetchProgress } from "./asset-resolver";

export type OfflineDownloadState = AssetPrefetchProgress & {
  running: boolean;
};

type Prefetch = (
  assetIds: readonly string[],
  onProgress: (progress: AssetPrefetchProgress) => void,
) => Promise<AssetPrefetchProgress | null>;

/**
 * Downloads started from the learn screens ("Simpan offline" for a course or chapter), keyed by
 * what they cover. They keep running when the learner leaves the screen, and any screen can
 * read their progress. `revision` changes whenever files land on the device, so offline badges
 * can re-check what is stored.
 */
export function createOfflineDownloads() {
  const states = new Map<string, OfflineDownloadState>();
  const listeners = new Set<() => void>();
  let revision = 0;

  function emit() {
    revision += 1;
    for (const listener of listeners) listener();
  }

  function set(key: string, state: OfflineDownloadState) {
    states.set(key, state);
    emit();
  }

  /** Starts the download unless one for `key` is running; resolves when it settles. */
  async function start(
    key: string,
    assetIds: readonly string[],
    prefetch: Prefetch,
  ) {
    if (states.get(key)?.running) return states.get(key);
    const ids = [...new Set(assetIds)];
    set(key, {
      total: ids.length,
      ready: 0,
      readyIds: [],
      failed: [],
      running: true,
    });
    try {
      const result = await prefetch(ids, (progress) =>
        set(key, { ...progress, running: true }),
      );
      const final = result ?? states.get(key)!;
      set(key, { ...final, running: false });
    } catch {
      const current = states.get(key)!;
      set(key, { ...current, running: false });
    }
    return states.get(key);
  }

  return {
    start,
    get: (key: string) => states.get(key),
    getRevision: () => revision,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export type OfflineDownloads = ReturnType<typeof createOfflineDownloads>;
