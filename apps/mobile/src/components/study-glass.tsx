import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { useAppTheme } from "../providers/AppThemeProvider";
import { withOpacity } from "../theme/colors";
import { GlassBox } from "./GlassBox";

// Shared visual primitives: callers own their domain behavior and content.
export function StudyGlass({
  children,
  tone = "primary",
  emphasized = false,
  isInteractive = false,
}: {
  children: ReactNode;
  tone?: "primary" | "destructive";
  emphasized?: boolean;
  isInteractive?: boolean;
}) {
  const { colors, colorScheme } = useAppTheme();
  return (
    <GlassBox
      isInteractive={isInteractive}
      glassEffectStyle="clear"
      tintColor={withOpacity(
        colors[tone],
        colorScheme === "dark" ? 0.35 : 0.18,
      )}
      style={{
        borderRadius: 20,
        borderWidth: 1,
        borderColor: emphasized ? colors[tone] : colors.border,
      }}
    >
      <View className="gap-4 p-5">{children}</View>
    </GlassBox>
  );
}

export function StudyAction({
  children,
  onPress,
  disabled = false,
  loading = false,
  secondary = false,
  accessibilityLabel,
}: {
  children: ReactNode;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  secondary?: boolean;
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
        tintColor={withOpacity(
          colors.primary,
          secondary ? 0.06 : colorScheme === "dark" ? 0.35 : 0.18,
        )}
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
        </View>
      </GlassBox>
    </Pressable>
  );
}
