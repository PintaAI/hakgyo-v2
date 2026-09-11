/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

// NOTE: Keep in sync with `NotifyPayload` in `@hakgyo/shared`.
// This file is bundled by esbuild via the Serwist route handler, so it must
// stay dependency-light and cannot rely on Next.js server modules.
type NotifyPayload = {
  notificationId?: string;
  title?: string;
  body?: string;
  /** Web path to open on click. */
  path?: string;
  /** Collapse key: notifications with the same tag replace each other. */
  tag?: string;
};

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const SW_VERSION = "hakgyo-sw-v1";

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();

self.addEventListener("install", () => {
  console.log(`[${SW_VERSION}] installed`);
});

self.addEventListener("push", (event) => {
  let data: NotifyPayload = {};
  try {
    data = (event.data?.json() ?? {}) as NotifyPayload;
  } catch {
    // Push services may deliver empty or non-JSON payloads; fall back below.
  }

  const title = data.title ?? "Hakgyo";
  const options: NotificationOptions = {
    body: data.body ?? "Ada pembaruan baru untukmu.",
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-72.png",
    tag: data.tag ?? data.notificationId ?? "hakgyo-default",
    data: {
      notificationId: data.notificationId,
      path: data.path ?? "/",
      dateOfArrival: Date.now(),
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path =
    (event.notification.data as { path?: string } | undefined)?.path ?? "/";

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of windows) {
        const url = new URL(client.url);
        if (url.pathname === path && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(path);
      }
      return undefined;
    })(),
  );
});

// Best-effort recovery when the browser rotates a push endpoint.
// The reliable cleanup path remains server-side 404/410 pruning plus
// re-subscribe on next visit.
self.addEventListener("pushsubscriptionchange", () => {
  console.log(`[${SW_VERSION}] push subscription changed`);
});
