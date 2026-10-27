import { describe, expect, test } from "bun:test";

import { analyzeItems, type ItemResponse } from "./item-analysis";

/** Ten attempts; attempt i scores i * 10 %. Item "easy" is right for everyone above 10 %. */
function responsesFor(
  item: string,
  correctFor: (index: number) => boolean,
  option = "a",
) {
  return Array.from({ length: 10 }, (_, index): ItemResponse => {
    const correct = correctFor(index);
    return {
      itemKey: item,
      attemptKey: `attempt-${index}`,
      attemptPercent: index * 10,
      correct,
      answered: correct || index % 2 === 1,
      optionKeys: correct ? [option] : index % 2 ? ["b"] : [],
      timeMs: 1000 * (index + 1),
    };
  });
}

describe("analyzeItems", () => {
  test("computes difficulty, discrimination, option rates and time", () => {
    const stats = analyzeItems(
      [
        ...responsesFor("good", (index) => index >= 5),
        ...responsesFor("flat", () => true),
      ],
      { distractors: new Map([["good", ["b", "c", "d"]]]) },
    );
    const good = stats.get("good")!;
    expect(good.responses).toBe(10);
    expect(good.correctRate).toBe(0.5);
    // Upper 27 % (3 attempts) all right, lower 3 all wrong.
    expect(good.discrimination).toBe(1);
    expect(good.optionRates.get("a")).toBe(0.5);
    expect(good.unansweredRate).toBe(0.3);
    expect(good.averageTimeMs).toBe(5500);
    expect(good.weakDistractors).toEqual(["c", "d"]);
    expect(good.flags).toEqual(["weak-distractor"]);

    const flat = stats.get("flat")!;
    expect(flat.discrimination).toBe(0);
    expect(flat.flags).toEqual(["too-easy", "low-discrimination"]);
  });

  test("counts every option of a multiple-choice answer", () => {
    const row = (attemptKey: string, optionKeys: string[]) => ({
      itemKey: "multi",
      attemptKey,
      attemptPercent: 50,
      correct: optionKeys.length === 2,
      answered: true,
      optionKeys,
    });
    const stats = analyzeItems([row("a1", ["x", "y"]), row("a2", ["x"])]);
    expect(stats.get("multi")!.optionRates.get("x")).toBe(1);
    expect(stats.get("multi")!.optionRates.get("y")).toBe(0.5);
    expect(stats.get("multi")!.unansweredRate).toBe(0);
  });

  test("raises no flags and no discrimination on tiny samples", () => {
    const stats = analyzeItems(responsesFor("x", () => false).slice(0, 3));
    expect(stats.get("x")!.discrimination).toBeNull();
    expect(stats.get("x")!.flags).toEqual([]);
  });

  test("pools rows of different packages under one item key", () => {
    const pooled = analyzeItems([
      {
        itemKey: "bank-1",
        attemptKey: "p1-a",
        attemptPercent: 80,
        correct: true,
        answered: true,
        optionKeys: ["o1"],
      },
      {
        itemKey: "bank-1",
        attemptKey: "p2-a",
        attemptPercent: 40,
        correct: false,
        answered: false,
        optionKeys: [],
      },
    ]);
    expect(pooled.get("bank-1")!.correctRate).toBe(0.5);
  });
});
