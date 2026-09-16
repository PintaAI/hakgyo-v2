import { describe, expect, test } from "bun:test";
import {
  DECK_CARD_HEIGHT,
  vocabularyDeckPose,
  vocabularyDeckOrdinals,
  vocabularyDeckSwipe,
  prepareVocabularySwipeThrow,
  vocabularySwipeCardPose,
  type VocabularySwipeMotion,
} from "./vocabulary-deck-motion";

describe("bounded deck rendering", () => {
  test("omitted cards are fully covered throughout every button transition", () => {
    for (const count of [1, 2, 3, 5, 6, 24]) {
      for (let index = 0; index < count; index++) {
        const mounted = vocabularyDeckOrdinals(index, count, []);
        expect(mounted.length).toBeLessThanOrEqual(5);
        for (const progress of [0, 0.25, 0.5, 0.75, 0.99999]) {
          const turn = index + progress;
          for (let ordinal = 0; ordinal < count; ordinal++) {
            if (mounted.includes(ordinal)) continue;
            const omitted = vocabularyDeckPose(ordinal, count, turn);
            expect(
              mounted.some((visible) => {
                const cover = vocabularyDeckPose(visible, count, turn);
                return (
                  cover.zIndex > omitted.zIndex &&
                  cover.depth === omitted.depth &&
                  cover.scale === omitted.scale &&
                  cover.rotation === omitted.rotation &&
                  cover.translateY === omitted.translateY
                );
              }),
            ).toBeTrue();
          }
        }
      }
    }
  });

  test("retains concurrent flights and covers gaps in small, wrapping decks", () => {
    expect(vocabularyDeckOrdinals(0, 0, [])).toEqual([]);
    expect(vocabularyDeckOrdinals(4, 6, [0, 1, 2])).toEqual([0, 1, 2, 3, 4, 5]);
    const ordinals = vocabularyDeckOrdinals(12, 2400, [1, 6, 9, 11]);
    expect(ordinals).toEqual([1, 6, 9, 11, 12, 13, 14, 15, 16]);
    expect(vocabularyDeckOrdinals(24, 24, [])).toEqual([0, 1, 2, 3, 4]);
  });
});

describe("vocabulary deck choreography", () => {
  test("each card reaches the front exactly once in a round", () => {
    for (const count of [1, 2, 3, 24]) {
      const seen = new Set<number>();
      for (let turn = 0; turn < count; turn++) {
        const poses = Array.from({ length: count }, (_, ordinal) => ({
          ordinal,
          ...vocabularyDeckPose(ordinal, count, turn),
        }));
        const front = poses.find((pose) => pose.zIndex === count)!;
        expect(front.ordinal).toBe(turn);
        expect(front.depth).toBe(0);
        expect(front.rotation).toBeCloseTo(0);
        seen.add(front.ordinal);
      }
      expect(seen.size).toBe(count);
    }
  });

  test("swings counterclockwise about a stationary bottom-left anchor on departure", () => {
    for (const progress of [0.05, 0.15, 0.25, 0.45]) {
      const pose = vocabularyDeckPose(0, 24, progress);
      expect(pose.rotation).toBeLessThan(0);
      expect(pose.scale).toBe(1);
      expect(pose.translateY).toBeCloseTo(0);
      expect(pose.zIndex).toBe(24);
    }
  });

  test("only moves behind the next face after clearing its left edge", () => {
    const outgoing = vocabularyDeckPose(0, 24, 0.5);
    const incoming = vocabularyDeckPose(1, 24, 0.5);
    const radians = (outgoing.rotation * Math.PI) / 180;
    // At <-90°, all three moving corners are left of the stationary anchor.
    for (const width of [240, 320, 430, 768]) {
      const topLeftX = DECK_CARD_HEIGHT * Math.sin(radians);
      const bottomRightX = width * Math.cos(radians);
      const topRightX = topLeftX + bottomRightX;
      expect(Math.max(topLeftX, topRightX, bottomRightX)).toBeLessThan(0);
    }
    expect(outgoing.zIndex).toBeLessThan(incoming.zIndex);
    expect(incoming.depth).toBe(0);
    expect(incoming.scale).toBe(1);
  });

  test("positions remain continuous when the counter reaches the next integer", () => {
    for (const count of [1, 2, 3, 24]) {
      for (let next = 1; next <= count; next++) {
        for (let ordinal = 0; ordinal < count; ordinal++) {
          const before = vocabularyDeckPose(ordinal, count, next - 0.0000001);
          const after = vocabularyDeckPose(ordinal, count, next);
          expect(before.rotation).toBeCloseTo(after.rotation, 3);
          expect(before.scale).toBeCloseTo(after.scale, 3);
          expect(before.translateY).toBeCloseTo(after.translateY, 3);
        }
      }
    }
  });

  test("the answered card settles at the back with bounded stack depth", () => {
    for (const count of [2, 3, 24]) {
      const returned = vocabularyDeckPose(0, count, 1);
      expect(returned.zIndex).toBe(1);
      expect(returned.depth).toBe(Math.min(count - 1, 3));
      expect(returned.scale).toBeGreaterThanOrEqual(0.895);
    }
  });
});

