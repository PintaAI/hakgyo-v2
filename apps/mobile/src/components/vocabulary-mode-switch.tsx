import { Pressable, Text, View } from "react-native";

import { useAppTheme } from "../providers/AppThemeProvider";
import type { VocabularySpeechMode } from "../lib/vocabulary-speech";

const FLAGS: Record<VocabularySpeechMode, string> = {
  KR: "🇰🇷",
  ID: "🇮🇩",
};

const LABELS: Record<VocabularySpeechMode, string> = {
  KR: "Mode jawaban bahasa Korea",
  ID: "Mode jawaban bahasa Indonesia",
};

export function VocabularyModeSwitch({
  mode,
  onChange,
  disabled = false,
}: {
  mode: VocabularySpeechMode;
  onChange: (mode: VocabularySpeechMode) => void;
  disabled?: boolean;
}) {
  const { colors } = useAppTheme();
  const next: VocabularySpeechMode = mode === "KR" ? "ID" : "KR";
  return (
    <Pressable
      accessibilityLabel={`Ganti ke ${LABELS[next]}`}
      accessibilityHint="Mengganti bahasa jawaban antara Korea dan Indonesia"
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => onChange(next)}
      className="active:opacity-70"
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <View
        accessible={false}
        className="min-h-9 flex-row items-center gap-1 rounded-full border px-2.5 py-1.5"
        style={{
          backgroundColor: colors.card,
          borderColor: colors.border,
        }}
      >
        {(["KR", "ID"] as const).map((option) => {
          const selected = option === mode;
          return (
            <View
              key={option}
              className="items-center justify-center rounded-full px-1.5 py-0.5"
              style={{
                backgroundColor: selected ? colors.primary : "transparent",
                opacity: selected ? 1 : 0.45,
              }}
            >
              <Text
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={{ fontSize: 15, lineHeight: 20 }}
              >
                {FLAGS[option]}
              </Text>
            </View>
          );
        })}
      </View>
    </Pressable>
  );
}
