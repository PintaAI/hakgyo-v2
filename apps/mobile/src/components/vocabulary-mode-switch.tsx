import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { useAppTheme } from "../providers/AppThemeProvider";
import { glassTint } from "../theme/colors";
import type { VocabularySpeechMode } from "../lib/vocabulary-speech";
import { GlassBox } from "./GlassBox";

const SIZE = 44;

const FLAGS: Record<VocabularySpeechMode, string> = {
  KR: "🇰🇷",
  ID: "🇮🇩",
};

const LANGUAGES: Record<VocabularySpeechMode, string> = {
  KR: "Korea",
  ID: "Indonesia",
};

/**
 * One round button beside the answer field showing the flag of the answer
 * language; a tap switches to the other one.
 */
export function VocabularyModeSwitch({
  mode,
  onChange,
  disabled = false,
  highlight = false,
  bare = false,
}: {
  mode: VocabularySpeechMode;
  onChange: (mode: VocabularySpeechMode) => void;
  disabled?: boolean;
  /** Pulses the button, for the deck tutorial's language step. */
  highlight?: boolean;
  /** No glass of its own, inside a toolbar that already draws one. */
  bare?: boolean;
}) {
  const { colors, colorScheme } = useAppTheme();
  const reducedMotion = useReducedMotion();
  const pulse = useSharedValue(0);
  const next: VocabularySpeechMode = mode === "KR" ? "ID" : "KR";

  useEffect(() => {
    cancelAnimation(pulse);
    pulse.value = 0;
    if (!highlight || reducedMotion) return;
    pulse.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }),
      -1,
    );
    return () => cancelAnimation(pulse);
  }, [highlight, pulse, reducedMotion]);

  const ringStyle = useAnimatedStyle(() => {
    const t = reducedMotion ? 0.3 : pulse.value;
    return {
      opacity: interpolate(t, [0, 0.2, 1], [0, 0.4, 0]),
      transform: [{ scale: interpolate(t, [0, 1], [1, 1.6]) }],
    };
  });

  const flag = (
    <View
      className="items-center justify-center"
      style={{ width: SIZE, height: SIZE }}
    >
      <Text
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ fontSize: 22, lineHeight: 28 }}
      >
        {FLAGS[mode]}
      </Text>
    </View>
  );

  return (
    <Pressable
      accessibilityLabel={`Bahasa jawaban: ${LANGUAGES[mode]}`}
      accessibilityHint={`Ketuk untuk menjawab dalam bahasa ${LANGUAGES[next]}`}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => onChange(next)}
      className="items-center justify-center active:opacity-70"
      style={{ width: SIZE, height: SIZE, opacity: disabled ? 0.5 : 1 }}
    >
      {highlight ? (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              width: SIZE,
              height: SIZE,
              borderRadius: SIZE / 2,
              backgroundColor: colors.primary,
            },
            ringStyle,
          ]}
        />
      ) : null}
      {bare ? (
        flag
      ) : (
        <GlassBox
          isInteractive
          glassEffectStyle="clear"
          tintColor={glassTint(colors, colorScheme)}
          style={{ borderRadius: SIZE / 2 }}
        >
          {flag}
        </GlassBox>
      )}
    </Pressable>
  );
}
