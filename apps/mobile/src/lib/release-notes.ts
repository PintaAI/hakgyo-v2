import {
  releaseNotesSince,
  releaseNotesUpTo,
  type ReleaseNote,
} from "@hakgyo/shared/release-notes";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

/** The app `version`, which is also the runtime EAS Updates target. */
export const APP_VERSION = Constants.expoConfig?.version ?? "1.0.0";

// SecureStore rather than kv-store, like onboarding: a sign-out clears
// kv-store, and signing back in should not replay notes already shown.
const SEEN_KEY = "hakgyo.releaseNotes.seen";

/** "Yang baru" entries this bundle ships, newest first. */
export const installedReleaseNotes = releaseNotesUpTo(APP_VERSION);

/**
 * Entries released since the learner last saw "Yang baru". The first launch
 * of an install remembers the newest entry and returns nothing: someone who
 * just installed the app has nothing to catch up on.
 */
export function unseenReleaseNotes(): ReleaseNote[] {
  const lastSeen = SecureStore.getItem(SEEN_KEY);
  if (lastSeen === null) {
    markReleaseNotesSeen();
    return [];
  }
  return releaseNotesSince(installedReleaseNotes, lastSeen);
}

export function markReleaseNotesSeen() {
  const newest = installedReleaseNotes[0];
  if (newest) SecureStore.setItem(SEEN_KEY, newest.id);
}

/** `2026-10-21` → "21 Okt 2026", read as a calendar date in any time zone. */
export function releaseDateLabel(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
