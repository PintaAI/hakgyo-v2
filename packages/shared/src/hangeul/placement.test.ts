import { describe, expect, test } from "bun:test";

import {
  createHangeulPlacementTest,
  HANGEUL_PLACEMENT_QUESTION_COUNT,
  hasPassedHangeulPlacement,
} from "./placement";
import { romanizeHangeulSyllable } from "./romanize";

/** A seeded generator, so a failure can be reproduced. */
function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

describe("createHangeulPlacementTest", () => {
  test("every question has four distinct choices with exactly one answer", () => {
    for (let seed = 1; seed <= 300; seed += 1) {
      const questions = createHangeulPlacementTest(seeded(seed));
      expect(questions).toHaveLength(HANGEUL_PLACEMENT_QUESTION_COUNT);
      for (const question of questions) {
        expect(question.choices).toHaveLength(4);
        expect(new Set(question.choices).size).toBe(4);
        expect(question.choices).toContain(question.answer);
        // Readings of the choices differ, so only one fits the prompt.
        const readings =
          question.kind === "read"
            ? question.choices
            : question.choices.map(romanizeHangeulSyllable);
        expect(new Set(readings).size).toBe(4);
        if (question.kind === "read") {
          expect(romanizeHangeulSyllable(question.prompt)).toBe(
            question.answer,
          );
        } else {
          expect(romanizeHangeulSyllable(question.answer)).toBe(
            question.prompt,
          );
        }
      }
    }
  });

  test("alternates reading and writing questions", () => {
    const kinds = createHangeulPlacementTest(seeded(7)).map(
      (question) => question.kind,
    );
    expect(kinds.slice(0, 4)).toEqual(["read", "write", "read", "write"]);
  });
});

test("passing takes eight correct answers", () => {
  expect(hasPassedHangeulPlacement(7)).toBe(false);
  expect(hasPassedHangeulPlacement(8)).toBe(true);
});
