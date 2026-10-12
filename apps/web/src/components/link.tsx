"use client";

import NextLink from "next/link";
import { useEffect, useRef, useState, type ComponentProps } from "react";

// Long enough that sweeping the pointer across a menu prefetches nothing.
const HOVER_INTENT_MS = 150;

/**
 * `next/link` that prefetches once the user shows intent (resting the pointer
 * on it, focusing or touching it) instead of as soon as the link scrolls into
 * view. Most app routes are dynamic, so each prefetch is a server render; the
 * workspace sidebar alone cost about 30 of them per page load. An explicit
 * `prefetch` prop is passed through unchanged.
 */
export default function Link({
  prefetch,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onTouchStart,
  ...props
}: ComponentProps<typeof NextLink>) {
  const [intent, setIntent] = useState(false);
  const hoverTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(hoverTimer.current), []);

  return (
    <NextLink
      {...props}
      // `null` restores Next's default prefetch once intent is shown.
      prefetch={prefetch !== undefined ? prefetch : intent ? null : false}
      onMouseEnter={(event) => {
        if (!intent) {
          hoverTimer.current = window.setTimeout(
            () => setIntent(true),
            HOVER_INTENT_MS,
          );
        }
        onMouseEnter?.(event);
      }}
      onMouseLeave={(event) => {
        window.clearTimeout(hoverTimer.current);
        onMouseLeave?.(event);
      }}
      onFocus={(event) => {
        setIntent(true);
        onFocus?.(event);
      }}
      onTouchStart={(event) => {
        setIntent(true);
        onTouchStart?.(event);
      }}
    />
  );
}
