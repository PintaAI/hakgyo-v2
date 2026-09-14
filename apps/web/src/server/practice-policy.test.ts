import { describe, expect, test } from "bun:test";

import {
  gradePracticeChoice,
  preparePracticeOptions,
  sampleForPractice,
  vocabularySetVersion,
} from "./practice-policy";

describe("practice policy", () => {
  test("samples deterministically without duplicates", () => {
    const values = Array.from({ length: 12 }, (_, index) => ({
      id: String(index),
    }));

    const first = sampleForPractice(values, "learner:round", 5);
    const second = sampleForPractice(values, "learner:round", 5);

    expect(second).toEqual(first);
    expect(new Set(first.map((item) => item.id)).size).toBe(5);
  });

  test("changes a vocabulary set version when its content changes", () => {
    const entries = [{ id: "word", term: "학교", definition: "school" }];

    expect(vocabularySetVersion(entries)).not.toBe(
      vocabularySetVersion([{ ...entries[0]!, definition: "a school" }]),
    );
  });

  test("grades exact option sets and rejects foreign options", () => {
    const options = [
      { id: "one", isCorrect: true },
      { id: "two", isCorrect: false },
      { id: "three", isCorrect: true },
    ];

    expect(gradePracticeChoice(options, ["three", "one"])).toEqual({
      correct: true,
      correctOptionIds: ["one", "three"],
    });
    expect(gradePracticeChoice(options, ["one"])).toEqual({
      correct: false,
      correctOptionIds: ["one", "three"],
    });
    expect(gradePracticeChoice(options, ["unknown"])).toBeNull();
    expect(
      gradePracticeChoice([{ id: "one", isCorrect: false }], []),
    ).toBeNull();
  });

  test("never exposes the answer key in practice options", () => {
    const options = preparePracticeOptions(
      [
        { id: "one", content: "A", isCorrect: true },
        { id: "two", content: "B", isCorrect: false },
      ],
      "learner:question",
    );

    expect(options).toHaveLength(2);
    expect(options.every((option) => !("isCorrect" in option))).toBeTrue();
  });
});
