import { describe, expect, test } from "bun:test";

import { createHangeulStageQuestion } from "./placement";
import { romanizeHangeulSyllable } from "./romanize";

/** A seeded generator, so a failure can be reproduced. */
function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

describe("createHangeulStageQuestion", () => {
  test("every question has four distinct choices with exactly one answer", () => {
    for (let seed = 1; seed <= 300; seed += 1) {
      for (const stage of [1, 2] as const) {
        const question = createHangeulStageQuestion(stage, seeded(seed));
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

  test("mixes reading and writing questions", () => {
    const kinds = new Set(
      Array.from(
        { length: 20 },
        (_, seed) => createHangeulStageQuestion(1, seeded(seed + 1)).kind,
      ),
    );
    expect(kinds).toEqual(new Set(["read", "write"]));
  });
});
