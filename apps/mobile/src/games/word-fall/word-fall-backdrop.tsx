import { memo, useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

/**
 * Hujan Kata's backdrop: thin rain falling behind the words, in two layers
 * at different speeds for depth, and the line the ship defends.
 *
 * Each layer is one view that slides down by its own height and starts over,
 * so the rain costs two transforms a frame however many streaks it has. It
 * stops with the game (a pause, Beku) and stays still under Reduce Motion.
 */

type Layer = {
  count: number;
  width: number;
  length: number;
  opacity: number;
  /** Time to fall one field height, in ms. */
  durationMs: number;
  seed: number;
};

const LAYERS: Layer[] = [
  { count: 16, width: 1, length: 12, opacity: 0.1, durationMs: 9_000, seed: 3 },
  {
    count: 9,
    width: 1.5,
    length: 22,
    opacity: 0.16,
    durationMs: 5_200,
    seed: 11,
  },
];

/** The same streaks every time: a small seeded generator, not Math.random. */
function streaksFor(layer: Layer) {
  let state = layer.seed;
  const random = () => {
    state = (state * 48271) % 2147483647;
    return state / 2147483647;
  };
  return Array.from({ length: layer.count }, () => ({
    x: random(),
    y: random(),
  }));
}

const RainLayer = memo(function RainLayer({
  layer,
  width,
  height,
  color,
  moving,
}: {
  layer: Layer;
  width: number;
  height: number;
  color: string;
  moving: boolean;
}) {
  const streaks = useMemo(() => streaksFor(layer), [layer]);
  const fallen = useSharedValue(0);
  useEffect(() => {
    if (!moving) {
      cancelAnimation(fallen);
      return;
    }
    // Finish the lap it stopped in, then loop.
    fallen.value = withTiming(
      1,
      {
        duration: layer.durationMs * (1 - fallen.value),
        easing: Easing.linear,
      },
      (finished) => {
        if (!finished) return;
        fallen.value = 0;
        fallen.value = withRepeat(
          withTiming(1, { duration: layer.durationMs, easing: Easing.linear }),
          -1,
          false,
        );
      },
    );
    return () => cancelAnimation(fallen);
  }, [fallen, layer.durationMs, moving]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: (fallen.value - 1) * height }],
  }));
  return (
    // Twice the field's height, drawn twice, so the loop has no seam.
    <Animated.View style={[styles.layer, { height: height * 2 }, style]}>
      {[0, 1].map((copy) =>
        streaks.map((streak, index) => (
          <View
            key={`${copy}-${index}`}
            style={{
              backgroundColor: color,
              borderRadius: layer.width,
              height: layer.length,
              left: streak.x * width,
              opacity: layer.opacity,
              position: "absolute",
              top: (streak.y + copy) * height,
              width: layer.width,
            }}
          />
        )),
      )}
    </Animated.View>
  );
});

export const WordFallBackdrop = memo(function WordFallBackdrop({
  width,
  height,
  color,
  lineColor,
  lineBottom,
  moving,
}: {
  width: number;
  height: number;
  /** The rain's colour; its opacity comes from the layer. */
  color: string;
  lineColor: string;
  /** The defence line's distance from the bottom of the field. */
  lineBottom: number;
  moving: boolean;
}) {
  const reducedMotion = useReducedMotion();
  if (width <= 0 || height <= 0) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {LAYERS.map((layer) => (
        <RainLayer
          key={layer.seed}
          color={color}
          height={height}
          layer={layer}
          moving={moving && !reducedMotion}
          width={width}
        />
      ))}
      {/* Where a word counts as through, open in the middle for the ship. */}
      <View style={[styles.line, { bottom: lineBottom }]}>
        <View style={[styles.lineSide, { backgroundColor: lineColor }]} />
        <View style={styles.lineGap} />
        <View style={[styles.lineSide, { backgroundColor: lineColor }]} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  layer: { left: 0, position: "absolute", right: 0, top: 0 },
  line: {
    alignItems: "center",
    flexDirection: "row",
    left: 16,
    position: "absolute",
    right: 16,
  },
  lineSide: { borderRadius: 1, flex: 1, height: 1 },
  lineGap: { width: 96 },
});
