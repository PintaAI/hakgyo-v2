import { describe, expect, test } from "bun:test";
import {
  vocabularyAnswerTextLayout,
  vocabularyPromptTextLayout,
  vocabularyTextUnits,
} from "./vocabulary-card-text";

describe("vocabulary card text layout", () => {
  test("keeps short words large", () => {
    expect(vocabularyPromptTextLayout("이름", false)).toMatchObject({
      fontSize: 30,
      numberOfLines: 2,
    });
    expect(vocabularyAnswerTextLayout("Name").fontSize).toBe(24);
  });

  test("gives phrases and sentences progressively more room", () => {
    const phrase = vocabularyPromptTextLayout(
      "회사에서 함께 일하는 사람",
      false,
    );
    const sentence = vocabularyPromptTextLayout(
      "회사에서 다른 직원들과 함께 업무를 수행하는 사람을 설명하는 표현이며 공식적인 상황에서도 자주 사용합니다",
      false,
    );
    expect(phrase.fontSize).toBeLessThan(30);
    expect(sentence.fontSize).toBeLessThan(phrase.fontSize);
    expect(sentence.numberOfLines).toBeGreaterThanOrEqual(phrase.numberOfLines);
  });

  test("trades image height for long prompt text", () => {
    const short = vocabularyPromptTextLayout("회사원", true);
    const long = vocabularyPromptTextLayout(
      "회사에서 다른 사람들과 함께 일하는 사람",
      true,
    );
    expect(long.imageHeight).toBeLessThan(short.imageHeight);
    expect(long.numberOfLines).toBeGreaterThan(short.numberOfLines);
  });

  test("bounds very long answers to readable card dimensions", () => {
    const short = vocabularyAnswerTextLayout("Company employee");
    const layout = vocabularyAnswerTextLayout(
      "A person who works for a company and carries out duties together with other employees in an office or another workplace.",
    );
    expect(layout.fontSize).toBeLessThan(short.fontSize);
    expect(layout.numberOfLines).toBe(5);
    expect(layout.minimumFontScale).toBeGreaterThanOrEqual(0.62);
  });

  test("accounts for the wider shape of Korean characters", () => {
    expect(vocabularyTextUnits("가나다라마")).toBeGreaterThan(
      vocabularyTextUnits("abcde"),
    );
  });
});
