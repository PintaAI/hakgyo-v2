import { useEffect } from "react";
import type { ViewStyle } from "react-native";
import Animated, {
  cancelAnimation,
  makeMutable,
  useAnimatedStyle,
  useReducedMotion,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

// One pulse for every block on screen (a loading page has dozens): it runs
// while any block is mounted and stops with the last one.
const pulse = makeMutable(1);
let pulsing = 0;

function joinPulse() {
  if (pulsing++ === 0) {
    pulse.value = withRepeat(withTiming(0.45, { duration: 900 }), -1, true);
  }
  return () => {
    if (--pulsing > 0) return;
    cancelAnimation(pulse);
    pulse.value = 1;
  };
}

/**
 * A placeholder block in the shape of content that is still loading. All
 * blocks pulse together; with reduced motion they stay still.
 */
export function Skeleton({
  className = "",
  style,
}: {
  className?: string;
  style?: ViewStyle;
}) {
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (!reducedMotion) return joinPulse();
  }, [reducedMotion]);
  const opacity = useAnimatedStyle(() => ({
    opacity: reducedMotion ? 1 : pulse.value,
  }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={`bg-muted ${className}`}
      style={[style, opacity]}
    />
  );
}
