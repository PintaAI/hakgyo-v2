import { useEffect, useRef } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

export type ConfettiPieceShape = {
  angle: number;
  distance: number;
  size: number;
  color: string;
  spin: number;
  delay: number;
  shape: "dot" | "strip" | "square";
};

/**
 * A fixed, varied burst: the same every time, so nothing jitters. `spread`
 * scales how far the pieces fly from the centre.
 */
export function confettiPieces(
  colors: readonly string[],
  { count = 32, spread = 1 }: { count?: number; spread?: number } = {},
): ConfettiPieceShape[] {
  const shapes: ConfettiPieceShape["shape"][] = ["strip", "dot", "square"];
  return Array.from({ length: count }, (_, index) => {
    const turn = index / count;
    const wobble = ((index * 37) % 11) / 11;
    return {
      angle: turn * Math.PI * 2 + wobble * 0.35,
      distance: (70 + ((index * 53) % 7) * 14) * spread,
      size: 5 + (index % 3) * 2,
      color: colors[index % colors.length]!,
      spin: (index % 2 ? 1 : -1) * (240 + (index % 5) * 90),
      delay: (index % 4) * 0.04,
      shape: shapes[index % shapes.length]!,
    };
  });
}

/**
 * One piece of a burst driven by `burst` (0 to 1): out from the centre of a
 * `origin`-sized box, then falling and fading.
 */
export function ConfettiPiece({
  burst,
  piece,
  origin,
}: {
  burst: SharedValue<number>;
  piece: ConfettiPieceShape;
  origin: { width: number; height: number };
}) {
  const style = useAnimatedStyle(() => {
    const t = Math.min(
      1,
      Math.max(0, (burst.value - piece.delay) / (1 - piece.delay)),
    );
    const out = 1 - Math.pow(1 - t, 3);
    return {
      opacity: t === 0 ? 0 : t < 0.65 ? 1 : 1 - (t - 0.65) / 0.35,
      transform: [
        { translateX: Math.cos(piece.angle) * piece.distance * out },
        // Out on the burst, then falls.
        {
          translateY:
            Math.sin(piece.angle) * piece.distance * out + 120 * t * t,
        },
        { rotate: `${piece.spin * t}deg` },
        { scale: Math.min(1, t * 8) },
      ],
    };
  });
  const height = piece.shape === "strip" ? piece.size * 2.4 : piece.size;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: origin.width / 2 - piece.size / 2,
          top: origin.height / 2 - height / 2,
          width: piece.size,
          height,
          borderRadius: piece.shape === "dot" ? piece.size / 2 : 1.5,
          backgroundColor: piece.color,
        },
        style,
      ]}
    />
  );
}

/**
 * A one-off burst of confetti from the centre of whatever it overlays (give
 * the parent a size; the burst is absolutely filled over it). Fires when
 * `fire` turns true. Skipped when the system asks for reduced motion.
 */
export function ConfettiBurst({
  fire,
  colors,
  width,
  height,
  spread = 1.4,
  delayMs = 250,
}: {
  fire: boolean;
  colors: readonly string[];
  width: number;
  height: number;
  spread?: number;
  delayMs?: number;
}) {
  const reduceMotion = useReducedMotion();
  const burst = useSharedValue(0);
  const pieces = useRef(confettiPieces(colors, { spread })).current;

  useEffect(() => {
    if (!fire || reduceMotion) return;
    burst.value = 0;
    burst.value = withDelay(
      delayMs,
      withTiming(1, { duration: 1600, easing: Easing.linear }),
    );
  }, [burst, delayMs, fire, reduceMotion]);

  if (reduceMotion) return null;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={{ position: "absolute", left: 0, top: 0, width, height }}
    >
      {pieces.map((piece, index) => (
        <ConfettiPiece
          key={index}
          burst={burst}
          piece={piece}
          origin={{ width, height }}
        />
      ))}
    </View>
  );
}
