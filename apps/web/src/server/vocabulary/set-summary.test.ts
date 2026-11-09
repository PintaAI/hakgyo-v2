import { describe, expect, test } from "bun:test";

import { hasExampleSentence, summarizeVocabularySet } from "./set-summary";

const NOW = new Date("2026-11-09T09:00:00.000Z");

function item(
  overrides: Partial<{
    practiced: boolean;
    learned: boolean;
    practicedAt: Date | null;
    nextReviewAt: Date | null;
  }>,
) {
  return {
    practiced: false,
    learned: false,
    practicedAt: null,
    nextReviewAt: null,
    ...overrides,
  };
}

describe("summarizeVocabularySet", () => {
  test("counts words to memorise, upcoming reviews and the last practice", () => {
    const summary = summarizeVocabularySet(
      {
        items: [
          item({}),
          item({
            practiced: true,
            practicedAt: new Date("2026-11-08T10:00:00.000Z"),
          }),
          item({
            practiced: true,
            learned: true,
            practicedAt: new Date("2026-11-07T10:00:00.000Z"),
            nextReviewAt: new Date("2026-11-12T00:00:00.000Z"),
          }),
          item({
            practiced: true,
            learned: true,
            practicedAt: new Date("2026-11-06T10:00:00.000Z"),
            nextReviewAt: new Date("2026-11-10T00:00:00.000Z"),
          }),
        ] as never,
        counts: {
          total: 4,
          new: 1,
          learning: 1,
          learned: 2,
          mastered: 0,
          due: 1,
        },
      },
      NOW,
    );
    expect(summary).toEqual({
      total: 4,
      memorize: 1,
      learned: 2,
      mastered: 0,
      due: 1,
      upcomingReviews: ["2026-11-10T00:00:00.000Z", "2026-11-12T00:00:00.000Z"],
      lastPracticedAt: "2026-11-08T10:00:00.000Z",
      withExamples: 0,
    });
  });

  test("finds example sentences in a list or in lines", () => {
    expect(hasExampleSentence(["저는 학생이에요. = Saya pelajar."])).toBe(true);
    expect(hasExampleSentence("\n  \n가요")).toBe(true);
    expect(hasExampleSentence(["", "  "])).toBe(false);
    expect(hasExampleSentence(null)).toBe(false);
  });
});
