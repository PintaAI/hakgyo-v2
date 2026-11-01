import * as SecureStore from "expo-secure-store";

// Onboarding runs before sign-in, so a passed Hangeul test waits here until
// the learner has a session (see useSubmitHangeulPlacement). SecureStore, like
// the onboarding marker, so a confirmed sign-out does not drop it.
export const HANGEUL_PLACEMENT_PASSED_KEY = "hakgyo.hangeulPlacement.passed";

export function hasPassedHangeulPlacement() {
  return SecureStore.getItem(HANGEUL_PLACEMENT_PASSED_KEY) === "1";
}

export function markHangeulPlacementPassed() {
  SecureStore.setItem(HANGEUL_PLACEMENT_PASSED_KEY, "1");
}

export async function clearHangeulPlacement() {
  await SecureStore.deleteItemAsync(HANGEUL_PLACEMENT_PASSED_KEY);
}
