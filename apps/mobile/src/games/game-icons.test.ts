import { describe, expect, test } from "bun:test";
import { getContrastRatio } from "@hakgyo/shared";

import {
  gameIconPalette,
  gameIconSvg,
  gameIconUri,
  hasGameIcon,
  type GameIconKey,
} from "./game-icons";

const KEYS: GameIconKey[] = [
  "cards",
  "assessment",
  "word-fall",
  "sentences",
  "match",
  "stroke-master",
  "syllable-forge",
  "word-builder",
];

describe("game icons", () => {
  test("every Latihan game has an icon", () => {
    for (const key of KEYS) expect(hasGameIcon(key)).toBe(true);
    expect(hasGameIcon("toString")).toBe(false);
  });

  test("draw only theme colors, so a new theme recolors all of them", () => {
    const palette = gameIconPalette("#2563EB");
    for (const key of KEYS) {
      const svg = gameIconSvg(key, palette);
      expect(svg.startsWith("<svg")).toBe(true);
      const colors = new Set(
        svg.match(/#[0-9a-f]{6}/gi)?.map((color) => color.toUpperCase()),
      );
      for (const color of colors) {
        expect(Object.values(palette).map((c) => c.toUpperCase())).toContain(
          color,
        );
      }
      expect(svg).not.toMatch(/\{(main|dark|light|on)\}/);
      // btoa needs Latin-1; the generated SVGs are plain ASCII.
      expect(/^[\x20-\x7E]*$/.test(svg)).toBe(true);
    }
  });

  test("encodes a data URI", () => {
    const uri = gameIconUri("match", gameIconPalette("#059669"));
    expect(uri.startsWith("data:image/svg+xml;base64,")).toBe(true);
    expect(atob(uri.split(",")[1]!)).toContain("#059669");
  });
});

describe("gameIconPalette", () => {
  test("shades a mid-tone primary darker and lighter", () => {
    const palette = gameIconPalette("#2563EB");
    expect(palette.main).toBe("#2563EB");
    expect(getContrastRatio(palette.dark, "#000000")).toBeLessThan(
      getContrastRatio(palette.main, "#000000"),
    );
    expect(getContrastRatio(palette.light, "#FFFFFF")).toBeLessThan(1.6);
    expect(palette.on).toBe("#FFFFFF");
  });

  test("lifts a near-black primary so main and dark stay apart", () => {
    const palette = gameIconPalette("#27272A");
    expect(palette.dark).toBe("#27272A");
    expect(getContrastRatio(palette.main, palette.dark)).toBeGreaterThan(1.5);
  });

  test("darkens a light primary until white letters read on it", () => {
    for (const primary of ["#F59E0B", "#FACC15", "#848485"]) {
      const palette = gameIconPalette(primary);
      expect(palette.on).toBe("#FFFFFF");
      expect(getContrastRatio(palette.main, "#FFFFFF")).toBeGreaterThanOrEqual(
        3,
      );
      expect(getContrastRatio(palette.dark, "#FFFFFF")).toBeGreaterThan(
        getContrastRatio(palette.main, "#FFFFFF"),
      );
    }
  });

  test("falls back to blue for a color it cannot read", () => {
    expect(gameIconPalette("rgb(1, 2, 3)").main).toBe("#2563EB");
  });
});
