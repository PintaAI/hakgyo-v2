import { describe, expect, test } from "bun:test";

import {
  createVocabularyMatchSession,
  isVocabularyMatch,
  pointsForVocabularyMatch,
  vocabularyMatchResult,
} from "./engine";

const words = [
  { id: "one", term: "하나", definition: "one" },
  { id: "two", term: "둘", definition: "two" },
  { id: "three", term: "셋", definition: "three" },
  { id: "four", term: "넷", definition: "four" },
  { id: "five", term: "다섯", definition: "five" },
  { id: "six", term: "여섯", definition: "six" },
];

describe("vocabulary match engine", () => {
  test("builds bounded rounds with no answer on the same row", () => {
    const session = createVocabularyMatchSession(words, () => 0.25, 6, 3);
    expect(session.wordCount).toBe(6);
    expect(session.rounds).toHaveLength(2);
    for (const round of session.rounds) {
      expect(round.terms).toHaveLength(3);
      expect(round.definitions).toHaveLength(3);
      expect(
        round.terms.every(
          (term, index) => term.id !== round.definitions[index]!.id,
        ),
      ).toBe(true);
    }
  });

  test("filters unusable and duplicate vocabulary", () => {
    const session = createVocabularyMatchSession(
      [
        words[0]!,
        { ...words[0]!, definition: "duplicate" },
        { id: "blank", term: " ", definition: "blank" },
      ],
      () => 0,
    );
    expect(session.wordCount).toBe(1);
    expect(session.rounds[0]!.terms[0]!.definition).toBe("one");
  });

  test("matches by stable vocabulary identity", () => {
    expect(isVocabularyMatch("one", "one")).toBe(true);
    expect(isVocabularyMatch("one", "two")).toBe(false);
  });

  test("only reports a clean match as correct", () => {
    expect(vocabularyMatchResult(false)).toBe("CORRECT");
    expect(vocabularyMatchResult(true)).toBe("INCORRECT");
  });

  test("rewards streaks with a bounded bonus", () => {
    expect(pointsForVocabularyMatch(1)).toBe(100);
    expect(pointsForVocabularyMatch(4)).toBe(160);
    expect(pointsForVocabularyMatch(99)).toBe(300);
  });
});
