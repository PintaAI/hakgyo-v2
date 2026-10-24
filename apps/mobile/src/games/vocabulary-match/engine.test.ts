import { describe, expect, test } from "bun:test";

import {
  createVocabularyMatchSession,
  isVocabularyMatch,
  pointsForVocabularyMatch,
  vocabularyMatchResult,
} from "./engine";

const words = [
  { id: "one", term: "하나", meanings: ["one"] },
  { id: "two", term: "둘", meanings: ["two"] },
  { id: "three", term: "셋", meanings: ["three"] },
  { id: "four", term: "넷", meanings: ["four"] },
  { id: "five", term: "다섯", meanings: ["five"] },
  { id: "six", term: "여섯", meanings: ["six"] },
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
        { ...words[0]!, meanings: ["duplicate"] },
        { id: "blank", term: " ", meanings: ["blank"] },
      ],
      () => 0,
    );
    expect(session.wordCount).toBe(1);
    expect(session.rounds[0]!.terms[0]!.meaning).toBe("one");
  });

  test("joins every meaning and keeps words sharing one apart", () => {
    const session = createVocabularyMatchSession(
      [
        { id: "bae", term: "배", meanings: ["perut", "kapal", "pir"] },
        { id: "bae2", term: "복부", meanings: ["Perut"] },
        { id: "book", term: "책", meanings: ["buku"] },
      ],
      () => 0,
      3,
      3,
    );
    expect(session.wordCount).toBe(3);
    for (const round of session.rounds) {
      const ids = round.terms.map((term) => term.id);
      expect(ids.includes("bae") && ids.includes("bae2")).toBe(false);
    }
    const bae = session.rounds
      .flatMap((round) => round.terms)
      .find((term) => term.id === "bae");
    expect(bae?.meaning).toBe("perut; kapal; pir");
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
