import { describe, expect, test } from "bun:test";

import {
  answerPlacement,
  createPlacementQuestion,
  EPS_PLACEMENT_QUESTIONS,
  placementXp,
  POLA_PLACEMENT_QUESTIONS,
  startPlacement,
  type PlacementState,
} from ".";
import { PLACEMENT_VOCABULARY } from "./vocabulary";

function run(reading: "slow" | "fluent", answers: boolean[]) {
  let state = startPlacement(reading)!;
  for (const answer of answers) {
    if (state.stage === null) throw new Error("answered after the end");
    state = answerPlacement(state, answer);
  }
  return state;
}

const done = (state: PlacementState) => ({
  stage: state.stage,
  passed: state.passed,
});

describe("placement engine", () => {
  test("no test for learners who cannot read yet", () => {
    expect(startPlacement("none")).toBeNull();
  });

  test("a slow reader who gets everything right climbs to the top", () => {
    const state = run("slow", Array(8).fill(true));
    expect(done(state)).toEqual({ stage: null, passed: 4 });
    expect(state.answered).toBe(8);
  });

  test("a fluent reader starts at vocabulary and can finish in four", () => {
    const state = run("fluent", [true, true, true, true]);
    expect(done(state)).toEqual({ stage: null, passed: 4 });
  });

  test("stops at the first failed stage when the one below is passed", () => {
    // Stage 1 passed, stage 2 failed.
    const state = run("slow", [true, true, false, false]);
    expect(done(state)).toEqual({ stage: null, passed: 1 });
  });

  test("a stage allows one mistake", () => {
    const state = run("slow", [true, false, true, true, true]);
    expect(state.passed).toBe(2);
    expect(state.stage).toBe(3);
  });

  test("a fluent reader who fails vocabulary is checked on reading", () => {
    let state = run("fluent", [false, false]);
    expect(state.stage).toBe(2);
    state = answerPlacement(answerPlacement(state, true), true);
    // Passed reading, and never climbs back to the failed stage 3.
    expect(done(state)).toEqual({ stage: null, passed: 2 });
  });

  test("a fluent reader who fails everything ends at zero", () => {
    const state = run("fluent", Array(6).fill(false));
    expect(done(state)).toEqual({ stage: null, passed: 0 });
  });

  test("never asks more than twelve questions", () => {
    for (let mask = 0; mask < 1 << 12; mask += 1) {
      for (const reading of ["slow", "fluent"] as const) {
        let state = startPlacement(reading)!;
        let count = 0;
        while (state.stage !== null) {
          state = answerPlacement(state, ((mask >> count) & 1) === 1);
          count += 1;
          expect(count).toBeLessThanOrEqual(12);
        }
      }
    }
  });
});

test("placementXp follows the ladder", () => {
  expect([0, 1, 2, 3, 4].map((stage) => placementXp(stage as 0))).toEqual([
    0, 100, 300, 600, 1000,
  ]);
});

describe("createPlacementQuestion", () => {
  test("every stage gives 3–4 distinct choices including the answer", () => {
    for (const stage of [1, 2, 3, 4] as const) {
      for (const goal of ["eps", "work"] as const) {
        for (let index = 0; index < 50; index += 1) {
          const question = createPlacementQuestion(stage, { goal });
          expect(question.stage).toBe(stage);
          // Hangeul and vocabulary always four; some written ones three.
          expect(question.choices.length).toBeGreaterThanOrEqual(
            stage === 4 ? 3 : 4,
          );
          expect(question.choices.length).toBeLessThanOrEqual(4);
          expect(new Set(question.choices).size).toBe(question.choices.length);
          expect(question.choices).toContain(question.answer);
        }
      }
    }
  });

  test("stage 4 asks EPS reading for EPS learners, patterns otherwise", () => {
    const eps = new Set(EPS_PLACEMENT_QUESTIONS.map((question) => question.id));
    const pola = new Set(
      POLA_PLACEMENT_QUESTIONS.map((question) => question.id),
    );
    expect(eps.has(createPlacementQuestion(4, { goal: "eps" }).id)).toBe(true);
    expect(pola.has(createPlacementQuestion(4, { goal: "other" }).id)).toBe(
      true,
    );
  });

  test("does not repeat a written question while others remain", () => {
    const asked = new Set<string>();
    for (let index = 0; index < EPS_PLACEMENT_QUESTIONS.length; index += 1) {
      const question = createPlacementQuestion(4, { goal: "eps", asked });
      expect(asked.has(question.id)).toBe(false);
      asked.add(question.id);
    }
  });

  test("question data is well formed", () => {
    for (const question of [
      ...EPS_PLACEMENT_QUESTIONS,
      ...POLA_PLACEMENT_QUESTIONS,
    ]) {
      expect(question.choices.length).toBeGreaterThanOrEqual(3);
      expect(new Set(question.choices).size).toBe(question.choices.length);
    }
    const ids = [...EPS_PLACEMENT_QUESTIONS, ...POLA_PLACEMENT_QUESTIONS].map(
      (question) => question.id,
    );
    expect(new Set(ids).size).toBe(ids.length);
    const terms = PLACEMENT_VOCABULARY.map((word) => word.term);
    const meanings = PLACEMENT_VOCABULARY.map((word) => word.meaning);
    expect(new Set(terms).size).toBe(terms.length);
    expect(new Set(meanings).size).toBe(meanings.length);
  });
});
