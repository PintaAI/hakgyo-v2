import { useCallback, useRef } from "react";

import { api } from "../../lib/trpc";
import type { AssetUrlResolver } from "./types";

type CachedUrl = {
  expiresAt: number;
  url: string;
};

export function useApiAssetResolver(): AssetUrlResolver {
  const utils = api.useUtils();
  const cache = useRef(new Map<string, CachedUrl>());

  return useCallback(
    async (assetId: string) => {
      const cached = cache.current.get(assetId);
      if (cached && cached.expiresAt > Date.now()) return cached.url;

      const result = await utils.client.storage.createDownloadUrl.mutate({
        assetId,
        disposition: "inline",
      });
      cache.current.set(assetId, {
        url: result.downloadUrl,
        expiresAt: Date.now() + Math.max(0, result.expiresIn - 60) * 1_000,
      });
      return result.downloadUrl;
    },
    [utils.client.storage.createDownloadUrl],
  );
}
