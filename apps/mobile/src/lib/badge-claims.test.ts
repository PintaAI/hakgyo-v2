import { describe, expect, mock, test } from "bun:test";

// The claim store reads the device's key-value storage on use only.
void mock.module("expo-sqlite/kv-store", () => ({
  default: {
    getItemSync: () => null,
    setItemSync: () => undefined,
    removeItemSync: () => undefined,
  },
}));

const { courseCompletedAt, medalGlyph } = await import("./badge-claims");

const outline = {
  modules: [{ items: [{ id: "a" }, { id: "b" }] }, { items: [{ id: "c" }] }],
};

function attempt(gradedAt: string | null, submittedAt: string | null) {
  return {
    latest: {
      id: "attempt",
      status: "GRADED" as const,
      attemptNumber: 1,
      score: 8,
      maxScore: 10,
      startedAt: "2026-11-01T00:00:00.000Z",
      submittedAt,
      gradedAt,
    },
    count: 1,
  };
}

describe("courseCompletedAt", () => {
  test("is the latest completion or graded attempt of the course", () => {
    expect(
      courseCompletedAt(outline, {
        contentProgress: {
          a: {
            status: "COMPLETED",
            startedAt: "2026-11-01T00:00:00.000Z",
            completedAt: "2026-11-02T00:00:00.000Z",
          },
          other: {
            status: "COMPLETED",
            startedAt: "2026-11-01T00:00:00.000Z",
            completedAt: "2026-12-01T00:00:00.000Z",
          },
        },
        standaloneAttempts: {
          c: attempt("2026-11-05T00:00:00.000Z", "2026-11-04T00:00:00.000Z"),
          b: attempt(null, "2026-11-03T00:00:00.000Z"),
        },
      })?.toISOString(),
    ).toBe("2026-11-05T00:00:00.000Z");
  });

  test("is null without dated progress", () => {
    expect(
      courseCompletedAt(outline, {
        contentProgress: {},
        standaloneAttempts: {},
      }),
    ).toBeNull();
    expect(courseCompletedAt(undefined, undefined)).toBeNull();
  });
});

describe("medalGlyph", () => {
  test("uses the first letter of the course, or 한 for Hangeul", () => {
    expect(medalGlyph("  pola bahasa")).toBe("P");
    expect(medalGlyph("한국어 기초")).toBe("한");
    expect(medalGlyph("Hangeul Mastery", true)).toBe("한");
    expect(medalGlyph("")).toBe("★");
  });
});
