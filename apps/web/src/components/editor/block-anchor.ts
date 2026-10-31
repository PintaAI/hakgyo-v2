"use client";

import { useEffect, type RefObject } from "react";

const HIGHLIGHT_MS = 2400;
// The document loads after the page (dynamic import, then BlockNote renders),
// so the anchored block may appear a while after navigation.
const WAIT_FOR_BLOCK_MS = 8000;

function findBlock(container: HTMLElement, blockId: string) {
  return container.querySelector<HTMLElement>(
    `.bn-block-outer[data-id="${CSS.escape(blockId)}"]`,
  );
}

/**
 * Scrolls the BlockNote block with id `blockId` into view and briefly
 * highlights it. Returns false when the block is not rendered.
 */
export function scrollToBlock(container: HTMLElement, blockId: string) {
  const block = findBlock(container, blockId);
  if (!block) return false;
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  block.scrollIntoView({
    block: "start",
    behavior: reduceMotion ? "auto" : "smooth",
  });
  block.removeAttribute("data-anchor-highlight");
  // Restart the highlight animation when the same block is targeted again.
  void block.offsetWidth;
  block.setAttribute("data-anchor-highlight", "");
  window.setTimeout(
    () => block.removeAttribute("data-anchor-highlight"),
    HIGHLIGHT_MS,
  );
  return true;
}

function hashBlockId() {
  const hash = window.location.hash.slice(1);
  if (!hash) return null;
  try {
    return decodeURIComponent(hash);
  } catch {
    return hash;
  }
}

/**
 * Lands on the block named by the URL hash (`#<blockId>`, as material links
 * produce) once the document inside `containerRef` has rendered it, and again
 * whenever the hash changes. `key` restarts the wait, for example when a
 * client-side navigation shows another course item.
 */
export function useBlockAnchorLanding(
  containerRef: RefObject<HTMLElement | null>,
  key: string,
  enabled = true,
) {
  useEffect(() => {
    const container = containerRef.current;
    if (!enabled || !container) return;
    let observer: MutationObserver | null = null;
    let timeout: number | undefined;

    const stopWaiting = () => {
      observer?.disconnect();
      observer = null;
      window.clearTimeout(timeout);
    };
    const land = () => {
      stopWaiting();
      const blockId = hashBlockId();
      if (!blockId || scrollToBlock(container, blockId)) return;
      observer = new MutationObserver(() => {
        if (scrollToBlock(container, blockId)) stopWaiting();
      });
      observer.observe(container, { childList: true, subtree: true });
      timeout = window.setTimeout(stopWaiting, WAIT_FOR_BLOCK_MS);
    };

    land();
    window.addEventListener("hashchange", land);
    return () => {
      stopWaiting();
      window.removeEventListener("hashchange", land);
    };
  }, [containerRef, enabled, key]);
}
