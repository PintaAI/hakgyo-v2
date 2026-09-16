import { describe, expect, test } from "bun:test";
import {
  vocabularyStickerPeelAtTip,
  vocabularyStickerPeelCompletion,
  vocabularyStickerPeelGesture,
} from "./vocabulary-sticker-peel";

describe("finger-driven sticker peel", () => {
  test("tracks a drag from the bottom-right corner toward the upper-left", () => {
    const start = vocabularyStickerPeelGesture(0, 0, 0, 0, 328, 224);
    const middle = vocabularyStickerPeelGesture(-164, -112, 0, 0, 328, 224);
    const end = vocabularyStickerPeelGesture(-328, -224, 0, 0, 328, 224);

    expect(start.progress).toBe(0);
    expect(middle.progress).toBeCloseTo(0.5, 4);
    expect(end.progress).toBe(1);
  });

  test("commits a substantial pull or an intentional flick", () => {
    expect(
      vocabularyStickerPeelGesture(-160, -100, 0, 0, 328, 224).commit,
    ).toBeTrue();
    expect(
      vocabularyStickerPeelGesture(-45, -30, -900, -600, 328, 224).commit,
    ).toBeTrue();
  });

  test("returns small, downward, and accidental movements to the corner", () => {
    expect(
      vocabularyStickerPeelGesture(-18, -10, 0, 0, 328, 224).commit,
    ).toBeFalse();
    expect(vocabularyStickerPeelGesture(80, 60, 1000, 900, 328, 224)).toEqual({
      progress: 0,
      commit: false,
    });
    expect(
      vocabularyStickerPeelGesture(-20, -12, 1200, 800, 328, 224).commit,
    ).toBeFalse();
  });

  test("reflects the original corner exactly onto the finger position", () => {
    const width = 328;
    const height = 224;
    const finger = { x: 176, y: 92 };
    const peel = vocabularyStickerPeelAtTip(finger.x, finger.y, width, height);
    const localX =
      peel.backLeft +
      width * peel.backMatrix[0]! +
      height * peel.backMatrix[4]!;
    const localY =
      peel.backTop + width * peel.backMatrix[1]! + height * peel.backMatrix[5]!;
    const cos = Math.cos(peel.angle);
    const sin = Math.sin(peel.angle);
    const mappedX = peel.maskLeft + localX * cos - localY * sin;
    const mappedY = peel.maskTop + localX * sin + localY * cos;

    expect(mappedX).toBeCloseTo(finger.x, 5);
    expect(mappedY).toBeCloseTo(finger.y, 5);
  });

  test("rotates the crease as the drag direction changes", () => {
    const horizontal = vocabularyStickerPeelAtTip(180, 224, 328, 224);
    const diagonal = vocabularyStickerPeelAtTip(180, 90, 328, 224);
    const vertical = vocabularyStickerPeelAtTip(328, 90, 328, 224);

    expect(horizontal.angle).toBeCloseTo(-Math.PI / 2, 5);
    expect(diagonal.angle).toBeGreaterThan(horizontal.angle);
    expect(diagonal.angle).toBeLessThan(vertical.angle);
    expect(vertical.angle).toBeCloseTo(0, 5);
  });

  test("bounds crease effects to the sticker intersection", () => {
    const width = 328;
    const height = 224;
    const horizontal = vocabularyStickerPeelAtTip(180, height, width, height);
    const diagonal = vocabularyStickerPeelAtTip(180, 90, width, height);
    const vertical = vocabularyStickerPeelAtTip(width, 90, width, height);

    expect(horizontal.creaseWidth).toBeCloseTo(height, 5);
    expect(vertical.creaseWidth).toBeCloseTo(width, 5);
    expect(diagonal.creaseWidth).toBeGreaterThan(0);
    expect(diagonal.creaseWidth).toBeLessThanOrEqual(Math.hypot(width, height));
  });

  test("finishes beyond the opposite edge along the release direction", () => {
    const target = vocabularyStickerPeelCompletion(-150, -100, 328, 224);
    const finished = vocabularyStickerPeelAtTip(
      328 + target.translationX,
      224 + target.translationY,
      328,
      224,
    );

    expect(finished.opacity).toBe(0);
    expect(finished.creaseWidth).toBe(0);
    expect(target.translationX).toBeLessThan(-328);
    expect(target.translationY).toBeLessThan(-224);
  });
});
