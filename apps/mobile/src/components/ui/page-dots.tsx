import { View, type ViewProps } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";

function PageDot({
  index,
  position,
  color,
}: {
  index: number;
  position: SharedValue<number>;
  /** A status colour, shown in full; without one the dot fades by distance. */
  color?: string;
}) {
  const style = useAnimatedStyle(() => {
    const active = interpolate(
      position.value - index,
      [-1, 0, 1],
      [0, 1, 0],
      "clamp",
    );
    return {
      width: 8 + active * 20,
      opacity: color ? 1 : 0.25 + active * 0.75,
    };
  });

  return (
    <Animated.View
      className={`h-1.5 rounded-full ${color ? "" : "bg-primary"}`}
      style={[style, color ? { backgroundColor: color } : null]}
    />
  );
}

/**
 * A row of page dots that follow a pager while it is dragged: the current dot
 * stretches into a bar. With `colors`, each dot also shows its page's status. `position` is the scroll offset in pages (0 on the
 * first page, 1.5 halfway between the second and third).
 */
export function PageDots({
  count,
  position,
  colors,
  className = "",
  ...props
}: ViewProps & {
  count: number;
  position: SharedValue<number>;
  /** Per-page status colours (answered, seen, not seen yet), when they matter. */
  colors?: readonly string[];
  className?: string;
}) {
  return (
    <View className={`flex-row items-center gap-2 ${className}`} {...props}>
      {Array.from({ length: count }, (_, index) => (
        <PageDot
          index={index}
          key={index}
          position={position}
          color={colors?.[index]}
        />
      ))}
    </View>
  );
}
