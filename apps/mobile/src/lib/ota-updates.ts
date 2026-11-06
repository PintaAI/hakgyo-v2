import { usePathname } from "expo-router";
import * as Updates from "expo-updates";
import { useEffect, useRef } from "react";
import { AppState } from "react-native";

import { useMobileSync } from "../providers/MobileSyncProvider";

/** EAS Updates run in release builds only, never in a dev client. */
export const otaUpdatesEnabled = !__DEV__ && Updates.isEnabled;

/** Coming back to the app checks for an update at most this often. */
const CHECK_INTERVAL_MS = 30 * 60_000;
/** Away at least this long, the learner starts over and a reload goes unnoticed. */
const RELOAD_AFTER_BACKGROUND_MS = 10 * 60_000;
/** Tab roots: no lesson, attempt, game or sheet open that a reload would close. */
const RELOAD_SAFE_PATHS = new Set([
  "/",
  "/home",
  "/learn",
  "/assessments",
  "/search",
]);

let inFlight: Promise<boolean> | null = null;

/**
 * Checks for an update and downloads it. True when one is ready to apply.
 * Concurrent callers share one check.
 */
export function fetchOtaUpdate(): Promise<boolean> {
  inFlight ??= (async () => {
    const result = await Updates.checkForUpdateAsync();
    if (!result.isAvailable) return false;
    await Updates.fetchUpdateAsync();
    return true;
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/** Restarts the JavaScript on the downloaded update. */
export function applyOtaUpdate() {
  void Updates.reloadAsync().catch(() => undefined);
}

/**
 * The downloaded update waiting for a restart: its id, `"rollback"` for a
 * rollback directive, or null.
 */
export function useReadyOtaUpdate(): string | null {
  const { isUpdatePending, downloadedUpdate } = Updates.useUpdates();
  if (!otaUpdatesEnabled || !isUpdatePending) return null;
  return downloadedUpdate?.updateId ?? "rollback";
}

/**
 * Keeps the app on the newest EAS Update without the learner restarting it.
 * expo-updates checks only on a cold start, which can be days away while the
 * OS keeps the app suspended, so this also checks when the app comes back to
 * the foreground and downloads in the background. A downloaded update applies
 * by itself when the learner returns after a while to a tab root; otherwise
 * the sync activity surfaces offer "Mulai ulang" (see `selectSyncActivity`).
 */
export function OtaUpdateWatcher() {
  const readyUpdate = useReadyOtaUpdate();
  const pathname = usePathname();
  const { isSyncing, refreshPhase, bundles } = useMobileSync();
  const syncBusy =
    isSyncing ||
    refreshPhase !== null ||
    (bundles?.changingCourseIds.length ?? 0) > 0;
  const latest = useRef({ readyUpdate, pathname, syncBusy });
  useEffect(() => {
    latest.current = { readyUpdate, pathname, syncBusy };
  });

  useEffect(() => {
    if (!otaUpdatesEnabled) return;
    // The launch itself checked (`checkAutomatically` defaults to ON_LOAD).
    let lastCheckAt = Date.now();
    let backgroundedAt: number | null = null;
    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "background") {
        backgroundedAt = Date.now();
        return;
      }
      if (next !== "active") return;
      const awayMs = backgroundedAt === null ? 0 : Date.now() - backgroundedAt;
      backgroundedAt = null;
      const { readyUpdate, pathname, syncBusy } = latest.current;
      if (
        readyUpdate &&
        awayMs >= RELOAD_AFTER_BACKGROUND_MS &&
        RELOAD_SAFE_PATHS.has(pathname) &&
        !syncBusy
      ) {
        applyOtaUpdate();
        return;
      }
      if (Date.now() - lastCheckAt < CHECK_INTERVAL_MS) return;
      lastCheckAt = Date.now();
      // Offline or the server is unreachable: try again next time.
      void fetchOtaUpdate().catch(() => undefined);
    });
    return () => subscription.remove();
  }, []);

  return null;
}
