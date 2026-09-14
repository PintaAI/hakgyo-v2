import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  createOrganizationThemeTokens,
  DEFAULT_ORGANIZATION_THEME,
  getContrastRatio,
  normalizeOrganizationTheme,
  parseOrganizationTheme,
} from "@hakgyo/shared";

import { createMobileTheme } from "../../../mobile/src/theme/organization-theme";
import { createOrganizationThemeRuntime } from "./organization-theme";

const seeds = {
  primary: "#2563EB",
  secondary: "#059669",
  accent: "#7C3AED",
  destructive: "#DC2626",
};
const theme = { ...DEFAULT_ORGANIZATION_THEME, ...seeds };

describe("organization theme contract", () => {
  test("stores only four normalized seeds and the generator version", () => {
    expect(
      normalizeOrganizationTheme({
        ...seeds,
        primary: "2563eb",
        accent: "#abc",
      }),
    ).toEqual({
      version: 2,
      ...seeds,
      accent: "#AABBCC",
    });
    expect(() =>
      normalizeOrganizationTheme({ ...seeds, primary: "blue" }),
    ).toThrow();
  });

  test("repairs non-red destructive colors without changing other brand seeds", () => {
    for (const destructive of ["#2563EB", "#808080", "#A09090", "#AA0088"]) {
      expect(normalizeOrganizationTheme({ ...seeds, destructive })).toEqual({
        version: 2,
        ...seeds,
      });
    }
  });

  test("loads compact persisted seeds and rejects unsupported versions or missing colors", () => {
    expect(parseOrganizationTheme({ version: 2, ...seeds })).toEqual(theme);
    expect(parseOrganizationTheme({ version: 3, ...seeds })).toBeNull();
    expect(
      parseOrganizationTheme({ version: 2, primary: seeds.primary }),
    ).toBeNull();
    expect(parseOrganizationTheme(null)).toBeNull();
  });

  test("upgrades legacy themes and discards independently generated surface colors", () => {
    const migrated = parseOrganizationTheme({
      ...seeds,
      background: "#FAFAFA",
      foreground: "#171717",
      card: "#FF0000",
      border: "#00FF00",
      charts: ["#000000"],
      font: "poppins",
      darkBrightness: 10,
    });
    expect(migrated).toEqual(theme);
    expect(
      parseOrganizationTheme({
        primary: "#2563EB",
        background: "#FFFFFF",
        foreground: "#171717",
      }),
    ).toEqual({ ...theme, secondary: "#2563EB", accent: "#2563EB" });
  });

  test("derived tokens cannot be overridden by extra persisted fields", () => {
    expect(
      parseOrganizationTheme({
        ...theme,
        card: "#FF0000",
        charts: ["#000000"],
      }),
    ).toEqual(theme);
  });
});

