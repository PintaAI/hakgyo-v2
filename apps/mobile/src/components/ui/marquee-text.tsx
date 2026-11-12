import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

/** Points per second the text moves while it slides (as on the web). */
const SPEED = 30;
/** How long the text rests at each end. */
const PAUSE_MS = 1600;
/** A text far wider than any screen, so its own width can be measured. */
const MEASURE_WIDTH = 4000;

/**
 * Keeps text on one line. When it is wider than its box it slides to its end
 * and back, pausing at both ends; with reduced motion it is cut off with an
 * ellipsis instead. Mirrors `MarqueeText` on the web.
 */
export function MarqueeText({
  children,
  className,
  align = "left",
}: {
  children: string;
  className?: string;
  /** Where text that fits sits in its box. */
  align?: "left" | "center";
}) {
  const reduceMotion = useReducedMotion();
  const [boxWidth, setBoxWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  const overflow = Math.ceil(textWidth - boxWidth);
  const distance = boxWidth > 0 && overflow > 1 ? overflow : 0;
  const slides = distance > 0 && !reduceMotion;

  const offset = useSharedValue(0);
  useEffect(() => {
    offset.value = 0;
    if (!slides) return;
    const leg = {
      duration: (distance / SPEED) * 1000,
      easing: Easing.inOut(Easing.quad),
    };
    offset.value = withRepeat(
      withSequence(
        withDelay(PAUSE_MS, withTiming(-distance, leg)),
        withDelay(PAUSE_MS, withTiming(0, leg)),
      ),
      -1,
    );
    return () => cancelAnimation(offset);
  }, [distance, offset, slides]);
  const slide = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  return (
    <View
      className="overflow-hidden"
      onLayout={(event) => setBoxWidth(event.nativeEvent.layout.width)}
    >
      {/* Measured off screen at its natural width. */}
      <View
        aria-hidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={styles.measure}
      >
        <Text
          className={className}
          numberOfLines={1}
          onLayout={(event) => setTextWidth(event.nativeEvent.layout.width)}
          style={styles.natural}
        >
          {children}
        </Text>
      </View>
      {slides ? (
        // A point to spare, so rounding never cuts the last letter.
        <Animated.View style={[{ width: Math.ceil(textWidth) + 1 }, slide]}>
          <Text className={className} numberOfLines={1}>
            {children}
          </Text>
        </Animated.View>
      ) : (
        <Text
          className={className}
          numberOfLines={1}
          style={{ textAlign: align }}
        >
          {children}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  measure: {
    position: "absolute",
    left: 0,
    top: 0,
    width: MEASURE_WIDTH,
    opacity: 0,
  },
  natural: { alignSelf: "flex-start" },
});
