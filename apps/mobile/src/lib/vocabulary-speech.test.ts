import { describe, expect, test } from "bun:test";

import {
  isSpeechAnswerCorrect,
  matchSpeechAlternative,
  speechLangForMode,
} from "./vocabulary-speech";

describe("vocabulary speech helpers", () => {
  test("maps modes to recognizer locales", () => {
    expect(speechLangForMode("KR")).toBe("ko-KR");
    expect(speechLangForMode("ID")).toBe("id-ID");
  });

  test("matches any alternative with normalization", () => {
    expect(matchSpeechAlternative("학교", [" 학교 "])).toBe(" 학교 ");
    expect(matchSpeechAlternative("Sekolah", ["sekolah"])).toBe("sekolah");
    expect(
      matchSpeechAlternative("학교", ["학 교".replace(" ", ""), "책"]),
    ).toBe("학교");
  });

  test("rejects non-matches and empty input", () => {
    expect(isSpeechAnswerCorrect("학교", ["책"])).toBeFalse();
    expect(isSpeechAnswerCorrect("학교", [])).toBeFalse();
    expect(isSpeechAnswerCorrect("", ["학교"])).toBeFalse();
    // Wrong answers still surface: caller falls back to the first transcript.
    expect(matchSpeechAlternative("학교", ["책"])).toBeNull();
  });
});
