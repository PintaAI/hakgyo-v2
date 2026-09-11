import { describe, expect, test } from "bun:test";

import { getContrastRatio } from "~/lib/colors";
import {
  createOrganizationThemePalette,
  createOrganizationThemeRuntime,
  normalizeOrganizationTheme,
  parseOrganizationTheme,
} from "~/lib/organization-theme";

describe("organization theme", () => {
  test("parses the small persisted theme shape", () => {
    expect(
      parseOrganizationTheme({
        primary: "#2563EB",
        background: "#F8FAFC",
        foreground: "#172033",
        darkBrightness: 25,
        density: "comfortable",
        font: "inter",
        radius: "small",
        shadow: { x: 0, y: 4, blur: 12, spread: -2, opacity: 14 },
        size: "default",
      }),
    ).toEqual({
      primary: "#2563EB",
      background: "#F8FAFC",
      foreground: "#172033",
      darkBrightness: 25,
      density: "comfortable",
      font: "inter",
      radius: "small",
      shadow: { x: 0, y: 4, blur: 12, spread: -2, opacity: 14 },
      size: "default",
    });
    expect(parseOrganizationTheme({ primary: "blue" })).toBeNull();
  });

  test("normalizes AI colors and repairs weak body-text contrast", () => {
    const theme = normalizeOrganizationTheme({
      primary: "2563eb",
      background: "777777",
      foreground: "cbd5e1",
      darkBrightness: 25,
      density: "comfortable",
      font: "geist",
      radius: "large",
      shadow: { x: 0, y: 4, blur: 12, spread: -2, opacity: 14 },
      size: "default",
    });

    expect(theme.primary).toBe("#2563EB");
    expect(
      getContrastRatio(theme.background, "#111827"),
    ).toBeGreaterThanOrEqual(10);
    expect(
      getContrastRatio(theme.background, theme.foreground),
    ).toBeGreaterThanOrEqual(7);
  });

  test("derives dark and sidebar colors without storing extra tokens", () => {
    const palette = createOrganizationThemePalette(
      {
        primary: "#2563EB",
        background: "#F8FAFC",
        foreground: "#172033",
        darkBrightness: 25,
        density: "comfortable",
        font: "geist",
        radius: "large",
        shadow: { x: 0, y: 4, blur: 12, spread: -2, opacity: 14 },
        size: "default",
      },
      25,
    );

    expect(palette.background.light).toBe("#F8FAFC");
    expect(palette.background.dark).not.toBe(palette.background.light);
    expect(
      getContrastRatio(palette.background.dark, "#FFFFFF"),
    ).toBeGreaterThan(17);
    expect(
      getContrastRatio(palette.primary.light, "#111827"),
    ).toBeGreaterThanOrEqual(7);
    expect(
      getContrastRatio(palette.primary.dark, "#FFFFFF"),
    ).toBeGreaterThanOrEqual(7);
    expect(palette.sidebar.dark).not.toBe(palette.background.dark);
    expect(palette.muted.light).not.toBe(palette.card.light);
    expect(palette.muted.dark).not.toBe(palette.card.dark);
  });

  test("creates serializable first-paint attributes and tokens", () => {
    const runtime = createOrganizationThemeRuntime({
      primary: "#2563EB",
      background: "#F8FAFC",
      foreground: "#172033",
      darkBrightness: 25,
      density: "compact",
      font: "inter",
      radius: "small",
      shadow: { x: 0, y: 4, blur: 12, spread: -2, opacity: 14 },
      size: "small",
    });

    expect(runtime.dataset).toEqual({
      appBackground: "generated",
      appColor: "generated",
      appDensity: "compact",
      appFont: "inter",
      appForeground: "generated",
      appRadius: "small",
      appShadow: "custom",
      appSize: "small",
    });
    expect(runtime.properties["--app-background-light"]).toBe("#F8FAFC");
    expect(runtime.properties["--app-background-dark"]).not.toBe("#F8FAFC");
    expect(runtime.properties["--app-card-dark"]).toMatch(/^#[0-9A-F]{6}$/);
    expect(runtime.properties["--app-shadow-lg"]).toBe(
      "0px 4px 12px -2px rgb(0 0 0 / 14%)",
    );
  });
});
