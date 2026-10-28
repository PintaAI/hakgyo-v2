import { describe, expect, test } from "bun:test";
import type { ItemResponse } from "@hakgyo/shared";

import { bankStatsFrom, WEAK_GROUP_FLAG } from "./stats";

/** `count` attempts; `pick(index)` is the bank option position attempt `index` chose. */
function responses(
  itemKey: string,
  count: number,
  pick: (index: number) => number | null,
  key = 0,
): ItemResponse[] {
  return Array.from({ length: count }, (_, index) => {
    const chosen = pick(index);
    return {
      itemKey,
      attemptKey: `attempt-${index}`,
      attemptPercent: 100 - index,
      correct: chosen === key,
      answered: chosen !== null,
      optionKeys: chosen === null ? [] : [String(chosen)],
    };
  });
}

describe("bankStatsFrom", () => {
  test("pools responses per bank question with options by bank position", () => {
    const [row] = bankStatsFrom({
      responses: responses("q1", 20, (index) =>
        index < 12 ? 0 : (index % 3) + 1,
      ),
      distractors: new Map([["q1", ["1", "2", "3"]]]),
      groups: new Map([["q1", null]]),
    });
    expect(row).toMatchObject({
      questionId: "q1",
      attempts: 20,
      correctRate: 0.6,
    });
    expect(row!.optionRates["0"]).toBe(0.6);
    expect(row!.discrimination).toBeGreaterThan(0.5);
    expect(row!.flags).toEqual([]);
  });

  test("flags a hard question and the rest of its group", () => {
    const rows = bankStatsFrom({
      responses: [
        ...responses("hard", 12, (index) => (index < 2 ? 0 : 1)),
        ...responses("fine", 12, (index) => (index < 7 ? 0 : (index % 3) + 1)),
        ...responses("alone", 12, (index) => (index < 7 ? 0 : (index % 3) + 1)),
      ],
      distractors: new Map([
        ["hard", ["1", "2", "3"]],
        ["fine", ["1", "2", "3"]],
        ["alone", ["1", "2", "3"]],
      ]),
      groups: new Map([
        ["hard", "g"],
        ["fine", "g"],
        ["alone", null],
      ]),
    });
    const byId = new Map(rows.map((row) => [row.questionId, row]));
    expect(byId.get("hard")!.flags).toContain("too-hard");
    expect(byId.get("fine")!.flags).toEqual([WEAK_GROUP_FLAG]);
    expect(byId.get("alone")!.flags).not.toContain(WEAK_GROUP_FLAG);
  });

  test("raises no flags on few responses", () => {
    const [row] = bankStatsFrom({
      responses: responses("q", 5, () => 1),
      distractors: new Map([["q", ["1", "2", "3"]]]),
      groups: new Map([["q", null]]),
    });
    expect(row!.flags).toEqual([]);
  });
});
