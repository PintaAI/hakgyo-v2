"use client";

import { SerwistProvider } from "@serwist/turbopack/react";
import type { ReactNode } from "react";

/**
 * Registers the Serwist service worker in production only.
 * `swScope: "/"` (paired with the `Service-Worker-Allowed: /` header on the
 * `/serwist/sw.js` route) lets one worker cover the whole app, including push.
 */
export function PwaProvider({ children }: { children: ReactNode }) {
  return (
    <SerwistProvider
      swUrl="/serwist/sw.js"
      options={{ scope: "/", updateViaCache: "none" }}
      disable={process.env.NODE_ENV !== "production"}
    >
      {children}
    </SerwistProvider>
  );
}
