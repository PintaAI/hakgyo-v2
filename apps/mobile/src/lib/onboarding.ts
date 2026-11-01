import * as SecureStore from "expo-secure-store";

// SecureStore rather than kv-store: a confirmed sign-out clears kv-store, and
// a returning learner should land on the sign-in step, not the intro slides.
export const ONBOARDING_SEEN_KEY = "hakgyo.onboarding.seen";

export function hasSeenOnboarding() {
  return SecureStore.getItem(ONBOARDING_SEEN_KEY) === "1";
}

export function markOnboardingSeen() {
  SecureStore.setItem(ONBOARDING_SEEN_KEY, "1");
}

// Set once a session reaches the signed-in app. After a sign-out, the
// onboarding's last step then offers sign-in first and skips the Hangeul
// test, which is for people who have no account yet. SecureStore for the
// same reason as the onboarding marker.
export const SIGNED_IN_BEFORE_KEY = "hakgyo.onboarding.signedInBefore";

export function hasSignedInBefore() {
  return SecureStore.getItem(SIGNED_IN_BEFORE_KEY) === "1";
}

export function markSignedInBefore() {
  SecureStore.setItem(SIGNED_IN_BEFORE_KEY, "1");
}
