import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { useAppTheme } from "../providers/AppThemeProvider";
import { glassTint, withOpacity } from "../theme/colors";
import { GlassBox } from "./GlassBox";
import { SymbolIcon } from "./ui/symbol-icon";
import type { SymbolName } from "./ui/symbol-names";

// Shared visual primitives: callers own their domain behavior and content.
export function StudyGlass({
  children,
  tone = "primary",
  emphasized = false,
  isInteractive = false,
  radius = 20,
  contentClassName = "gap-4 p-5",
  bordered = true,
  tinted = true,
}: {
  children: ReactNode;
  tone?: "primary" | "destructive";
  emphasized?: boolean;
  isInteractive?: boolean;
  /** Corner radius of the glass surface. */
  radius?: number;
  /** Replaces the default content padding and spacing (`gap-4 p-5`). */
  contentClassName?: string;
  /** Draws the hairline border; turn off for tint-only surfaces. */
  bordered?: boolean;
  /** Tints the glass with the tone colour; off leaves plain glass. */
  tinted?: boolean;
}) {
  const { colors, colorScheme } = useAppTheme();
  return (
    <GlassBox
      isInteractive={isInteractive}
      glassEffectStyle="clear"
      tintColor={tinted ? glassTint(colors, colorScheme, tone) : undefined}
      style={{
        borderRadius: radius,
        ...(bordered
          ? {
              borderWidth: 1,
              borderColor: emphasized ? colors[tone] : colors.border,
            }
          : null),
      }}
    >
      <View className={contentClassName}>{children}</View>
    </GlassBox>
  );
}

export function StudyAction({
  children,
  onPress,
  disabled = false,
  loading = false,
  secondary = false,
  trailingIcon,
  accessibilityLabel,
}: {
  children: ReactNode;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  secondary?: boolean;
  /** Icon after the label, such as a forward arrow. */
  trailingIcon?: SymbolName;
  accessibilityLabel?: string;
}) {
  const { colors, colorScheme } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      className="min-h-12 rounded-2xl active:opacity-75"
      style={{ opacity: disabled ? 0.4 : 1 }}
    >
      <GlassBox
        isInteractive
        glassEffectStyle="clear"
        tintColor={
          secondary
            ? withOpacity(colors.primary, 0.06)
            : glassTint(colors, colorScheme)
        }
        style={{
          borderRadius: 16,
          borderWidth: 1,
          borderColor: secondary ? colors.border : colors.primary,
        }}
      >
        <View className="min-h-12 flex-row items-center justify-center gap-2 px-4 py-3">
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : null}
          <Text className="text-center text-sm font-bold text-foreground">
            {children}
          </Text>
          {trailingIcon ? (
            <SymbolIcon
              name={trailingIcon}
              size={18}
              weight="semibold"
              tintColor={colors.foreground}
            />
          ) : null}
        </View>
      </GlassBox>
    </Pressable>
  );
}
