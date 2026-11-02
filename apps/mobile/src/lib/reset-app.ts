import * as SecureStore from "expo-secure-store";

import { forgetAuthStorage } from "./auth-client";
import { DECK_TUTORIAL_SEEN_KEY } from "./deck-tutorial";
import { HANGEUL_PLACEMENT_PASSED_KEY } from "./hangeul-placement";
import { ONBOARDING_SEEN_KEY, SIGNED_IN_BEFORE_KEY } from "./onboarding";
import { PUSH_STORAGE_KEYS } from "./push-notifications";
import { RELEASE_NOTES_SEEN_KEY } from "./release-notes";
import { TOUR_SEEN_KEYS } from "../tour/tour-storage";

/**
 * Deletes what this app keeps in SecureStore, which survives a sign-out on
 * purpose: the session, the onboarding, Hangeul test and "Yang baru" markers
 * and the push device id. Together with the sign-out wipe of local data, the next launch
 * behaves like a fresh install.
 */
export async function forgetSecureStorage() {
  await forgetAuthStorage();
  for (const key of [
    ONBOARDING_SEEN_KEY,
    SIGNED_IN_BEFORE_KEY,
    HANGEUL_PLACEMENT_PASSED_KEY,
    DECK_TUTORIAL_SEEN_KEY,
    RELEASE_NOTES_SEEN_KEY,
    ...TOUR_SEEN_KEYS,
    ...PUSH_STORAGE_KEYS,
  ]) {
    await SecureStore.deleteItemAsync(key);
  }
}
