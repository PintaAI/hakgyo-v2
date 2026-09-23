import { memo, useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { useAppTheme } from "../../providers/AppThemeProvider";
import { withOpacity } from "../../theme/colors";
import { HANGEUL_LETTERS } from "../hangeul/hangeul-data";

const ROWS = [
  [..."ㅂㅈㄷㄱㅅㅛㅕㅑㅐㅔ"],
  [..."ㅁㄴㅇㄹㅎㅗㅓㅏㅣ"],
  [..."ㅋㅌㅊㅍㅠㅜㅡ"],
];
const SHIFT: Record<string, string> = {
  ㅂ: "ㅃ",
  ㅈ: "ㅉ",
  ㄷ: "ㄸ",
  ㄱ: "ㄲ",
  ㅅ: "ㅆ",
  ㅐ: "ㅒ",
  ㅔ: "ㅖ",
};
const CUES: Record<string, string> = {
  ...Object.fromEntries(
    HANGEUL_LETTERS.map((letter) => [
      letter.character,
      letter.cue.replaceAll(" / ", "/"),
    ]),
  ),
  ㅐ: "ae",
  ㅔ: "e",
  ㅒ: "yae",
  ㅖ: "ye",
  ㅃ: "pp",
  ㅉ: "jj",
  ㄸ: "tt",
  ㄲ: "kk",
  ㅆ: "ss",
};

const KeyboardKey = memo(function KeyboardKey({
  label,
  cue,
  accessibilityLabel,
  active = false,
  highlighted = false,
  disabled,
  onPress,
}: {
  label: string;
  cue?: string;
  accessibilityLabel?: string;
  active?: boolean;
  highlighted?: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? `${label}, ${cue ?? ""}`}
      accessibilityHint={
        highlighted ? "Huruf berikutnya dalam petunjuk" : undefined
      }
      accessibilityState={{ disabled, selected: active }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.9, { damping: 18, stiffness: 400 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 14, stiffness: 300 });
      }}
      style={[styles.key, { opacity: disabled ? 0.45 : 1 }]}
    >
      <Animated.View
        style={[
          styles.keySurface,
          {
            backgroundColor:
              active || highlighted
                ? withOpacity(colors.primary, 0.22)
                : colors.card,
            borderColor: active || highlighted ? colors.primary : colors.border,
          },
          animatedStyle,
        ]}
      >
        <Text
          maxFontSizeMultiplier={1.25}
          style={[styles.keyLabel, { color: colors.foreground }]}
        >
          {label}
        </Text>
        {cue ? (
          <Text
            maxFontSizeMultiplier={1.1}
            numberOfLines={1}
            style={[styles.cue, { color: colors.mutedForeground }]}
          >
            {cue}
          </Text>
        ) : null}
      </Animated.View>
    </Pressable>
  );
});

const LetterKey = memo(function LetterKey({
  base,
  shifted,
  suggestedKey,
  disabled,
  onKey,
}: {
  base: string;
  shifted: boolean;
  suggestedKey?: string;
  disabled: boolean;
  onKey: (key: string) => void;
}) {
  const letter = shifted ? (SHIFT[base] ?? base) : base;
  const handlePress = useCallback(() => onKey(letter), [letter, onKey]);

  return (
    <KeyboardKey
      label={letter}
      cue={CUES[letter]}
      highlighted={suggestedKey === letter}
      disabled={disabled}
      onPress={handlePress}
    />
  );
});

export const HangeulKeyboard = memo(function HangeulKeyboard({
  onKey,
  onDelete,
  disabled,
  empty,
  suggestedKey,
}: {
  onKey: (key: string) => void;
  onDelete: () => void;
  disabled: boolean;
  empty: boolean;
  suggestedKey?: string;
}) {
  const [shifted, setShifted] = useState(false);
  const needsShift =
    suggestedKey !== undefined && Object.values(SHIFT).includes(suggestedKey);
  const toggleShift = useCallback(() => setShifted((value) => !value), []);
  const handleKey = useCallback(
    (letter: string) => {
      onKey(letter);
      setShifted(false);
    },
    [onKey],
  );

  return (
    <View style={styles.keyboard} accessibilityLabel="Keyboard Hangeul dua set">
      {ROWS.map((row, index) => (
        <View key={index} style={[styles.row, index === 1 && styles.middleRow]}>
          {index === 2 ? (
            <KeyboardKey
              label="⇧"
              accessibilityLabel="Shift, huruf rangkap"
              active={shifted}
              highlighted={needsShift && !shifted}
              disabled={disabled}
              onPress={toggleShift}
            />
          ) : null}
          {row.map((base) => (
            <LetterKey
              key={base}
              base={base}
              shifted={shifted}
              suggestedKey={suggestedKey}
              disabled={disabled}
              onKey={handleKey}
            />
          ))}
          {index === 2 ? (
            <KeyboardKey
              label="⌫"
              accessibilityLabel="Hapus satu ketukan"
              disabled={disabled || empty}
              onPress={onDelete}
            />
          ) : null}
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  keyboard: { gap: 6 },
  row: { flexDirection: "row", gap: 4 },
  middleRow: { paddingHorizontal: 14 },
  key: { flex: 1, minWidth: 0 },
  keySurface: {
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  keyLabel: { fontSize: 21, fontWeight: "600" },
  cue: { fontSize: 9, lineHeight: 12 },
});
