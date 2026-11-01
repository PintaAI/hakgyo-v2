import * as SecureStore from "expo-secure-store";

// SecureStore rather than kv-store, like onboarding: a sign-out clears
// kv-store, and someone who learned the gestures should not see them again
// after signing back in. Reset aplikasi clears it.
export const DECK_TUTORIAL_SEEN_KEY = "hakgyo.deckTutorial.seen";

export function hasSeenDeckTutorial() {
  return SecureStore.getItem(DECK_TUTORIAL_SEEN_KEY) === "1";
}

export function markDeckTutorialSeen() {
  SecureStore.setItem(DECK_TUTORIAL_SEEN_KEY, "1");
}
