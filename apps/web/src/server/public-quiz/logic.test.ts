import { describe, expect, test } from "bun:test";

import {
  createPublicQuizSlug,
  gradePublicQuiz,
  isOffensiveName,
  isPublicQuizAcceptingStarts,
  normalizeDisplayName,
  publicQuizIssues,
  publicQuizSubmitDeadline,
  sanitizeDisplayName,
  type GradableQuestion,
} from "./logic";

const questions: GradableQuestion[] = [
  {
    id: "q1",
    type: "SINGLE_CHOICE",
    points: 2,
    options: [
      { id: "a", isCorrect: true },
      { id: "b", isCorrect: false },
    ],
  },
  {
    id: "q2",
    type: "MULTIPLE_CHOICE",
    points: 3,
    options: [
      { id: "c", isCorrect: true },
      { id: "d", isCorrect: true },
      { id: "e", isCorrect: false },
    ],
  },
];

describe("gradePublicQuiz", () => {
  test("scores exact matches only", () => {
    const result = gradePublicQuiz(questions, [
      { questionId: "q1", optionIds: ["a"] },
      { questionId: "q2", optionIds: ["c"] },
    ]);
    expect(result.score).toBe(2);
    expect(result.maxScore).toBe(5);
    expect(result.answers.map((answer) => answer.correct)).toEqual([
      true,
      false,
    ]);
  });

  test("ignores foreign and duplicate options", () => {
    const result = gradePublicQuiz(questions, [
      { questionId: "q2", optionIds: ["d", "c", "c", "zzz"] },
      { questionId: "unknown", optionIds: ["a"] },
    ]);
    expect(result.score).toBe(3);
    expect(result.answers).toEqual([
      { questionId: "q1", optionIds: [], correct: false },
      { questionId: "q2", optionIds: ["c", "d"], correct: true },
    ]);
  });
});

describe("publicQuizIssues", () => {
  test("accepts choice questions with answers", () => {
    expect(publicQuizIssues(questions)).toEqual([]);
  });

  test("rejects empty, written and unanswered questions", () => {
    expect(publicQuizIssues([])).toHaveLength(1);
    expect(
      publicQuizIssues([
        { id: "w", type: "WRITTEN", points: 1, options: [] },
        {
          id: "x",
          type: "SINGLE_CHOICE",
          points: 1,
          options: [{ id: "o", isCorrect: false }],
        },
      ]),
    ).toHaveLength(2);
  });
});

test("normalizeDisplayName collapses whitespace and empties", () => {
  expect(normalizeDisplayName("  Ji   Woo ")).toBe("Ji Woo");
  expect(normalizeDisplayName("   ")).toBeNull();
  expect(normalizeDisplayName(undefined)).toBeNull();
});

test("isPublicQuizAcceptingStarts respects status and closing time", () => {
  const now = new Date("2026-10-05T10:00:00Z");
  expect(
    isPublicQuizAcceptingStarts({ status: "OPEN", closesAt: null }, now),
  ).toBe(true);
  expect(
    isPublicQuizAcceptingStarts(
      { status: "OPEN", closesAt: new Date("2026-10-05T09:00:00Z") },
      now,
    ),
  ).toBe(false);
  expect(
    isPublicQuizAcceptingStarts({ status: "CLOSED", closesAt: null }, now),
  ).toBe(false);
});

test("publicQuizSubmitDeadline adds the grace period to the time limit", () => {
  const startedAt = new Date("2026-10-05T10:00:00Z");
  expect(publicQuizSubmitDeadline(startedAt, null)).toBeNull();
  expect(publicQuizSubmitDeadline(startedAt, 10)?.toISOString()).toBe(
    "2026-10-05T10:11:00.000Z",
  );
});

test("createPublicQuizSlug uses the unambiguous alphabet", () => {
  const slug = createPublicQuizSlug((size) =>
    Uint8Array.from({ length: size }, (_, index) => index * 7),
  );
  expect(slug).toMatch(/^[a-km-z2-9]{6}$/);
});

describe("leaderboard names", () => {
  test("blocks profanity, including spacing, repeats and leetspeak", () => {
    expect(isOffensiveName("anjingg")).toBe(true);
    expect(isOffensiveName("B4NGS4T")).toBe(true);
    expect(isOffensiveName("dasar_bangsat_lu")).toBe(true);
    expect(isOffensiveName("si tai")).toBe(true);
  });

  test("keeps ordinary names, even with blocked short words inside", () => {
    expect(isOffensiveName("Taiyo")).toBe(false);
    expect(isOffensiveName("Asuka")).toBe(false);
    expect(isOffensiveName("Rahmat Hidayat")).toBe(false);
    expect(isOffensiveName("Kim Ji-woo")).toBe(false);
  });

  test("offensive names fall back to anonymous", () => {
    expect(sanitizeDisplayName("  kontol ")).toBeNull();
    expect(sanitizeDisplayName(" Dewi  Lestari ")).toBe("Dewi Lestari");
  });
});
