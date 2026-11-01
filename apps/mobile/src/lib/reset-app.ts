import * as SecureStore from "expo-secure-store";

import { forgetAuthStorage } from "./auth-client";
import { ONBOARDING_SEEN_KEY } from "./onboarding";
import { PUSH_STORAGE_KEYS } from "./push-notifications";
import { RELEASE_NOTES_SEEN_KEY } from "./release-notes";

/**
 * Deletes what this app keeps in SecureStore, which survives a sign-out on
 * purpose: the session, the onboarding and "Yang baru" markers and the push
 * device id. Together with the sign-out wipe of local data, the next launch
 * behaves like a fresh install.
 */
export async function forgetSecureStorage() {
  await forgetAuthStorage();
  for (const key of [
    ONBOARDING_SEEN_KEY,
    RELEASE_NOTES_SEEN_KEY,
    ...PUSH_STORAGE_KEYS,
  ]) {
    await SecureStore.deleteItemAsync(key);
  }
}
