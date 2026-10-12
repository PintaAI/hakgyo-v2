"use client";

import NextLink from "next/link";
import { useState, type ComponentProps } from "react";

/**
 * `next/link` that prefetches once the user shows intent (hover, focus or
 * touch) instead of as soon as the link scrolls into view. Most app routes are
 * dynamic, so each viewport prefetch is a server render; the workspace sidebar
 * alone cost about 30 of them per page load. An explicit `prefetch` prop is
 * passed through unchanged.
 */
export default function Link({
  prefetch,
  onMouseEnter,
  onFocus,
  onTouchStart,
  ...props
}: ComponentProps<typeof NextLink>) {
  const [intent, setIntent] = useState(false);
  return (
    <NextLink
      {...props}
      // `null` restores Next's default prefetch once intent is shown.
      prefetch={prefetch !== undefined ? prefetch : intent ? null : false}
      onMouseEnter={(event) => {
        setIntent(true);
        onMouseEnter?.(event);
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
