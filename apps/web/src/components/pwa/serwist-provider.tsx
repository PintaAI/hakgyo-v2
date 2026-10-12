"use client";

import { SerwistProvider } from "@serwist/turbopack/react";
import type { ReactNode } from "react";

/**
 * Registers the Serwist service worker in production only.
 * `swScope: "/"` (paired with the `Service-Worker-Allowed: /` header on the
 * `/serwist/sw.js` route) lets one worker cover the whole app, including push.
 *
 * `cacheOnNavigation` is off because it makes the worker fetch the full HTML of
 * every client-side navigation, a second server render per click.
 * `reloadOnOnline` is off so a flaky connection doesn't reload the page.
 */
export function PwaProvider({ children }: { children: ReactNode }) {
  return (
    <SerwistProvider
      swUrl="/serwist/sw.js"
      options={{ scope: "/", updateViaCache: "none" }}
      cacheOnNavigation={false}
      reloadOnOnline={false}
      disable={process.env.NODE_ENV !== "production"}
    >
      {children}
    </SerwistProvider>
  );
}
