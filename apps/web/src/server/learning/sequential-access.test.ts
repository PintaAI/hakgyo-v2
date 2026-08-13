import { describe, expect, test } from "bun:test";

import {
  evaluateOpenModules,
  evaluateSequentialModules,
  hasPassedAssessment,
} from "./sequential-access";

describe("assessment completion", () => {
  test("requires a graded attempt that reaches the passing percentage", () => {
    expect(
      hasPassedAssessment(
        [{ status: "GRADED", score: 7, maxScore: 10 }],
        70,
      ),
    ).toBe(true);
    expect(
      hasPassedAssessment(
        [{ status: "GRADED", score: 6, maxScore: 10 }],
        70,
      ),
    ).toBe(false);
  });

  test("does not accept an ungraded attempt", () => {
    expect(
      hasPassedAssessment(
        [{ status: "SUBMITTED", score: 10, maxScore: 10 }],
        70,
      ),
    ).toBe(false);
  });
});

describe("sequential module access", () => {
  test("only the first incomplete module is available", () => {
    const result = evaluateSequentialModules([
      { id: "one", items: [{ isCompleted: false }] },
      { id: "two", items: [{ isCompleted: false }] },
    ]);

    expect(result.map(({ access }) => access)).toEqual([
      "AVAILABLE",
      "LOCKED",
    ]);
  });

  test("unlocks the next module after every previous item is complete", () => {
    const result = evaluateSequentialModules([
      {
        id: "one",
        items: [{ isCompleted: true }, { isCompleted: true }],
      },
      { id: "two", items: [{ isCompleted: false }] },
      { id: "three", items: [{ isCompleted: false }] },
    ]);

    expect(result.map(({ access }) => access)).toEqual([
      "COMPLETED",
      "AVAILABLE",
      "LOCKED",
    ]);
  });

  test("empty modules do not unlock following modules", () => {
    const result = evaluateSequentialModules([
      { id: "one", items: [] },
      { id: "two", items: [{ isCompleted: false }] },
    ]);

    expect(result.map(({ access }) => access)).toEqual([
      "AVAILABLE",
      "LOCKED",
    ]);
  });
});

describe("open module access", () => {
  test("every incomplete module is available from the start", () => {
    const result = evaluateOpenModules([
      { id: "one", items: [{ isCompleted: false }] },
      { id: "two", items: [{ isCompleted: false }] },
    ]);

    expect(result.map(({ access }) => access)).toEqual([
      "AVAILABLE",
      "AVAILABLE",
    ]);
  });

  test("completed modules keep their completed status", () => {
    const result = evaluateOpenModules([
      { id: "one", items: [{ isCompleted: true }] },
    ]);

    expect(result[0]?.access).toBe("COMPLETED");
  });
});
