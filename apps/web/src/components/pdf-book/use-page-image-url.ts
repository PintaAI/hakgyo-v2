"use client";

import { useEffect, useRef, useState } from "react";

import { api } from "~/trpc/react";

// Signed download URLs live for five minutes; reuse them briefly so the
// inline reader and the full-screen viewer don't re-sign the same page.
const cache = new Map<string, { url: Promise<string>; expiresAt: number }>();
const CACHE_MS = 4 * 60 * 1000;

export function usePageImageUrl(assetId: string, enabled: boolean) {
  const utils = api.useUtils();
  const [state, setState] = useState<{
    assetId: string;
    url: string | null;
    failed: boolean;
  } | null>(null);

  useEffect(() => {
    if (!enabled || !assetId) return;
    let active = true;
    let entry = cache.get(assetId);
    if (!entry || entry.expiresAt <= Date.now()) {
      entry = {
        url: utils.client.storage.createDownloadUrl
          .mutate({ assetId, disposition: "inline" })
          .then(({ downloadUrl }) => downloadUrl),
        expiresAt: Date.now() + CACHE_MS,
      };
      cache.set(assetId, entry);
      entry.url.catch(() => cache.delete(assetId));
    }
    entry.url
      .then((url) => {
        if (active) setState({ assetId, url, failed: false });
      })
      .catch(() => {
        if (active) setState({ assetId, url: null, failed: true });
      });
    return () => {
      active = false;
    };
  }, [assetId, enabled, utils]);

  const current = state?.assetId === assetId ? state : null;
  return {
    url: enabled ? (current?.url ?? null) : null,
    failed: current?.failed ?? false,
    loading: enabled && !current,
  };
}

/** Becomes true once the element scrolls near the viewport, then stays true. */
export function useNearViewport<T extends Element>(rootMargin = "600px") {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || visible) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [rootMargin, visible]);

  return { ref, visible };
}
