import { describe, expect, test } from "bun:test";
import { isVocabularyAnswerCorrect } from "./vocabulary-practice";

describe("daily vocabulary recall", () => {
  test("optimistic grading matches the server normalization rule", () => {
    expect(isVocabularyAnswerCorrect("  학교  ", "학교")).toBe(true);
    expect(isVocabularyAnswerCorrect("ＳＣＨＯＯＬ", "school")).toBe(true);
    expect(isVocabularyAnswerCorrect("학 교", "학교")).toBe(false);
    expect(isVocabularyAnswerCorrect("   ", "")).toBe(false);
  });
});
