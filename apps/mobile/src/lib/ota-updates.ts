import { usePathname } from "expo-router";
import * as Updates from "expo-updates";
import { useEffect, useRef } from "react";
import { AppState } from "react-native";

import { useMobileSync } from "../providers/MobileSyncProvider";
import type { AppUpdateState } from "../sync/activity";

/** EAS Updates run in release builds only, never in a dev client. */
export const otaUpdatesEnabled = !__DEV__ && Updates.isEnabled;

/**
 * Away at least this long, the learner is starting over rather than picking
 * up where they were, so a restart does not cut into what they were doing.
 */
const FRESH_START_AFTER_BACKGROUND_MS = 10 * 60_000;
/**
 * After a fresh start (a launch, or a return after the time above), an update
 * that finishes downloading this soon still applies by itself: the learner is
 * still looking around the tab they landed on.
 */
const AUTO_APPLY_WINDOW_MS = 20_000;
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
function fetchOtaUpdate(): Promise<boolean> {
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
 * The update expo-updates is downloading (with its progress in percent when
 * the server reports sizes) or has downloaded and waits to apply.
 */
export function useOtaUpdateState(): AppUpdateState | null {
  const { isUpdatePending, downloadedUpdate, isDownloading, downloadProgress } =
    Updates.useUpdates();
  if (!otaUpdatesEnabled) return null;
  if (isUpdatePending) {
    return { status: "ready", id: downloadedUpdate?.updateId ?? "rollback" };
  }
  if (isDownloading) {
    return {
      status: "downloading",
      progress: downloadProgress
        ? Math.min(99, Math.round(downloadProgress * 100))
        : null,
    };
  }
  return null;
}

/**
 * Keeps the app on the newest EAS Update without the learner restarting it.
 * expo-updates checks only on a cold start, which can be days away while the
 * OS keeps the app suspended, so this also checks and downloads every time
 * the app comes back to the foreground. The sync activity surfaces show the
 * download and then offer "Mulai ulang" (see `selectSyncActivity`).
 *
 * An update applies by itself only on a fresh start, so it never cuts into a
 * study session: on a return after 10 minutes in the background when it is
 * already downloaded, or when its download finishes within 20 seconds of a
 * launch or such a return. Either way the learner must be on a tab root and
 * no sync may be running.
 */
export function OtaUpdateWatcher() {
  const appUpdate = useOtaUpdateState();
  const readyId = appUpdate?.status === "ready" ? appUpdate.id : null;
  const pathname = usePathname();
  const { isSyncing, refreshPhase, bundles } = useMobileSync();
  const syncBusy =
    isSyncing ||
    refreshPhase !== null ||
    (bundles?.changingCourseIds.length ?? 0) > 0;
  const canReload = RELOAD_SAFE_PATHS.has(pathname) && !syncBusy;
  const latest = useRef({ readyId, canReload });
  useEffect(() => {
    latest.current = { readyId, canReload };
  });
  const autoApplyUntil = useRef(0);

  useEffect(() => {
    if (!otaUpdatesEnabled) return;
    // A launch is a fresh start too; it checks by itself (ON_LOAD).
    autoApplyUntil.current = Date.now() + AUTO_APPLY_WINDOW_MS;
    let backgroundedAt: number | null = null;
    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "background") {
        backgroundedAt = Date.now();
        return;
      }
      if (next !== "active") return;
      const freshStart =
        backgroundedAt !== null &&
        Date.now() - backgroundedAt >= FRESH_START_AFTER_BACKGROUND_MS;
      backgroundedAt = null;
      const { readyId, canReload } = latest.current;
      if (freshStart && readyId && canReload) {
        applyOtaUpdate();
        return;
      }
      autoApplyUntil.current = freshStart
        ? Date.now() + AUTO_APPLY_WINDOW_MS
        : 0;
      // Offline or the server is unreachable: try again next time.
      void fetchOtaUpdate().catch(() => undefined);
    });
    return () => subscription.remove();
  }, []);

  // The download finished soon after a fresh start.
  useEffect(() => {
    if (!readyId || !canReload) return;
    if (AppState.currentState !== "active") return;
    if (Date.now() > autoApplyUntil.current) return;
    applyOtaUpdate();
  }, [readyId, canReload]);

  return null;
}
