import { describe, expect, test } from "bun:test";

import { countChange, formatHours, ratioChange } from "./format";

describe("analytics change figures", () => {
  test("counts change as a percentage", () => {
    expect(countChange(12, 10)).toEqual({ text: "+20%", direction: "up" });
    expect(countChange(5, 10)).toEqual({ text: "−50%", direction: "down" });
    expect(countChange(10, 10)).toEqual({ text: "0%", direction: "flat" });
    expect(countChange(4, 0)).toBeNull();
  });

  test("tenfold growth reads as a multiple", () => {
    expect(countChange(930, 10)).toEqual({
      text: "93× lipat",
      direction: "up",
    });
  });

  test("ratios change in percentage points", () => {
    expect(ratioChange(0.73, 0.82)).toEqual({
      text: "−9 poin",
      direction: "down",
    });
    expect(ratioChange(0.7, null)).toBeNull();
  });

  test("review turnaround switches to days after two days", () => {
    expect(formatHours(0.5)).toBe("< 1 jam");
    expect(formatHours(26.2)).toBe("26 jam");
    expect(formatHours(72)).toBe("3 hari");
    expect(formatHours(null)).toBe("—");
  });
});
