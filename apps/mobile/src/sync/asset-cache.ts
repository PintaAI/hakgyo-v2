export type AssetFileStore = {
  getUri: (assetId: string) => Promise<string | null> | string | null;
  download: (assetId: string, download: AssetDownload) => Promise<string>;
};

export type AssetDownload = {
  downloadUrl: string;
  contentType?: string;
  fileName?: string;
};

export type AssetDownloadMap = Record<string, AssetDownload>;

export function createAssetCache(store: AssetFileStore) {
  const pending = new Map<string, Promise<string>>();

  async function resolve(
    assetId: string,
    getRemoteDownload: () => Promise<AssetDownload>,
  ): Promise<string> {
    const local = await store.getUri(assetId);
    if (local) return local;
    const active = pending.get(assetId);
    if (active) return active;

    const download = getRemoteDownload()
      .then((source) => store.download(assetId, source))
      .finally(() => pending.delete(assetId));
    pending.set(assetId, download);
    return download;
  }

  async function preload(downloads: AssetDownloadMap) {
    const entries = Object.entries(downloads);
    let next = 0;
    const workers = Array.from(
      { length: Math.min(4, entries.length) },
      async () => {
        while (next < entries.length) {
          const entry = entries[next++];
          if (!entry) return;
          const [assetId, download] = entry;
          try {
            await resolve(assetId, async () => download);
          } catch {
            // A failed prefetch remains available for an on-demand retry.
          }
        }
      },
    );
    await Promise.all(workers);
  }

  return { preload, resolve };
}
