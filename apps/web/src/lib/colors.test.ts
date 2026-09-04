import { describe, expect, it } from "bun:test";

import {
  createCardColorPair,
  DEFAULT_DARK_BRIGHTNESS,
  createSidebarColorPair,
  createThemeColorPair,
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

  it("creates role-aware dark theme colors from one base color", () => {
    const background = createThemeColorPair("#FF0000", "background");
    const foreground = createThemeColorPair("#581C87", "foreground");
    const accent = createThemeColorPair("#2563EB", "accent");

    expect(background).toEqual({ light: "#FF0000", dark: "#2A0E0E" });
    expect(foreground.light).toBe("#581C87");
    expect(getContrastRatio(background.dark, foreground.dark)).toBeGreaterThan(
      4.5,
    );
    expect(accent.dark).not.toBe(accent.light);
  });

  it("creates a related but distinct sidebar surface", () => {
    const background = createThemeColorPair("#FFFFFF", "background");
    const sidebar = createSidebarColorPair(background);

    expect(sidebar).toEqual({ light: "#F9F9F9", dark: "#252525" });
    expect(sidebar.light).not.toBe(background.light);
    expect(sidebar.dark).not.toBe(background.dark);
  });

  it("creates a distinct card surface from the page background", () => {
    const background = createThemeColorPair("#FFF1F3", "background");
    const card = createCardColorPair(background);

    expect(card.light).not.toBe(background.light);
    expect(card.dark).not.toBe(background.dark);
  });

  it("adjusts every generated dark role from one brightness value", () => {
    const darkerBackground = createThemeColorPair("#FFFFFF", "background", 0);
    const brighterBackground = createThemeColorPair(
      "#FFFFFF",
      "background",
      100,
    );
    const defaultBackground = createThemeColorPair(
      "#FFFFFF",
      "background",
      DEFAULT_DARK_BRIGHTNESS,
    );

    expect(getContrastRatio(darkerBackground.dark, "#000000")).toBeLessThan(
      getContrastRatio(defaultBackground.dark, "#000000"),
    );
    expect(getContrastRatio(defaultBackground.dark, "#000000")).toBeLessThan(
      getContrastRatio(brighterBackground.dark, "#000000"),
    );
  });
});
