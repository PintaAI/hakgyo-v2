import type { PlacementGoal, PlacementStage } from "@hakgyo/shared/placement";
import * as SecureStore from "expo-secure-store";

// Onboarding runs before sign-in, so the placement result waits here until
// the learner has a session (see useSubmitPlacement). SecureStore, like the
// onboarding marker, so a confirmed sign-out does not drop it.

/** The highest stage passed, until the server has it. */
export const PLACEMENT_STAGE_KEY = "hakgyo.placement.stage";
/** Why the learner studies Korean; kept on the device only. */
export const PLACEMENT_GOAL_KEY = "hakgyo.placement.goal";
/** Set by app versions with the old 10-question Hangeul test: stage 2. */
export const LEGACY_HANGEUL_PASSED_KEY = "hakgyo.hangeulPlacement.passed";

const GOALS: readonly PlacementGoal[] = ["beginner", "eps", "work", "other"];

/** The stage still to be sent to the server, or 0 when there is none. */
export function getPendingPlacementStage(): PlacementStage {
  const stored = Number(SecureStore.getItem(PLACEMENT_STAGE_KEY));
  if (stored >= 1 && stored <= 4) return stored as PlacementStage;
  return SecureStore.getItem(LEGACY_HANGEUL_PASSED_KEY) === "1" ? 2 : 0;
}

export function savePlacementStage(stage: PlacementStage) {
  if (stage === 0) {
    SecureStore.deleteItemAsync(PLACEMENT_STAGE_KEY).catch(() => undefined);
    return;
  }
  SecureStore.setItem(PLACEMENT_STAGE_KEY, String(stage));
}

export async function clearPendingPlacementStage() {
  await SecureStore.deleteItemAsync(PLACEMENT_STAGE_KEY);
  await SecureStore.deleteItemAsync(LEGACY_HANGEUL_PASSED_KEY);
}

export function getPlacementGoal(): PlacementGoal | null {
  const stored = SecureStore.getItem(PLACEMENT_GOAL_KEY);
  return GOALS.find((goal) => goal === stored) ?? null;
}

export function savePlacementGoal(goal: PlacementGoal) {
  SecureStore.setItem(PLACEMENT_GOAL_KEY, goal);
}
