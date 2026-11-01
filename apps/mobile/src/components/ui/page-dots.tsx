import { View, type ViewProps } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";

function PageDot({
  index,
  position,
}: {
  index: number;
  position: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    const active = interpolate(
      position.value - index,
      [-1, 0, 1],
      [0, 1, 0],
      "clamp",
    );
    return { width: 8 + active * 20, opacity: 0.25 + active * 0.75 };
  });

  return (
    <Animated.View className="h-1.5 rounded-full bg-primary" style={style} />
  );
}

/**
 * A row of page dots that follow a pager while it is dragged: the current dot
 * stretches into a bar. `position` is the scroll offset in pages (0 on the
 * first page, 1.5 halfway between the second and third).
 */
export function PageDots({
  count,
  position,
  className = "",
  ...props
}: ViewProps & {
  count: number;
  position: SharedValue<number>;
  className?: string;
}) {
  return (
    <View className={`flex-row items-center gap-2 ${className}`} {...props}>
      {Array.from({ length: count }, (_, index) => (
        <PageDot index={index} key={index} position={position} />
      ))}
    </View>
  );
}
