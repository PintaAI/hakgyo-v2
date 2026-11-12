import { memo, useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { useAppTheme } from "../../providers/AppThemeProvider";

export type BoardRect = { x: number; y: number; width: number; height: number };

/** A chosen word on its way from the word bank to its place in the answer. */
export type WordFlight = {
  id: number;
  tileIndex: number;
  word: string;
  from: BoardRect;
  to: BoardRect;
};

/** How long the chip itself takes to arrive. */
export const FLIGHT_MS = 420;
/** The tail, as a share of the flight, that is still catching up. */
const TAIL = 0.36;
const TRAIL_DOTS = 6;

type Path = {
  x0: number;
  y0: number;
  cx: number;
  cy: number;
  x1: number;
  y1: number;
};

/** A gentle arc between two centers, bowed upward like a thrown chip. */
function arcBetween(from: BoardRect, to: BoardRect): Path {
  const x0 = from.x + from.width / 2;
  const y0 = from.y + from.height / 2;
  const x1 = to.x + to.width / 2;
  const y1 = to.y + to.height / 2;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const length = Math.max(1, Math.hypot(dx, dy));
  let nx = -dy / length;
  let ny = dx / length;
  if (ny > 0) {
    nx = -nx;
    ny = -ny;
  }
  const bend = Math.min(140, Math.max(40, length * 0.3));
  return {
    x0,
    y0,
    x1,
    y1,
    cx: (x0 + x1) / 2 + nx * bend,
    cy: (y0 + y1) / 2 + ny * bend,
  };
}

function easeInOut(t: number) {
  "worklet";
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function pointAt(path: Path, t: number) {
  "worklet";
  const u = 1 - t;
  return {
    x: u * u * path.x0 + 2 * u * t * path.cx + t * t * path.x1,
    y: u * u * path.y0 + 2 * u * t * path.cy + t * t * path.y1,
  };
}

function TrailDot({
  progress,
  path,
  index,
  color,
}: {
  progress: SharedValue<number>;
  path: Path;
  index: number;
  color: string;
}) {
  const size = 16 - index * 2;
  const lag = ((index + 1) / TRAIL_DOTS) * TAIL;
  const style = useAnimatedStyle(() => {
    const raw = Math.min(1, Math.max(0, progress.value - lag));
    const t = easeInOut(raw);
    const { x, y } = pointAt(path, t);
    // Brightest mid-flight, gone at both ends, fainter down the tail.
    const glow = raw <= 0 || raw >= 1 ? 0 : Math.sqrt(Math.sin(Math.PI * raw));
    return {
      opacity: glow * (0.55 - index * 0.07),
      transform: [{ translateX: x - size / 2 }, { translateY: y - size / 2 }],
    };
  });
  return (
    <Animated.View
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

/**
 * The chip flying along an arc with a comet tail of fading dots. The chip
 * vanishes on arrival (`onArrive`, when the real chip takes its place); the
 * tail catches up and fades, then `onDone` removes the flight. All of it runs
 * on the UI thread from one progress value.
 */
export const CometFlight = memo(function CometFlight({
  flight,
  onArrive,
  onDone,
}: {
  flight: WordFlight;
  onArrive: (id: number) => void;
  onDone: (id: number) => void;
}) {
  const { colors } = useAppTheme();
  const progress = useSharedValue(0);
  const path = arcBetween(flight.from, flight.to);
  const { width, height } = flight.from;

  useEffect(() => {
    progress.value = withTiming(
      1 + TAIL,
      { duration: FLIGHT_MS * (1 + TAIL), easing: Easing.linear },
      (finished) => {
        if (finished) scheduleOnRN(onDone, flight.id);
      },
    );
  }, [flight.id, onDone, progress]);

  useAnimatedReaction(
    () => progress.value >= 1,
    (arrived, before) => {
      if (arrived && !before) scheduleOnRN(onArrive, flight.id);
    },
  );

  const headStyle = useAnimatedStyle(() => {
    const raw = Math.min(1, progress.value);
    const { x, y } = pointAt(path, easeInOut(raw));
    return {
      opacity: progress.value >= 1 ? 0 : 1,
      transform: [
        { translateX: x - width / 2 },
        { translateY: y - height / 2 },
        { scale: 1 + 0.08 * Math.sin(Math.PI * raw) },
      ],
    };
  });

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: TRAIL_DOTS }, (_, index) => (
        <TrailDot
          key={index}
          color={colors.primary}
          index={index}
          path={path}
          progress={progress}
        />
      ))}
      <Animated.View
        style={[
          styles.head,
          { width, height, backgroundColor: colors.primary },
          headStyle,
        ]}
      >
        <Text style={[styles.headText, { color: colors.primaryForeground }]}>
          {flight.word}
        </Text>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  dot: { position: "absolute", left: 0, top: 0 },
  head: {
    position: "absolute",
    left: 0,
    top: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  headText: { fontSize: 20, lineHeight: 28, fontWeight: "700" },
});
