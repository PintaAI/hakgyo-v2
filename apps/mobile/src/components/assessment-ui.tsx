import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { Eyebrow, ProgressBar } from "./learning-ui";
import { StudyGlass } from "./study-glass";
import { SymbolIcon } from "./ui/symbol-icon";
import { useAppTheme } from "../providers/AppThemeProvider";

export function AssessmentQuestion({
  children,
  detail,
  current,
  total,
  answered,
  onOpen,
  disabled = false,
}: {
  children: ReactNode;
  detail?: string;
  current?: number;
  total?: number;
  answered?: number;
  onOpen?: () => void;
  disabled?: boolean;
}) {
  const showHeader =
    current !== undefined &&
    total !== undefined &&
    answered !== undefined &&
    onOpen;
  const content = (
    <>
      {showHeader ? (
        <View className="gap-2 border-b border-border/70 pb-4">
          <View className="flex-row items-center justify-between gap-3">
            <Text className="font-bold text-foreground">
              Soal {(current as number) + 1} dari {total}
            </Text>
            <Text className="text-sm font-bold text-primary">Soal ▦</Text>
          </View>
          <ProgressBar value={answered} max={total} />
          <Text className="text-xs text-muted-foreground">
            {answered} dijawab · {(total as number) - (answered as number)}{" "}
            tersisa
          </Text>
        </View>
      ) : null}
      {detail ? <Eyebrow size="xs">{detail}</Eyebrow> : null}
      {children}
    </>
  );
  if (!showHeader) {
    return <StudyGlass>{content}</StudyGlass>;
  }
  return (
    <StudyGlass isInteractive={!disabled}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Soal. ${answered} dari ${total} dijawab. Soal saat ini ${(current as number) + 1}.`}
        accessibilityHint="Buka daftar soal untuk berpindah ke soal mana pun"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onOpen}
        className="gap-4 active:opacity-75"
      >
        {content}
      </Pressable>
    </StudyGlass>
  );
}

export function AssessmentOption({
  children,
  index,
  selected,
  multiple = false,
  disabled = false,
  correct,
  onPress,
}: {
  children: ReactNode;
  index: number;
  selected: boolean;
  multiple?: boolean;
  disabled?: boolean;
  correct?: boolean;
  onPress?: () => void;
}) {
  const { colors } = useAppTheme();
  const wrong = correct === false && selected;
  const label =
    correct === true
      ? selected
        ? "Jawaban kamu · Benar"
        : "Jawaban benar"
      : wrong
        ? "Jawaban kamu · Salah"
        : undefined;
  const content = (
    <StudyGlass
      tone={wrong ? "destructive" : "primary"}
      emphasized={selected || correct === true}
      isInteractive={!!onPress}
    >
      <View className="flex-row items-center gap-4">
        <View
          className={`size-8 items-center justify-center rounded-xl border ${wrong ? "border-destructive bg-destructive" : selected || correct === true ? "border-primary bg-primary" : "border-border bg-muted"}`}
        >
          {correct === true || wrong ? (
            <SymbolIcon
              name={wrong ? "xmark" : "checkmark"}
              size={16}
              weight="bold"
              tintColor={
                wrong ? colors.destructiveForeground : colors.primaryForeground
              }
            />
          ) : (
            <Text
              className={`text-sm font-black ${selected ? "text-primary-foreground" : "text-muted-foreground"}`}
            >
              {String.fromCharCode(65 + index)}
            </Text>
          )}
        </View>
        <View className="min-w-0 flex-1 gap-2">
          {label ? (
            <Text
              className={`text-xs font-bold ${wrong ? "text-destructive" : "text-primary"}`}
            >
              {label}
            </Text>
          ) : null}
          {children}
        </View>
      </View>
    </StudyGlass>
  );
  if (!onPress) return <View>{content}</View>;
  return (
    <Pressable
      accessibilityRole={multiple ? "checkbox" : "radio"}
      accessibilityState={{ checked: selected, disabled }}
      accessibilityHint={label}
      disabled={disabled}
      onPress={onPress}
      className="rounded-2xl active:opacity-75"
      style={correct === false && !selected ? { opacity: 0.6 } : undefined}
    >
      {content}
    </Pressable>
  );
}

export function AssessmentFeedback({
  correct,
  children,
}: {
  correct: boolean;
  children: ReactNode;
}) {
  return (
    <StudyGlass tone={correct ? "primary" : "destructive"}>
      <Text
        accessibilityLiveRegion="polite"
        className={`text-2xl font-black ${correct ? "text-primary" : "text-destructive"}`}
      >
        {correct ? "Tepat sekali." : "Hampir."}
      </Text>
      {children}
    </StudyGlass>
  );
}
