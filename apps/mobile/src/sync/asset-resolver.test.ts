import { describe, expect, test } from "bun:test";

import { createAssetCache, type AssetFileStore } from "./asset-cache";
import {
  createAssetResolver,
  type AssetPrefetchProgress,
  type SignedAssetDownload,
} from "./asset-resolver";

function memoryFiles(stored: string[] = []): AssetFileStore {
  const files = new Map(stored.map((id) => [id, `file:///assets/${id}`]));
  return {
    getUri: (assetId) => files.get(assetId) ?? null,
    download: async (assetId) => {
      const uri = `file:///assets/${assetId}`;
      files.set(assetId, uri);
      return uri;
    },
  };
}

const signed = (assetId: string): SignedAssetDownload => ({
  downloadUrl: `https://assets.test/${assetId}`,
  expiresIn: 300,
  fileName: `${assetId}.mp3`,
  contentType: "audio/mpeg",
  size: 1,
});

describe("prefetchAssetsWithProgress", () => {
  test("downloads missing assets, counts stored ones and reports failures", async () => {
    const files = memoryFiles(["stored"]);
    const signedBatches: string[][] = [];
    const resolver = createAssetResolver({
      assetCache: createAssetCache(files),
      fileStore: files,
      batchDelayMs: 1,
      createDownloadUrls: async (assetIds) => {
        signedBatches.push(assetIds);
        return Object.fromEntries(
          assetIds.map((id) => [id, id === "gone" ? null : signed(id)]),
        );
      },
    });
    const updates: AssetPrefetchProgress[] = [];

    const result = await resolver.prefetchAssetsWithProgress(
      ["stored", "audio-1", "image-1", "gone", "audio-1"],
      (progress) => updates.push(progress),
    );

    expect(result).toEqual({ total: 4, ready: 3, failed: ["gone"] });
    expect(updates[0]).toEqual({ total: 4, ready: 1, failed: [] });
    expect(updates.at(-1)).toEqual(result);
    // Missing assets are signed together, never the stored one.
    expect(signedBatches.flat().sort()).toEqual(["audio-1", "gone", "image-1"]);
    expect(await files.getUri("audio-1")).toBe("file:///assets/audio-1");
    resolver.dispose();
  });
});
