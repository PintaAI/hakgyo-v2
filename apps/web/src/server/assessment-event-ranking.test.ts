import { describe, expect, test } from "bun:test";

import { rankAssessmentEventAttempts } from "./assessment-event-ranking";

const start = new Date("2026-09-04T10:00:00.000Z");

function attempt(
  id: string,
  score: number | null,
  submittedAt: string | null,
  invalidatedAt: Date | null = null,
) {
  return {
    id,
    userId: `user-${id}`,
    name: `Learner ${id}`,
    score,
    maxScore: score === null ? null : 10,
    startedAt: start,
    submittedAt: submittedAt ? new Date(submittedAt) : null,
    invalidatedAt,
    status: "GRADED" as const,
  };
}

describe("assessment event ranking", () => {
  test("never ranks provisional scores that still need teacher review", () => {
    const ranked = rankAssessmentEventAttempts([
      attempt("complete", 5, "2026-09-04T10:05:00.000Z"),
      { ...attempt("pending", 9, "2026-09-04T10:04:00.000Z"), status: "IN_REVIEW" },
    ]);
    expect(ranked.map(({ attemptId }) => attemptId)).toEqual(["complete"]);
  });
  test("ranks by score, completion time, then submission timestamp", () => {
    const ranked = rankAssessmentEventAttempts([
      attempt("slow-high", 9, "2026-09-04T10:10:00.000Z"),
      attempt("fast-low", 8, "2026-09-04T10:01:00.000Z"),
      attempt("fast-high", 9, "2026-09-04T10:05:00.000Z"),
    ]);

    expect(ranked.map(({ attemptId }) => attemptId)).toEqual([
      "fast-high",
      "slow-high",
      "fast-low",
    ]);
    expect(ranked.map(({ rank }) => rank)).toEqual([1, 2, 3]);
  });

  test("excludes incomplete and invalidated attempts", () => {
    const ranked = rankAssessmentEventAttempts([
      attempt("complete", 9, "2026-09-04T10:05:00.000Z"),
      attempt("incomplete", null, null),
      attempt(
        "invalidated",
        10,
        "2026-09-04T10:04:00.000Z",
        new Date("2026-09-04T11:00:00.000Z"),
      ),
    ]);

    expect(ranked.map(({ attemptId }) => attemptId)).toEqual(["complete"]);
  });
});
