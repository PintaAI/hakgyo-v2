"use client";

import { useEffect, useRef, useState } from "react";

import { useAssetDownloadUrl } from "~/components/asset-download-url";

// Page images share the batched, cached signer used by every media block, so
// the inline reader and the full-screen viewer don't re-sign the same page.
export const usePageImageUrl = useAssetDownloadUrl;

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