describe("independent upward swipe", () => {
  const height = DECK_CARD_HEIGHT;
  const motion: VocabularySwipeMotion = {
    ordinal: 0,
    x: 12,
    y: -80,
    releaseProgress: vocabularyDeckSwipe(-80, -800, height).progress,
    flight: null,
    status: "dragging",
  };

  test("follows the finger without the button's corner rotation", () => {
    expect(vocabularySwipeCardPose(motion, motion.releaseProgress)).toEqual({
      x: 12,
      y: -80,
      scale: 1,
      rotation: 0,
    });
    expect(
      vocabularyDeckPose(0, 24, motion.releaseProgress).rotation,
    ).toBeLessThan(-30);
  });

  test("accepts a deliberate pull or quick flick, but rejects jitter and pullback", () => {
    expect(vocabularyDeckSwipe(-70, 0, height).commit).toBeTrue();
    expect(vocabularyDeckSwipe(-25, -700, height).commit).toBeTrue();
    expect(vocabularyDeckSwipe(-25, 0, height).commit).toBeFalse();
    expect(vocabularyDeckSwipe(-8, -2000, height).commit).toBeFalse();
    expect(vocabularyDeckSwipe(-90, 400, height).commit).toBeFalse();
    expect(vocabularyDeckSwipe(20, 0, height).commit).toBeFalse();
  });

  test("keeps a held card in front until release, even on a long drag", () => {
    for (const distance of [8, 80, 200, 1000]) {
      const pull = vocabularyDeckSwipe(-distance, 0, height);
      expect(pull.progress).toBeLessThan(0.5);
      expect(vocabularyDeckPose(0, 24, pull.progress).zIndex).toBe(24);
    }
  });

  test("hands the exact release position and velocity to the physics simulation", () => {
    const throwing = prepareVocabularySwipeThrow(
      motion,
      motion.releaseProgress,
      275,
      -3250,
      328,
      height,
      24,
    );
    expect(vocabularySwipeCardPose(throwing, motion.releaseProgress)).toEqual(
      vocabularySwipeCardPose(motion, motion.releaseProgress),
    );
    expect(throwing.flight?.velocityX).toBe(275);
    expect(throwing.flight?.velocityY).toBe(-3250);
  });

  test("settles canceled gestures without consuming the card", () => {
    const canceled: VocabularySwipeMotion = { ...motion, status: "settling" };
    expect(vocabularySwipeCardPose(canceled, motion.releaseProgress).y).toBe(
      -80,
    );
    const settled = vocabularySwipeCardPose(canceled, 0);
    expect(settled.x).toBe(0);
    expect(settled.y).toBeCloseTo(0);
    expect(settled.rotation).toBe(0);
    expect(vocabularyDeckPose(0, 24, 0).zIndex).toBe(24);
  });
});
