import { describe, expect, test } from "bun:test";

import { objectKeyFor } from "./audio-manifest";
import {
  expectedSpeech,
  hangulOnly,
  judgeTake,
  measureFromSilences,
  soundKey,
  syllableCount,
} from "./audio-process";
import { spokenText } from "./generate-audio";

describe("take check", () => {
  test("reads Whisper's digits as Sino-Korean numbers", () => {
    expect(hangulOnly("4")).toBe("사");
    expect(hangulOnly("오!")).toBe("오");
    expect(syllableCount("괜찮아요.")).toBe(4);
  });

  test("folds vowels that sound the same in Seoul speech", () => {
    expect(soundKey("외")).toBe(soundKey("왜"));
    expect(soundKey("개")).toBe(soundKey("게"));
    expect(soundKey("얘기")).toBe(soundKey("예기"));
    expect(soundKey("사다")).not.toBe(soundKey("싸다"));
    expect(soundKey("어")).not.toBe(soundKey("오"));
  });

  test("passes a clean take and explains a bad one", () => {
    expect(
      judgeTake("아", { duration: 1.3, speech: 0.5, gaps: 0 }, "아").ok,
    ).toBe(true);
    expect(
      judgeTake("사", { duration: 1.3, speech: 0.5, gaps: 0 }, "4").ok,
    ).toBe(true);
    const bad = judgeTake(
      "아",
      { duration: 1.8, speech: 1.76, gaps: 1 },
      "아아앜 앤",
    );
    expect(bad.ok).toBe(false);
    expect(bad.problems).toEqual([
      'heard "아아앜 앤"',
      "long (1.76 s)",
      "1 pause(s) inside",
    ]);
    expect(bad.score).toBeGreaterThan(
      judgeTake("아", { duration: 1, speech: 0.5, gaps: 0 }, "어").score,
    );
  });

  test("allows longer speech for longer texts", () => {
    expect(expectedSpeech("괜찮아요").max).toBeGreaterThan(
      expectedSpeech("아").max,
    );
    expect(
      judgeTake(
        "괜찮아요",
        { duration: 1.5, speech: 1.2, gaps: 0 },
        "괜찮아요.",
      ).ok,
    ).toBe(true);
    expect(
      judgeTake("아", { duration: 1.5, speech: 1.2, gaps: 0 }, "아").ok,
    ).toBe(false);
  });
});

describe("silence measure", () => {
  test("separates leading and trailing silence from pauses inside", () => {
    const log = [
      "silence_start: 0",
      "silence_end: 0.7",
      "silence_start: 0.9",
      "silence_end: 1.1",
      "silence_start: 1.4",
      "silence_end: 1.6",
    ].join("\n");
    const measure = measureFromSilences(log, 1.6);
    expect(measure.gaps).toBe(1);
    expect(measure.speech).toBeCloseTo(0.7);
  });

  test("treats a take without silences as all speech", () => {
    expect(measureFromSilences("", 0.8)).toEqual({
      duration: 0.8,
      speech: 0.8,
      gaps: 0,
    });
  });
});

describe("clips", () => {
  test("object keys are content addressed", () => {
    const key = objectKeyFor(new Uint8Array([1, 2, 3]));
    expect(key).toMatch(/^hangeul-mastery\/audio\/[0-9a-f]{24}\.mp3$/);
    expect(objectKeyFor(new Uint8Array([1, 2, 3]))).toBe(key);
    expect(objectKeyFor(new Uint8Array([1, 2, 4]))).not.toBe(key);
  });

  test("short texts end with a period", () => {
    expect(spokenText("아")).toBe("아.");
    expect(spokenText("괜찮아요?")).toBe("괜찮아요?");
  });
});
