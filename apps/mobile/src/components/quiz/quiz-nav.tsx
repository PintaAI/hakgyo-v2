import { Pressable, Text, View } from "react-native";

import { useAppTheme } from "../../providers/AppThemeProvider";
import { SymbolIcon } from "../ui/symbol-icon";
import type { SymbolName } from "../ui/symbol-names";

function StepButton({
  icon,
  label,
  onPress,
}: {
  icon: SymbolName;
  label: string;
  onPress?: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !onPress }}
      disabled={!onPress}
      hitSlop={6}
      onPress={onPress}
      // Kept in place when unavailable, so the row never shifts.
      className="size-11 items-center justify-center rounded-full bg-muted active:opacity-70"
      style={onPress ? undefined : { opacity: 0.35 }}
    >
      <SymbolIcon
        name={icon}
        size={18}
        weight="semibold"
        tintColor={colors.foreground}
      />
    </Pressable>
  );
}

/**
 * Moving between questions where a screen has no toolbar (Home's daily
 * questions, the result review): the previous question, the question list
 * with the answered count, and the next question, in the attempt toolbar's
 * order. Leave `onPrevious` or `onNext` out where there is no such question.
 */
export function QuizNav({
  answered,
  total,
  onPrevious,
  onNext,
  onOpenList,
  disabled = false,
}: {
  answered: number;
  total: number;
  onPrevious?: () => void;
  onNext?: () => void;
  onOpenList: () => void;
  disabled?: boolean;
}) {
  const { colors } = useAppTheme();
  return (
    <View className="flex-row items-center gap-3">
      <StepButton
        icon="chevron.left"
        label="Soal sebelumnya"
        onPress={disabled ? undefined : onPrevious}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Daftar soal, ${answered} dari ${total} dijawab`}
        accessibilityHint="Buka daftar untuk pindah ke soal mana pun"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onOpenList}
        className="h-11 min-w-0 flex-1 flex-row items-center justify-center gap-2 rounded-full bg-muted px-4 active:opacity-70"
      >
        <SymbolIcon
          name="square.grid.2x2"
          size={14}
          weight="semibold"
          tintColor={colors.foreground}
        />
        <Text
          className="shrink text-sm font-semibold text-foreground"
          numberOfLines={1}
        >
          Daftar soal · {answered}/{total}
        </Text>
      </Pressable>
      <StepButton
        icon="chevron.right"
        label="Soal berikutnya"
        onPress={disabled ? undefined : onNext}
      />
    </View>
  );
}
