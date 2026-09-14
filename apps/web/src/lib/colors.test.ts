import { describe, expect, it } from "bun:test";

import {
  getContrastRatio,
  getReadableForeground,
  normalizeHexColor,
} from "./colors";

describe("color utilities", () => {
  it("normalizes three and six digit hex colors", () => {
    expect(normalizeHexColor("abc")).toBe("#AABBCC");
    expect(normalizeHexColor("#12ef90")).toBe("#12EF90");
    expect(normalizeHexColor("not-a-color")).toBeNull();
  });

  it("calculates the WCAG contrast ratio", () => {
    expect(getContrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21);
  });

  it("chooses readable text for light and dark colors", () => {
    expect(getReadableForeground("#FFFFFF")).toBe("#111827");
    expect(getReadableForeground("#111827")).toBe("#FFFFFF");
  });
});
