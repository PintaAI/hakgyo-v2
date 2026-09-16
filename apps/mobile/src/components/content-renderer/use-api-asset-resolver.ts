import { useCallback, useRef } from "react";

import { api } from "../../lib/trpc";
import type { AssetUrlResolver } from "./types";

type CachedUrl = {
  expiresAt: number;
  url: string;
};

type CachedAsset = CachedUrl | { pending: Promise<CachedUrl> };

export function useApiAssetResolver(): AssetUrlResolver {
  const utils = api.useUtils();
  const cache = useRef(new Map<string, CachedAsset>());

  return useCallback(
    async (assetId: string) => {
      const cached = cache.current.get(assetId);
      if (cached && "pending" in cached) return (await cached.pending).url;
      if (cached && cached.expiresAt > Date.now()) return cached.url;

      const pending = utils.client.storage.createDownloadUrl
        .mutate({
          assetId,
          disposition: "inline",
        })
        .then((result) => ({
          url: result.downloadUrl,
          expiresAt: Date.now() + Math.max(0, result.expiresIn - 60) * 1_000,
        }));
      cache.current.set(assetId, { pending });
      try {
        const resolved = await pending;
        cache.current.set(assetId, resolved);
        return resolved.url;
      } catch (error) {
        // A transient failure should be retryable on the next card render.
        const current = cache.current.get(assetId);
        if (current && "pending" in current && current.pending === pending)
          cache.current.delete(assetId);
        throw error;
      }
    },
    [utils.client.storage.createDownloadUrl],
  );
}
