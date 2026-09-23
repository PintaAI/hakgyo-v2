import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("syllable stage visual contract", () => {
  test("animates one persistent system-font glyph without a nested scroller", () => {
    const source = readFileSync(
      resolve(import.meta.dir, "./syllable-stage.tsx"),
      "utf8",
    );

    expect(source).toContain("style={[styles.glyphLayer, glyphStyle]}");
    expect(source).toContain("glyphOpacity.value = withTiming(1");
    expect(source).toContain("glyphScale.value = withSpring(1");
    expect(source).not.toContain('key={glyph === " " ? "space" : glyph}');
    expect(source).not.toContain("FadeIn");
    expect(source).not.toContain("FadeOut");
    expect(source).not.toContain("ScrollView");
    expect(source).not.toContain("scrollToEnd");
    expect(source).toContain('alignItems: "center"');
    expect(source).toContain('justifyContent: "center"');
    expect(source).toContain("color: colors.foreground");
    expect(source).not.toContain("function MovingPiece");
    expect(source).not.toContain("pieceText");
    expect(source).not.toContain("assembled.value = withDelay");
  });
});
