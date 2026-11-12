import { useEffect, type ReactNode } from "react";
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

/**
 * The answer area's reaction to an outcome: a short shake each time
 * `wrongCount` grows, and a pop when `correct` turns true. Both run on the UI
 * thread and are skipped under Reduce Motion, where the color change alone
 * tells the outcome.
 */
export function useOutcomeMotion({
  wrongCount,
  correct,
}: {
  wrongCount: number;
  correct: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const shake = useSharedValue(0);
  const scale = useSharedValue(1);
  useEffect(() => {
    if (!wrongCount || reducedMotion) return;
    shake.value = withSequence(
      withTiming(-8, { duration: 55 }),
      withTiming(8, { duration: 70 }),
      withTiming(-5, { duration: 60 }),
      withTiming(3, { duration: 55 }),
      withTiming(0, { duration: 50 }),
    );
  }, [reducedMotion, shake, wrongCount]);
  useEffect(() => {
    if (!correct || reducedMotion) return;
    scale.value = withSequence(
      withTiming(1.06, { duration: 140 }),
      withSpring(1, { damping: 12, stiffness: 220 }),
    );
  }, [correct, reducedMotion, scale]);
  return useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }, { scale: scale.value }],
  }));
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * A board piece that sinks a little under the finger and springs back.
 * Pass the piece's look through `style`.
 */
export function PressableScale({
  children,
  style,
  pressedScale = 0.94,
  disabled,
  onPressIn,
  onPressOut,
  ...props
}: Omit<PressableProps, "style" | "children"> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  pressedScale?: number;
}) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return (
    <AnimatedPressable
      {...props}
      disabled={disabled}
      onPressIn={(event) => {
        if (!reducedMotion)
          scale.value = withTiming(pressedScale, { duration: 70 });
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.value = withSpring(1, { damping: 14, stiffness: 320 });
        onPressOut?.(event);
      }}
      style={[style, animated]}
    >
      {children}
    </AnimatedPressable>
  );
}
