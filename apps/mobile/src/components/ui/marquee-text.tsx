import { cloneElement, useEffect, useState, type ReactElement } from "react";
import { View } from "react-native";
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
/** The rest at each end before the text turns around. */
const PAUSE_MS = 1200;
/** Wide enough that one line never wraps while it is measured. */
const RUNWAY = 10000;

/**
 * Keeps one line of text on one line. When it is wider than its box it slides
 * to its end and back, pausing at both ends, like the web's `MarqueeText`;
 * with reduced motion it is cut off with an ellipsis instead. Pass one `Text`
 * element, such as an `Eyebrow`.
 */
export function MarqueeText({
  children,
  align = "start",
}: {
  children: ReactElement<{ numberOfLines?: number }>;
  /** Where the text sits while it fits. */
  align?: "start" | "center";
}) {
  const reducedMotion = useReducedMotion();
  const [boxWidth, setBoxWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  const overflow = textWidth - boxWidth;
  const distance = boxWidth > 0 && overflow > 1 ? Math.ceil(overflow) : 0;
  const offset = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(offset);
    offset.value = 0;
    if (distance === 0 || reducedMotion) return;
    const travel = {
      duration: (distance / SPEED) * 1000,
      easing: Easing.inOut(Easing.quad),
    };
    offset.value = withRepeat(
      withSequence(
        withDelay(PAUSE_MS, withTiming(-distance, travel)),
        withDelay(PAUSE_MS, withTiming(0, travel)),
      ),
      -1,
    );
    return () => cancelAnimation(offset);
  }, [distance, offset, reducedMotion]);

  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  return (
    <View
      onLayout={(event) => setBoxWidth(event.nativeEvent.layout.width)}
      style={{ overflow: "hidden" }}
    >
      {distance > 0 && reducedMotion ? (
        cloneElement(children, { numberOfLines: 1 })
      ) : (
        <View style={{ width: RUNWAY, flexDirection: "row" }}>
          <Animated.View
            onLayout={(event) => setTextWidth(event.nativeEvent.layout.width)}
            style={[
              {
                marginLeft:
                  align === "center" && distance === 0 && textWidth > 0
                    ? (boxWidth - textWidth) / 2
                    : 0,
                // Hidden for the first frame, before it is measured and placed.
                opacity: textWidth > 0 ? 1 : 0,
              },
              slideStyle,
            ]}
          >
            {children}
          </Animated.View>
        </View>
      )}
    </View>
  );
}
