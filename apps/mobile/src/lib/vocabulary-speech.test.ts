import { describe, expect, test } from "bun:test";

import { matchSpeechAlternative, speechLangForMode } from "./vocabulary-speech";

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

  test("accepts any of several expected answers", () => {
    expect(matchSpeechAlternative(["perut", "kapal"], ["Kapal"])).toBe("Kapal");
    expect(matchSpeechAlternative(["perut", "kapal"], ["buku"])).toBeNull();
    expect(matchSpeechAlternative([], ["buku"])).toBeNull();
  });

  test("ignores notes in brackets and punctuation like typed answers", () => {
    expect(matchSpeechAlternative(["Panas (Cuaca)"], ["panas"])).toBe("panas");
    expect(matchSpeechAlternative(["1.000"], ["1000"])).toBe("1000");
    expect(matchSpeechAlternative("(건물) 앞", ["앞"])).toBe("앞");
  });

  test("rejects non-matches and empty input", () => {
    expect(matchSpeechAlternative("학교", [])).toBeNull();
    expect(matchSpeechAlternative("", ["학교"])).toBeNull();
    // Wrong answers still surface: caller falls back to the first transcript.
    expect(matchSpeechAlternative("학교", ["책"])).toBeNull();
  });
});
