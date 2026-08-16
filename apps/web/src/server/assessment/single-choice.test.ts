import { describe, expect, test } from "bun:test";

import { keepSingleChoiceCorrectOption } from "./single-choice";

describe("single choice correct option normalization", () => {
  test("keeps the earliest correct option by position when several are correct", () => {
    expect(
      keepSingleChoiceCorrectOption([
        { id: "a", isCorrect: false },
        { id: "b", isCorrect: true },
        { id: "c", isCorrect: true },
        { id: "d", isCorrect: true },
      ]),
    ).toBe("b");
  });

  test("respects input order (position) instead of id order", () => {
    expect(
      keepSingleChoiceCorrectOption([
        { id: "z", isCorrect: true },
        { id: "a", isCorrect: true },
      ]),
    ).toBe("z");
  });

  test("returns the sole correct option when exactly one is correct", () => {
    expect(
      keepSingleChoiceCorrectOption([
        { id: "a", isCorrect: false },
        { id: "b", isCorrect: true },
      ]),
    ).toBe("b");
  });

  test("returns null when no option is correct", () => {
    expect(
      keepSingleChoiceCorrectOption([
        { id: "a", isCorrect: false },
        { id: "b", isCorrect: false },
      ]),
    ).toBeNull();
  });

  test("returns null when there are no options", () => {
    expect(keepSingleChoiceCorrectOption([])).toBeNull();
  });
});
