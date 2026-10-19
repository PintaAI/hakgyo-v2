import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

import { VOICE_LEVEL_HISTORY } from "../lib/use-vocabulary-speech";

const BAR_WIDTH = 3;
const BAR_GAP = 3;
const MIN_SCALE = 0.12;

function LevelBar({
  index,
  levels,
  color,
  height,
}: {
  index: number;
  levels: SharedValue<number[]>;
  color: string;
  height: number;
}) {
  const style = useAnimatedStyle(() => {
    const level = levels.value[index] ?? 0;
    return {
      transform: [
        {
          scaleY: withTiming(MIN_SCALE + level * (1 - MIN_SCALE), {
            duration: 90,
          }),
        },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        {
          backgroundColor: color,
          borderRadius: BAR_WIDTH,
          height,
          width: BAR_WIDTH,
        },
        style,
      ]}
    />
  );
}

/**
 * Scrolling bars of the microphone's recent input level, newest on the right.
 * The recognizer only reports loudness, not samples, so this is a level meter
 * drawn like a waveform.
 */
export function VoiceLevelMeter({
  levels,
  color,
  height = 20,
}: {
  levels: SharedValue<number[]>;
  color: string;
  height?: number;
}) {
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={{
        alignItems: "center",
        flexDirection: "row",
        gap: BAR_GAP,
        height,
      }}
    >
      {Array.from({ length: VOICE_LEVEL_HISTORY }, (_, index) => (
        <LevelBar
          key={index}
          index={index}
          levels={levels}
          color={color}
          height={height}
        />
      ))}
    </View>
  );
}
