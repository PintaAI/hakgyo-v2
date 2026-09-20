import { describe, expect, test } from "bun:test";

import { createAssetCache, type AssetFileStore } from "./asset-cache";

function memoryFiles(): AssetFileStore {
  const files = new Map<string, string>();
  return {
    getUri: (assetId) => files.get(assetId) ?? null,
    download: async (assetId) => {
      const uri = `file:///assets/${assetId}`;
      files.set(assetId, uri);
      return uri;
    },
  };
}

describe("asset cache", () => {
  test("coalesces concurrent downloads and survives cache recreation", async () => {
    const files = memoryFiles();
    let remoteCalls = 0;
    const resolveRemote = async () => {
      remoteCalls += 1;
      return { downloadUrl: "https://assets.test/signed" };
    };
    const first = createAssetCache(files);

    const [a, b] = await Promise.all([
      first.resolve("asset-1", resolveRemote),
      first.resolve("asset-1", resolveRemote),
    ]);
    const second = createAssetCache(files);
    const c = await second.resolve("asset-1", resolveRemote);

    expect([a, b, c]).toEqual([
      "file:///assets/asset-1",
      "file:///assets/asset-1",
      "file:///assets/asset-1",
    ]);
    expect(remoteCalls).toBe(1);
  });

  test("preloads each dashboard asset once", async () => {
    const files = memoryFiles();
    const downloaded: string[] = [];
    const cache = createAssetCache({
      ...files,
      download: async (assetId, download) => {
        downloaded.push(`${assetId}:${download.downloadUrl}`);
        return files.download(assetId, download);
      },
    });

    await cache.preload({
      "asset-1": { downloadUrl: "https://assets.test/1" },
      "asset-2": { downloadUrl: "https://assets.test/2" },
    });

    expect(downloaded.sort()).toEqual([
      "asset-1:https://assets.test/1",
      "asset-2:https://assets.test/2",
    ]);
  });
});
