import * as SecureStore from "expo-secure-store";

// SecureStore rather than kv-store: a confirmed sign-out clears kv-store, and
// a returning learner should land on the sign-in step, not the intro slides.
const SEEN_KEY = "hakgyo.onboarding.seen";

export function hasSeenOnboarding() {
  return SecureStore.getItem(SEEN_KEY) === "1";
}

export function markOnboardingSeen() {
  SecureStore.setItem(SEEN_KEY, "1");
}
