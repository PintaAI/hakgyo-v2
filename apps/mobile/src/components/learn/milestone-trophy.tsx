import { useEffect, useRef } from "react";
import { AccessibilityInfo, Animated, Text, View } from "react-native";

import { useAppTheme } from "../../providers/AppThemeProvider";

const particles = [-76, -54, -30, 28, 52, 76];

export function MilestoneTrophy() {
  const { colors } = useAppTheme();
  const progress = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((reduceMotion) => {
        if (!active || reduceMotion) return;
        progress.setValue(0);
        Animated.timing(progress, {
          toValue: 1,
          duration: 850,
          useNativeDriver: true,
        }).start();
      })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (enabled) => {
        if (enabled) {
          progress.stopAnimation();
          progress.setValue(1);
        }
      },
    );
    return () => {
      active = false;
      progress.stopAnimation();
      subscription.remove();
    };
  }, [progress]);

  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="h-32 w-64 items-center justify-center"
    >
      {particles.map((offset, index) => (
        <Animated.View
          key={offset}
          style={{
            position: "absolute",
            width: 8,
            height: 14,
            borderRadius: 3,
            backgroundColor: colors.primary,
            opacity: progress.interpolate({
              inputRange: [0, 0.15, 0.7, 1],
              outputRange: [0, 1, 1, 0],
            }),
            transform: [
              {
                translateX: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, offset * 1.4],
                }),
              },
              {
                translateY: progress.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0, -55 - (index % 3) * 12, 30],
                }),
              },
              {
                rotate: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0deg", `${offset * 4}deg`],
                }),
              },
            ],
          }}
        />
      ))}
      <Animated.View
        style={{
          transform: [
            {
              scale: progress.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.7, 1.12, 1],
              }),
            },
          ],
        }}
      >
        <View className="size-24 items-center justify-center rounded-full bg-primary/15">
          <Text className="text-5xl">🏆</Text>
        </View>
      </Animated.View>
    </View>
  );
}
