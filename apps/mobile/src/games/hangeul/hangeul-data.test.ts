import { describe, expect, test } from "bun:test";

import {
  getHangeulLetter,
  getQuizOptions,
  HANGEUL_FAMILIES,
  HANGEUL_LETTERS,
  type HangeulLetter,
} from "./hangeul-data";

describe("Hangeul introduction data", () => {
  test("covers the basic and double Hangeul building blocks", () => {
    expect(
      HANGEUL_LETTERS.filter((letter) => letter.kind === "vowel"),
    ).toHaveLength(21);
    expect(
      HANGEUL_LETTERS.filter((letter) => letter.kind === "consonant"),
    ).toHaveLength(19);
    expect(
      new Set(HANGEUL_LETTERS.map((letter) => letter.character)),
    ).toHaveLength(40);
  });

  test("includes every double vowel and double consonant", () => {
    const doubleVowels = HANGEUL_FAMILIES.find(
      (family) => family.id === "double-vowels",
    )!.letterIds.map((id) => getHangeulLetter(id)!.character);
    const doubleConsonants = HANGEUL_FAMILIES.find(
      (family) => family.id === "double-consonants",
    )!.letterIds.map((id) => getHangeulLetter(id)!.character);

    expect(doubleVowels).toEqual([
      "ㅐ",
      "ㅒ",
      "ㅔ",
      "ㅖ",
      "ㅘ",
      "ㅙ",
      "ㅚ",
      "ㅝ",
      "ㅞ",
      "ㅟ",
      "ㅢ",
    ]);
    expect(doubleConsonants).toEqual(["ㄲ", "ㄸ", "ㅃ", "ㅆ", "ㅉ"]);
  });

  test("keeps every highlighted pronunciation example inside its note", () => {
    const examples = HANGEUL_LETTERS.filter(
      (letter): letter is HangeulLetter & { example: string } =>
        Boolean(letter.example),
    );

    expect(examples).not.toHaveLength(0);
    expect(
      examples.every((letter) => letter.note.includes(letter.example)),
    ).toBe(true);
  });

  test("places every letter in exactly one learning family", () => {
    const familyLetterIds = HANGEUL_FAMILIES.flatMap(
      (family) => family.letterIds,
    );

    expect(familyLetterIds).toHaveLength(HANGEUL_LETTERS.length);
    expect(new Set(familyLetterIds)).toHaveLength(HANGEUL_LETTERS.length);
    expect(familyLetterIds.every((id) => getHangeulLetter(id))).toBe(true);
  });

  test("builds four unique quiz options containing the correct cue", () => {
    HANGEUL_LETTERS.forEach((letter, round) => {
      const options = getQuizOptions(letter, round);

      expect(options).toHaveLength(4);
      expect(new Set(options)).toHaveLength(4);
      expect(options).toContain(letter.cue);
    });
  });
});
