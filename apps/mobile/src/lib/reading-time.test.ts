import { describe, expect, test } from "bun:test";

import {
  GUARD_MAX_SECONDS,
  GUARD_MIN_SECONDS,
  estimateReadingSeconds,
  formatCountdown,
  readingGuardSeconds,
} from "./reading-time";

function paragraph(text: string) {
  return { type: "paragraph", content: [{ type: "text", text }] };
}

describe("reading time", () => {
  test("Indonesian words at 180 a minute, Korean syllables at 120", () => {
    const words = Array.from({ length: 180 }, () => "kata").join(" ");
    expect(estimateReadingSeconds([paragraph(words)])).toBeCloseTo(60, 0);
    const syllables = "가".repeat(120);
    expect(estimateReadingSeconds([paragraph(syllables)])).toBeCloseTo(60, 0);
  });

  test("pictures, audio and tables add time", () => {
    expect(
      estimateReadingSeconds([
        { type: "image", props: { url: "a.png" } },
        { type: "audio", props: { url: "a.mp3" } },
        { type: "table", content: [] },
      ]),
    ).toBe(5 + 15 + 8);
  });

  test("the guard is half the estimate, within its bounds", () => {
    const words = (count: number) => [
      paragraph(Array.from({ length: count }, () => "kata").join(" ")),
    ];
    expect(readingGuardSeconds(words(360))).toBe(60);
    expect(readingGuardSeconds(words(5))).toBe(GUARD_MIN_SECONDS);
    expect(readingGuardSeconds(words(5000))).toBe(GUARD_MAX_SECONDS);
    expect(readingGuardSeconds(null)).toBe(GUARD_MIN_SECONDS);
  });

  test("formats the countdown", () => {
    expect(formatCountdown(42)).toBe("0:42");
    expect(formatCountdown(125)).toBe("2:05");
    expect(formatCountdown(0)).toBe("0:00");
  });
});
