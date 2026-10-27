import { describe, expect, test } from "bun:test";

import {
  formatScore,
  formatScoreOutOf,
  hasScoreDecimals,
  parseQuestionPoints,
  parseScoreInput,
  parseScoreValue,
  reachesPercent,
  questionPointsSchema,
  readScoreBands,
  roundScore,
  scoreBandResults,
  sumScores,
} from "./assessment-score";

describe("assessment scores", () => {
  test("sums stay exact to two decimals", () => {
    expect(sumScores(Array.from({ length: 40 }, () => 2.5))).toBe(100);
    expect(sumScores([0.1, 0.2])).toBe(0.3);
    expect(roundScore(-0.001)).toBe(0);
  });

  test("points allow two decimals", () => {
    expect(hasScoreDecimals(2.5)).toBe(true);
    expect(hasScoreDecimals(0.25)).toBe(true);
    expect(hasScoreDecimals(1.005)).toBe(false);
    expect(questionPointsSchema.safeParse(2.5).success).toBe(true);
    expect(questionPointsSchema.safeParse(0).success).toBe(false);
    expect(questionPointsSchema.safeParse(1.333).success).toBe(false);
  });

  test("formats with a decimal comma", () => {
    expect(formatScore(2.5)).toBe("2,5");
    expect(formatScore(40)).toBe("40");
    expect(formatScoreOutOf(37.5, 100)).toBe("37,5/100");
    expect(formatScoreOutOf(1, 2, " / ")).toBe("1 / 2");
  });

  test("parses teacher input with comma or dot", () => {
    expect(parseScoreInput("2,5")).toBe(2.5);
    expect(parseScoreInput(" 3.25 ")).toBe(3.25);
    expect(parseScoreInput("abc")).toBeNaN();
    expect(parseScoreInput("-1")).toBeNaN();
    expect(parseScoreInput("2,")).toBe(2);
    expect(parseScoreInput(",5")).toBe(0.5);
    expect(parseScoreInput(",")).toBeNaN();
    expect(parseQuestionPoints("2,5")).toBe(2.5);
    expect(parseQuestionPoints("0")).toBeNull();
    expect(parseQuestionPoints("1,234")).toBeNull();
    expect(parseScoreValue("0", 2.5)).toBe(0);
    expect(parseScoreValue("2,5", 2.5)).toBe(2.5);
    expect(parseScoreValue("3", 2.5)).toBeNull();
  });

  test("thresholds absorb float noise but not real differences", () => {
    // (72.5 / 125) * 100 is 57.99999999999999 in floating point.
    expect((72.5 / 125) * 100 < 58).toBe(true);
    expect(reachesPercent(72.5, 125, 58)).toBe(true);
    expect(reachesPercent(72.49, 125, 58)).toBe(false);
    expect(reachesPercent(60, 100, 60)).toBe(true);
    expect(reachesPercent(57.5, 100, 60)).toBe(false);
    expect(reachesPercent(null, 100, 0)).toBe(false);
    expect(reachesPercent(5, 0, 0)).toBe(false);
  });

  test("score bands", () => {
    const bands = readScoreBands([
      { label: "Sektor lain", minPercent: 45 },
      { label: "Manufaktur", minPercent: 60 },
    ]);
    expect(bands.map((band) => band.label)).toEqual([
      "Manufaktur",
      "Sektor lain",
    ]);
    expect(readScoreBands("nonsense")).toEqual([]);
    expect(readScoreBands(null)).toEqual([]);
    expect(
      scoreBandResults(60, 100, bands).map((band) => band.reached),
    ).toEqual([true, true]);
    expect(
      scoreBandResults(22.5, 40, bands).map((band) => band.reached),
    ).toEqual([false, true]);
    expect(scoreBandResults(0, 0, bands).every((band) => !band.reached)).toBe(
      true,
    );
  });
});