describe("shared color generation", () => {
  test("maintains readable foreground pairs for extreme seeds in both modes", () => {
    const colors = [
      "#000000",
      "#FFFFFF",
      "#FF0000",
      "#00FF00",
      "#0000FF",
      "#FFFF00",
      "#777777",
      "#2563EB",
    ];
    for (const seed of colors) {
      for (const mode of ["light", "dark"] as const) {
        for (const darkBrightness of [0, 35, 100]) {
          const tokens = createOrganizationThemeTokens(
            {
              ...theme,
              primary: seed,
              secondary: seed,
              accent: seed,
              darkBrightness,
            },
            mode,
          );
          for (const [surface, text] of [
            [tokens.background, tokens.foreground],
            [tokens.card, tokens.cardForeground],
            [tokens.popover, tokens.popoverForeground],
            [tokens.primary, tokens.primaryForeground],
            [tokens.secondary, tokens.secondaryForeground],
            [tokens.accent, tokens.accentForeground],
            [tokens.muted, tokens.mutedForeground],
            [tokens.card, tokens.mutedForeground],
            [tokens.destructive, tokens.destructiveForeground],
            [tokens.sidebar, tokens.sidebarForeground],
            [tokens.sidebarAccent, tokens.sidebarAccentForeground],
            [tokens.sidebarPrimary, tokens.sidebarPrimaryForeground],
          ]) {
            expect(getContrastRatio(surface!, text!)).toBeGreaterThanOrEqual(
              4.5,
            );
          }
          expect(
            getContrastRatio(tokens.input, tokens.card),
          ).toBeGreaterThanOrEqual(3);
          expect(
            getContrastRatio(tokens.ring, tokens.card),
          ).toBeGreaterThanOrEqual(3);
          expect(
            getContrastRatio(tokens.sidebarRing, tokens.sidebar),
          ).toBeGreaterThanOrEqual(3);
          for (const value of Object.values(tokens))
            expect(value).toMatch(/^#[0-9A-F]{6}$/);
          for (const color of [
            "Gray",
            "Brown",
            "Red",
            "Orange",
            "Yellow",
            "Green",
            "Blue",
            "Purple",
            "Pink",
          ] as const) {
            expect(
              getContrastRatio(
                tokens[`highlight${color}Text`],
                tokens[`highlight${color}Background`],
              ),
            ).toBeGreaterThanOrEqual(4.5);
          }
        }
      }
    }
  });

  test("web first-paint tokens and mobile native/NativeWind tokens are identical", () => {
    const runtime = createOrganizationThemeRuntime(theme);
    for (const mode of ["light", "dark"] as const) {
      const mobile = createMobileTheme(mode, theme);
      expect(mobile.colors).toEqual(createOrganizationThemeTokens(theme, mode));
      for (const [variable, color] of Object.entries(mobile.variables)) {
        if (!variable.startsWith("--color-")) continue;
        expect(runtime.properties[`--app-${variable.slice(8)}-${mode}`]).toBe(
          color,
        );
      }
    }
    expect(JSON.parse(JSON.stringify(runtime))).toEqual(runtime);
    expect(runtime.properties["--app-shadow-lg"]).toBe(
      "0px 4px 12px -2px rgb(0 0 0 / 14%)",
    );
  });

  test("covers every global semantic color and applies exactly the shared values in CSS", () => {
    const globals = readFileSync(
      new URL("../styles/globals.css", import.meta.url),
      "utf8",
    );
    const preferences = readFileSync(
      new URL("../styles/preferences.css", import.meta.url),
      "utf8",
    );
    const runtime = createOrganizationThemeRuntime(theme);
    for (const match of globals.matchAll(
      /--color-[\w-]+: var\(--([\w-]+)\)/g,
    )) {
      const token = match[1]!;
      for (const mode of ["light", "dark"]) {
        expect(runtime.properties[`--app-${token}-${mode}`]).toBeDefined();
        expect(preferences).toContain(
          `--${token}: var(--app-${token}-${mode});`,
        );
      }
    }
    expect(preferences).not.toContain("color-mix");
  });

  test("monochrome logos still produce five different chart colors", () => {
    for (const mode of ["light", "dark"] as const) {
      const tokens = createOrganizationThemeTokens(
        {
          ...theme,
          primary: "#777777",
          secondary: "#777777",
          accent: "#777777",
        },
        mode,
      );
      const charts = [
        tokens.chart1,
        tokens.chart2,
        tokens.chart3,
        tokens.chart4,
        tokens.chart5,
      ];
      expect(new Set(charts).size).toBe(5);
      for (const chart of charts)
        expect(getContrastRatio(chart, tokens.card)).toBeGreaterThanOrEqual(3);
    }
  });

  test("default mobile colors also come from the shared generator", () => {
    for (const mode of ["light", "dark"] as const) {
      expect(createMobileTheme(mode, null).colors).toEqual(
        createOrganizationThemeTokens(DEFAULT_ORGANIZATION_THEME, mode),
      );
    }
  });

  test("mobile falls back safely when runtime theme data is incomplete", () => {
    const incompleteTheme = {
      version: 2,
      primary: "#2563EB",
      accent: "#7C3AED",
      destructive: "#DC2626",
    };

    expect(createMobileTheme("light", incompleteTheme).colors).toEqual(
      createOrganizationThemeTokens(DEFAULT_ORGANIZATION_THEME, "light"),
    );
  });

  test("mobile organization themes change colors without changing layout", () => {
    const defaultLayout = createMobileTheme("light", null);
    const organizationLayout = createMobileTheme("light", {
      ...theme,
      density: "spacious",
      font: "merriweather",
      radius: "none",
      shadow: { x: 12, y: 24, blur: 48, spread: 16, opacity: 40 },
      size: "large",
    });

    expect(Object.keys(organizationLayout.variables).sort()).toEqual(
      Object.keys(defaultLayout.variables).sort(),
    );
  });

  test("changing seeds updates derived surfaces and leaves the input untouched", () => {
    const saved = JSON.stringify(theme);
    const before = createOrganizationThemeTokens(theme, "light");
    const after = createOrganizationThemeTokens(
      { ...theme, primary: "#FF8800", secondary: "#AA00FF", accent: "#00AAFF" },
      "light",
    );
    expect(after.background).not.toBe(before.background);
    expect(after.card).not.toBe(before.card);
    expect(after.popover).not.toBe(before.popover);
    expect(after.secondary).not.toBe(before.secondary);
    expect(after.accent).not.toBe(before.accent);
    expect(after.sidebar).not.toBe(before.sidebar);
    expect(JSON.stringify(theme)).toBe(saved);
    expect(createOrganizationThemeTokens(theme, "light")).toEqual(before);
  });
});
