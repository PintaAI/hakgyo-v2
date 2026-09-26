"use client";

import { useEffect, useState } from "react";

import { api } from "~/trpc/react";

type StorageClient = ReturnType<typeof api.useUtils>["client"];

// storage.createDownloadUrls signs URLs for five minutes. Reuse them for two so
// a cached URL keeps at least three minutes of validity, e.g. for `<audio
// preload="none">` that only requests the file once the user presses play.
const CACHE_MS = 2 * 60 * 1000;
// Collects the requests of every media block mounted in the same render.
const BATCH_DELAY_MS = 10;
// Matches the server's per-request limit.
const MAX_BATCH_SIZE = 100;

type Pending = {
  resolve: (url: string) => void;
  reject: (error: unknown) => void;
};

const cache = new Map<string, { url: Promise<string>; expiresAt: number }>();
let queue = new Map<string, Pending[]>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function flush(client: StorageClient) {
  const batch = queue;
  queue = new Map();
  flushTimer = null;
  const assetIds = [...batch.keys()];

  for (let index = 0; index < assetIds.length; index += MAX_BATCH_SIZE) {
    const chunk = assetIds.slice(index, index + MAX_BATCH_SIZE);
    client.storage.createDownloadUrls
      .mutate({ assetIds: chunk, disposition: "inline" })
      .then((urls) => {
        for (const assetId of chunk) {
          const url = urls[assetId]?.downloadUrl;
          for (const pending of batch.get(assetId) ?? []) {
            if (url) pending.resolve(url);
            else pending.reject(new Error("Asset is not available"));
          }
        }
      })
      .catch((error: unknown) => {
        for (const assetId of chunk) {
          for (const pending of batch.get(assetId) ?? []) {
            // A failed batch must not fail every asset in it: retry each alone.
            if (chunk.length > 1) {
              client.storage.createDownloadUrls
                .mutate({ assetIds: [assetId], disposition: "inline" })
                .then((urls) => {
                  const url = urls[assetId]?.downloadUrl;
                  if (url) pending.resolve(url);
                  else pending.reject(new Error("Asset is not available"));
                })
                .catch(pending.reject);
            } else {
              pending.reject(error);
            }
          }
        }
      });
  }
}

/**
 * Resolves an inline download URL for an asset. Calls made close together are
 * signed in one request, and URLs are reused until shortly before they expire.
 */
export function loadAssetDownloadUrl(
  client: StorageClient,
  assetId: string,
): Promise<string> {
  if (!assetId) return Promise.reject(new Error("Asset is not available"));
  const cached = cache.get(assetId);
  if (cached && cached.expiresAt > Date.now()) return cached.url;

  const url = new Promise<string>((resolve, reject) => {
    const pending = queue.get(assetId) ?? [];
    pending.push({ resolve, reject });
    queue.set(assetId, pending);
    flushTimer ??= setTimeout(() => flush(client), BATCH_DELAY_MS);
  });
  cache.set(assetId, { url, expiresAt: Date.now() + CACHE_MS });
  url.catch(() => {
    if (cache.get(assetId)?.url === url) cache.delete(assetId);
  });
  return url;
}

/** Inline download URL for `assetId`, fetched once `enabled` is true. */
export function useAssetDownloadUrl(assetId: string, enabled = true) {
  const utils = api.useUtils();
  const [state, setState] = useState<{
    assetId: string;
    url: string | null;
    failed: boolean;
  } | null>(null);

  useEffect(() => {
    if (!enabled || !assetId) return;
    let active = true;
    loadAssetDownloadUrl(utils.client, assetId)
      .then((url) => {
        if (active) setState({ assetId, url, failed: false });
      })
      .catch(() => {
        if (active) setState({ assetId, url: null, failed: true });
      });
    return () => {
      active = false;
    };
  }, [assetId, enabled, utils.client]);

  const current = state?.assetId === assetId ? state : null;
  return {
    url: enabled ? (current?.url ?? null) : null,
    failed: current?.failed ?? false,
    loading: enabled && !current,
  };
}
