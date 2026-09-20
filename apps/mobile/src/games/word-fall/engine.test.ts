import { describe, expect, test } from "bun:test";

import {
  addWordFallReviewItem,
  analyzeTyping,
  answerTextForWord,
  comboMultiplier,
  fallDurationForLevel,
  isWordFallInputEditable,
  knockbackDelayMs,
  levelForDestroyed,
  maskedDefinition,
  maximumActiveWords,
  pointsForWord,
  pushStrengthForLevel,
  selectWordTarget,
  wordFallResult,
} from "./engine";

describe("word fall engine", () => {
  test("only reports a clean completion as correct", () => {
    expect(wordFallResult(false)).toBe("CORRECT");
    expect(wordFallResult(true)).toBe("INCORRECT");
  });

  test("targets a farther word when its answer matches the typed prefix", () => {
    const candidates = [
      { id: "near", answer: "apple", impactAt: 100 },
      { id: "far", answer: "banana", impactAt: 200 },
    ];
    expect(selectWordTarget(candidates, "b")).toBe("far");
  });

  test("uses proximity only to break ties between matching answers", () => {
    const candidates = [
      { id: "far", answer: "apricot", impactAt: 200 },
      { id: "near", answer: "apple", impactAt: 100 },
    ];
    expect(selectWordTarget(candidates, "a")).toBe("near");
  });

  test("keeps the keyboard input active between falling words", () => {
    expect(isWordFallInputEditable("running")).toBe(true);
    expect(isWordFallInputEditable("ready")).toBe(false);
    expect(isWordFallInputEditable("paused")).toBe(false);
    expect(isWordFallInputEditable("gameover")).toBe(false);
  });

  test("uses the definition as the typed answer", () => {
    expect(
      answerTextForWord({
        id: "korea",
        term: "한국",
        definition: "South Korea",
      }),
    ).toBe("South Korea");
  });

  test("tracks the correct prefix and blocks progress after a mistake", () => {
    expect(analyzeTyping("school", "schx", 3)).toEqual({
      correctCharacters: 3,
      gainedCharacters: 0,
      completed: false,
      mistake: true,
      composing: false,
    });
    expect(analyzeTyping("school", "scho", 3).gainedCharacters).toBe(1);
  });

  test("accepts an in-progress Korean syllable without treating it as wrong", () => {
    expect(analyzeTyping("한국", "ㅎ", 0).composing).toBe(true);
    expect(analyzeTyping("한국", "하", 0).composing).toBe(true);
    expect(analyzeTyping("한국", "한", 0).gainedCharacters).toBe(1);
  });

  test("auto-completes only an exact word", () => {
    expect(analyzeTyping("한국", "한국", 1).completed).toBe(true);
    expect(analyzeTyping("한국", "한국어", 1).completed).toBe(false);
  });

  test("treats visually identical vocabulary formatting as the same answer", () => {
    const formattedTerm = "ice\u200B\u00A0cream";
    const result = analyzeTyping(formattedTerm, "ice cream", 3);
    expect(result.mistake).toBe(false);
    expect(result.completed).toBe(true);
  });

  test("scales pressure by level with bounded active words", () => {
    expect(levelForDestroyed(0)).toBe(1);
    expect(levelForDestroyed(6)).toBe(2);
    expect(maximumActiveWords(1)).toBe(1);
    expect(maximumActiveWords(99)).toBe(5);
    expect(fallDurationForLevel(1, 0.5)).toBe(30_000);
    expect(fallDurationForLevel(20, 0)).toBeLessThan(
      fallDurationForLevel(1, 0),
    );
  });

  test("keeps baseline level-one knockback subtle", () => {
    const baselinePush = pushStrengthForLevel(1, false);
    const levelOneDelay = knockbackDelayMs(
      fallDurationForLevel(1, 0.5),
      700,
      baselinePush,
    );

    expect(levelOneDelay).toBeLessThanOrEqual(200);
    expect(pushStrengthForLevel(1, true)).toBeGreaterThanOrEqual(
      baselinePush * 5,
    );
  });

  test("grows the combo multiplier gradually and caps it", () => {
    const word = { id: "school", term: "학교", definition: "school" };

    expect(comboMultiplier(1)).toBe(1);
    expect(comboMultiplier(4)).toBeCloseTo(1.3);
    expect(comboMultiplier(99)).toBe(3);
    expect(pointsForWord(word, 1, 4)).toBe(78);
  });

  test("deduplicates recap vocabulary while preserving review reasons", () => {
    const word = { id: "school", term: "학교", definition: "school" };
    const mistyped = addWordFallReviewItem([], word, "mistyped");
    const repeated = addWordFallReviewItem(mistyped, word, "mistyped");
    const missed = addWordFallReviewItem(repeated, word, "missed");

    expect(repeated).toBe(mistyped);
    expect(missed).toEqual([{ word, reasons: ["mistyped", "missed"] }]);
  });

  test("reveals one definition character for each completed character", () => {
    expect(maskedDefinition("South Korea", 3)).toBe("Sou•• •••••");
  });
});
