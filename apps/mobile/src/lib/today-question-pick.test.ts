import { describe, expect, test } from "bun:test";

import {
  HIDE_CORRECT_DAYS,
  pickTodayQuestions,
  pruneCorrectQuestions,
} from "./today-question-pick";

const DAY = 24 * 60 * 60 * 1000;
const now = Date.UTC(2026, 10, 12, 8);
const pool = Array.from({ length: 10 }, (_, index) => ({
  questionId: `q${index}`,
}));
const ids = (items: { questionId: string }[]) =>
  items.map((item) => item.questionId);

describe("pickTodayQuestions", () => {
  test("leaves out questions answered right in the last days", () => {
    const memory = { q0: now - DAY, q1: now - 2 * DAY, q2: now - 2 * DAY };
    const picked = pickTodayQuestions(pool, {
      memory,
      now,
      count: 5,
      seed: "s",
    });
    expect(picked).toHaveLength(5);
    expect(ids(picked)).not.toContain("q0");
    expect(ids(picked)).not.toContain("q1");
    expect(ids(picked)).not.toContain("q2");
  });

  test("brings them back after the hiding window", () => {
    const memory = Object.fromEntries(
      ids(pool).map((id) => [id, now - (HIDE_CORRECT_DAYS + 1) * DAY]),
    );
    expect(
      pickTodayQuestions(pool, { memory, now, count: 5, seed: "s" }),
    ).toHaveLength(5);
  });

  test("tops up with recently right questions when too few remain", () => {
    const memory = Object.fromEntries(
      ids(pool)
        .slice(0, 8)
        .map((id) => [id, now - DAY]),
    );
    const picked = ids(
      pickTodayQuestions(pool, { memory, now, count: 5, seed: "s" }),
    );
    expect(picked).toHaveLength(5);
    expect(picked).toContain("q8");
    expect(picked).toContain("q9");
  });
});

test("pruneCorrectQuestions keeps only the hiding window", () => {
  expect(
    pruneCorrectQuestions(
      { recent: now - DAY, old: now - (HIDE_CORRECT_DAYS + 1) * DAY },
      now,
    ),
  ).toEqual({ recent: now - DAY });
});
