import { useEffect } from "react";
import type { ViewStyle } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

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
  const opacity = useSharedValue(1);
  useEffect(() => {
    if (reducedMotion) return;
    opacity.value = withRepeat(withTiming(0.45, { duration: 900 }), -1, true);
    return () => cancelAnimation(opacity);
  }, [opacity, reducedMotion]);
  const pulse = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={`bg-muted ${className}`}
      style={[style, pulse]}
    />
  );
}
