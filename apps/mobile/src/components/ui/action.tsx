import { ActivityIndicator, Pressable, Text } from "react-native";

import { useAppTheme } from "../../providers/AppThemeProvider";

const variants = {
  primary: {
    box: "border-primary bg-primary",
    text: "text-primary-foreground",
  },
  secondary: { box: "border-border bg-card", text: "text-foreground" },
  destructive: {
    box: "border-destructive bg-destructive",
    text: "text-destructive-foreground",
  },
  tinted: {
    box: "border-primary/40 bg-primary/10",
    text: "text-primary",
  },
  destructiveTinted: {
    box: "border-destructive/30 bg-destructive/10",
    text: "text-destructive",
  },
  link: { box: "border-transparent", text: "text-primary" },
  ghost: { box: "border-transparent", text: "text-muted-foreground" },
} as const;

export type ActionVariant = keyof typeof variants;

/**
 * The standard rectangular button. Glass contexts use `StudyAction` instead.
 */
export function Action({
  children,
  onPress,
  disabled = false,
  loading = false,
  variant = "primary",
  accessibilityLabel,
  accessibilityHint,
}: {
  children: string;
  onPress: () => void;
  disabled?: boolean;
  /** Shows a spinner next to the label and blocks presses. */
  loading?: boolean;
  variant?: ActionVariant;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}) {
  const { colors } = useAppTheme();
  const style = variants[variant];
  const spinnerColor =
    variant === "primary"
      ? colors.primaryForeground
      : variant === "destructive"
        ? colors.destructiveForeground
        : variant === "destructiveTinted"
          ? colors.destructive
          : colors.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      className={`min-h-12 flex-row items-center justify-center gap-2 rounded-2xl border px-5 py-3 active:opacity-80 ${style.box}`}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      {loading ? <ActivityIndicator size="small" color={spinnerColor} /> : null}
      <Text
        className={`text-center text-base font-semibold ${style.text}`}
        numberOfLines={2}
      >
        {children}
      </Text>
    </Pressable>
  );
}
