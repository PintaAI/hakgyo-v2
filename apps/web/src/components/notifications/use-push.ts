"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { api } from "~/trpc/react";

const DEVICE_ID_KEY = "hakgyo-device-id";

export type PushSupport =
  | "loading"
  | "supported"
  | "needs-install"
  | "unsupported";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob(base64.replace(/-/g, "+").replace(/_/g, "/") + padding);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    bytes[i] = raw.charCodeAt(i);
  }
  return bytes;
}

/** Stable per-browser id. Exported for logout cleanup. */
export function getWebDeviceId(): string {
  let id: string | null = null;
  try {
    id = localStorage.getItem(DEVICE_ID_KEY);
  } catch {
    id = null;
  }
  if (!id) {
    id = crypto.randomUUID();
    try {
      localStorage.setItem(DEVICE_ID_KEY, id);
    } catch {
      // Private mode: registration still works, dedup just won't persist.
    }
  }
  return id;
}

function detectSupport(): PushSupport {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return "loading";
  }
  const hasPush =
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;
  if (hasPush) return "supported";
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (!standalone && "serviceWorker" in navigator) {
    // Classic iOS Safari tab: worker exists but Push is hidden until the
    // site is launched from the home screen.
    return "needs-install";
  }
  return "unsupported";
}

/**
 * Web Push subscription state for THIS browser. Multi-device safe: every
 * browser holds its own `deviceId` + `PushSubscription`, registered as one
 * `pushTarget` row server-side. Logging out disables only this row.
 */
export function usePush() {
  // Browser capability never changes during a session: subscribe once via
  // the external-store pattern instead of setState-in-effect. Server
  // snapshot stays "loading" so SSR markup matches the first client render.
  const support = useSyncExternalStore(
    () => () => undefined,
    () => detectSupport(),
    () => "loading",
  );
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const utils = api.useUtils();
  const subscribeMutation = api.notification.subscribeWeb.useMutation();
  const unsubscribeMutation = api.notification.unsubscribeWeb.useMutation();
  const disableMutation = api.notification.disableDevice.useMutation();
  const sendTestMutation = api.notification.sendTest.useMutation();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
          return;
        }
        const registration = await navigator.serviceWorker.ready;
        const sub = await registration.pushManager.getSubscription();
        if (!cancelled) setSubscribed(!!sub);
      } catch {
        // Worker not ready yet (dev mode) — stay unsubscribed.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const subscribe = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) throw new Error("VAPID public key is not configured");
      // Must run synchronously in the click handler: awaiting anything
      // before this call can consume the user gesture on some browsers.
      // A denied permission cannot be re-prompted on this origin; the user
      // must then re-enable it in browser site settings.
      const result = await Notification.requestPermission();
      if (result !== "granted") {
        throw new Error("Izin notifikasi tidak diberikan");
      }
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const json = sub.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error("Browser tidak mengembalikan subscription yang valid");
      }
      await subscribeMutation.mutateAsync({
        deviceId: getWebDeviceId(),
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
        userAgent: navigator.userAgent,
      });
      setSubscribed(true);
      await utils.notification.unreadCount.invalidate();
    } catch (err) {
      // A denied permission cannot be re-prompted on this origin; the user
      // must re-enable it in browser site settings.
      setError(err instanceof Error ? err.message : "Gagal berlangganan");
      throw err;
    } finally {
      setBusy(false);
    }
  }, [subscribeMutation, utils]);

  const unsubscribe = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      await sub?.unsubscribe();
      await unsubscribeMutation.mutateAsync({ deviceId: getWebDeviceId() });
      setSubscribed(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal berhenti");
      throw err;
    } finally {
      setBusy(false);
    }
  }, [unsubscribeMutation]);

  /** Server-side disable without touching the browser subscription. */
  const disableThisDevice = useCallback(async () => {
    await disableMutation.mutateAsync({ deviceId: getWebDeviceId() });
    setSubscribed(false);
  }, [disableMutation]);

  const sendTest = useCallback(async () => {
    await sendTestMutation.mutateAsync({});
    await utils.notification.inboxList.invalidate();
  }, [sendTestMutation, utils]);

  return {
    support,
    subscribed,
    busy,
    error,
    subscribe,
    unsubscribe,
    disableThisDevice,
    sendTest,
    sendTestPending: sendTestMutation.isPending,
  };
}
