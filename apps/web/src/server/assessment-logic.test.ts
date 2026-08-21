import { describe, expect, test } from "bun:test";

import {
  getMissingWrittenQuestionIds,
  groupScoresByValue,
} from "./assessment-logic";

describe("assessment submission logic", () => {
  test("represents unanswered written questions for review", () => {
    expect(
      getMissingWrittenQuestionIds(
        [
          { id: "choice", type: "SINGLE_CHOICE", optionIds: ["option"] },
          { id: "written-one", type: "WRITTEN", optionIds: [] },
          { id: "written-two", type: "WRITTEN", optionIds: [] },
        ],
        new Set(["choice", "written-two"]),
      ),
    ).toEqual(["written-one"]);
  });

  test("groups auto-score updates for bulk writes", () => {
    expect([
      ...groupScoresByValue([
        { answerId: "answer-a", score: 0 },
        { answerId: "answer-b", score: 2 },
        { answerId: "answer-c", score: 0 },
      ]),
    ]).toEqual([
      [0, ["answer-a", "answer-c"]],
      [2, ["answer-b"]],
    ]);
  });
});
