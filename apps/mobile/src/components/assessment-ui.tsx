import { Children, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { Eyebrow, ProgressBar } from "./learning-ui";
import { Card } from "./ui/card";
import { SymbolIcon } from "./ui/symbol-icon";
import { useAppTheme } from "../providers/AppThemeProvider";
import { withOpacity } from "../theme/colors";

export function AssessmentQuestion({
  children,
  detail,
  current,
  total,
  answered,
  onOpen,
  disabled = false,
  compactHeader = false,
}: {
  children: ReactNode;
  detail?: string;
  current?: number;
  total?: number;
  answered?: number;
  onOpen?: () => void;
  disabled?: boolean;
  /**
   * The counts on the title line without a separator (Home's daily
   * challenge) instead of the attempt's header with its progress line.
   */
  compactHeader?: boolean;
}) {
  const showHeader =
    current !== undefined &&
    total !== undefined &&
    answered !== undefined &&
    onOpen;
  const content = (
    <>
      {showHeader && compactHeader ? (
        // Compact header: the counts share the title line, no separator.
        <View className="gap-2">
          <View className="flex-row items-center justify-between gap-3">
            <Text
              className="min-w-0 flex-1 font-bold text-foreground"
              numberOfLines={1}
            >
              Soal {(current as number) + 1} dari {total}
              <Text className="text-sm font-normal text-muted-foreground">
                {" · "}
                {answered} dijawab · {(total as number) - (answered as number)}{" "}
                tersisa
              </Text>
            </Text>
            <Text className="text-sm font-bold text-primary">Soal ▦</Text>
          </View>
          <ProgressBar value={answered} max={total} />
        </View>
      ) : showHeader ? (
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
  // Content surfaces are solid cards: glass is for the controls floating
  // over content (headers, tab bars), and a glass view per card made long
  // quizzes lag.
  if (!showHeader) return <Card className="gap-4 p-5">{content}</Card>;
  const question = (
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
  );
  return <Card className="p-5">{question}</Card>;
}

// EPS-TOPIK numbers picture options ①–④.
const circledNumbers = ["①", "②", "③", "④"];

/** Holds a question's options: a list, or the 2×2 grid for picture options. */
export function AssessmentOptions({
  children,
  grid,
}: {
  children: ReactNode;
  grid: boolean;
}) {
  if (!grid) return <View className="gap-3">{children}</View>;
  return (
    <View className="flex-row flex-wrap justify-between gap-y-3">
      {Children.map(children, (child) => (
        // Two per row, with the space between them as the gap.
        <View className="w-[48%]">{child}</View>
      ))}
    </View>
  );
}

export function AssessmentOption({
  children,
  index,
  selected,
  multiple = false,
  disabled = false,
  correct,
  tile = false,
  onPress,
}: {
  children: ReactNode;
  index: number;
  selected: boolean;
  multiple?: boolean;
  disabled?: boolean;
  correct?: boolean;
  /** A picture option in the 2×2 grid (`usesPictureGrid`): badge on top, numbered ①–④. */
  tile?: boolean;
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
  const emphasized = selected || correct === true;
  const tone = wrong ? colors.destructive : colors.primary;
  const body = (
    <View className={tile ? "gap-2" : "flex-row items-center gap-4"}>
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
            {tile
              ? (circledNumbers[index] ?? String(index + 1))
              : String.fromCharCode(65 + index)}
          </Text>
        )}
      </View>
      <View className={tile ? "gap-2" : "min-w-0 flex-1 gap-2"}>
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
  );
  const content = (
    <View
      className={`rounded-2xl border ${tile ? "gap-2 p-3" : "gap-4 p-5"}`}
      style={{
        backgroundColor: emphasized ? withOpacity(tone, 0.08) : colors.card,
        borderColor: emphasized ? tone : colors.border,
      }}
    >
      {body}
    </View>
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
    <Card tone={correct ? "primary" : "destructive"} className="gap-4 p-5">
      <Text
        accessibilityLiveRegion="polite"
        className={`text-2xl font-black ${correct ? "text-primary" : "text-destructive"}`}
      >
        {correct ? "Tepat sekali." : "Hampir."}
      </Text>
      {children}
    </Card>
  );
}
