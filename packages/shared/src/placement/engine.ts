import type { PlacementReading, PlacementStage } from "./types";

/** Correct answers that pass a stage, and wrong ones that fail it. */
export const PLACEMENT_PASS_COUNT = 2;
export const PLACEMENT_FAIL_COUNT = 2;

export const PLACEMENT_STAGES = [
  { stage: 1, title: "Hangeul dasar", xp: 100 },
  { stage: 2, title: "Bisa baca Hangeul", xp: 300 },
  { stage: 3, title: "Kosakata dasar", xp: 600 },
  { stage: 4, title: "Kalimat", xp: 1000 },
] as const;

/** XP the server awards for the highest stage passed. */
export function placementXp(stage: PlacementStage) {
  return stage === 0 ? 0 : PLACEMENT_STAGES[stage - 1]!.xp;
}

/** Passing stage 2 means the learner reads Hangeul: Hangeul Mastery. */
export const PLACEMENT_HANGEUL_STAGE = 2;

export type PlacementState = {
  /** The stage being tested; null once the test is over. */
  stage: 1 | 2 | 3 | 4 | null;
  correct: number;
  wrong: number;
  /** Highest stage passed so far. */
  passed: PlacementStage;
  /** Lowest stage failed so far, which the test never climbs back to. */
  failed: 1 | 2 | 3 | 4 | null;
  answered: number;
};

/**
 * Where the test starts: learners who read slowly at stage 1, fluent readers
 * at stage 3. Learners who cannot read yet take no test (null).
 */
export function startPlacement(
  reading: PlacementReading,
): PlacementState | null {
  if (reading === "none") return null;
  return {
    stage: reading === "fluent" ? 3 : 1,
    correct: 0,
    wrong: 0,
    passed: 0,
    failed: null,
    answered: 0,
  };
}

/**
 * Applies one answer. Two correct answers at a stage pass it and move up; two
 * wrong ones fail it, and the test moves down to check the stage below
 * (when the learner started above it and it is not passed yet) or ends.
 * Passing a stage counts every stage below it as passed. A stage takes at
 * most three questions, so the test takes at most twelve.
 */
export function answerPlacement(
  state: PlacementState,
  isCorrect: boolean,
): PlacementState {
  const { stage } = state;
  if (stage === null) return state;
  const answered = state.answered + 1;

  if (isCorrect) {
    const correct = state.correct + 1;
    if (correct < PLACEMENT_PASS_COUNT) return { ...state, correct, answered };
    const passed = Math.max(state.passed, stage) as PlacementStage;
    const next = stage + 1;
    const done = stage === 4 || state.failed === next;
    return {
      stage: done ? null : (next as 2 | 3 | 4),
      correct: 0,
      wrong: 0,
      passed,
      failed: state.failed,
      answered,
    };
  }

  const wrong = state.wrong + 1;
  if (wrong < PLACEMENT_FAIL_COUNT) return { ...state, wrong, answered };
  const below = stage - 1;
  const checkBelow = below >= 1 && state.passed < below;
  return {
    stage: checkBelow ? (below as 1 | 2 | 3) : null,
    correct: 0,
    wrong: 0,
    passed: state.passed,
    failed: stage,
    answered,
  };
}
