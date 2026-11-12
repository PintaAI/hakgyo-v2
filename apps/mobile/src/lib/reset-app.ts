import * as SecureStore from "expo-secure-store";

import { forgetAuthStorage } from "./auth-client";
import { DECK_TUTORIAL_SEEN_KEY } from "./deck-tutorial";
import { ONBOARDING_SEEN_KEY, SIGNED_IN_BEFORE_KEY } from "./onboarding";
import {
  LEGACY_HANGEUL_PASSED_KEY,
  PLACEMENT_GOAL_KEY,
  PLACEMENT_STAGE_KEY,
} from "./placement-result";
import { PUSH_STORAGE_KEYS } from "./push-notifications";
import { RELEASE_NOTES_SEEN_KEY } from "./release-notes";
import { cancelStudyReminders, STUDY_REMINDER_KEY } from "./study-reminder";
import { TOUR_SEEN_KEYS } from "../tour/tour-storage";

/**
 * Deletes what this app keeps in SecureStore, which survives a sign-out on
 * purpose: the session, the onboarding, placement test and "Yang baru" markers,
 * the study reminder (its scheduled notifications too) and the push device
 * id. Together with the sign-out wipe of local data, the next launch behaves
 * like a fresh install.
 */
export async function forgetSecureStorage() {
  await forgetAuthStorage();
  await cancelStudyReminders().catch(() => undefined);
  for (const key of [
    ONBOARDING_SEEN_KEY,
    SIGNED_IN_BEFORE_KEY,
    PLACEMENT_STAGE_KEY,
    PLACEMENT_GOAL_KEY,
    LEGACY_HANGEUL_PASSED_KEY,
    DECK_TUTORIAL_SEEN_KEY,
    RELEASE_NOTES_SEEN_KEY,
    STUDY_REMINDER_KEY,
    ...TOUR_SEEN_KEYS,
    ...PUSH_STORAGE_KEYS,
  ]) {
    await SecureStore.deleteItemAsync(key);
  }
}
