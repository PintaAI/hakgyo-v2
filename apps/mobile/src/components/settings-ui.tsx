import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { Children, Fragment, type ReactNode } from "react";
import { Pressable, Switch, Text, View } from "react-native";

import { useAppTheme } from "../providers/AppThemeProvider";
import { withOpacity } from "../theme/colors";

export function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const { colorScheme, colors } = useAppTheme();
  const items = Children.toArray(children);
  const rowBackground = withOpacity(
    colors.mutedForeground,
    colorScheme === "dark" ? 0.18 : 0.1,
  );
  return (
    <View className="gap-px">
      <Text className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {title}
      </Text>
      <View className="overflow-hidden rounded-2xl">
        {items.map((child, index) => (
          <Fragment key={index}>
            {index > 0 ? (
              <View
                accessibilityElementsHidden
                importantForAccessibility="no"
                style={{ backgroundColor: rowBackground }}
              >
                <View
                  className="ml-12 h-px"
                  style={{ backgroundColor: colors.border }}
                />
              </View>
            ) : null}
            {child}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

export function SettingsRow({
  label,
  detail,
  symbol,
  fallback,
  onPress,
  destructive = false,
}: {
  label: string;
  detail?: string;
  symbol: SymbolViewProps["name"];
  fallback: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  const { colorScheme, colors } = useAppTheme();
  const accent = destructive ? colors.destructive : colors.primary;

  return (
    <Pressable
      accessibilityRole="button"
      className="min-h-14 flex-row items-center justify-between px-4 py-3"
      onPress={onPress}
      style={{
        backgroundColor: withOpacity(
          colors.mutedForeground,
          colorScheme === "dark" ? 0.18 : 0.1,
        ),
      }}
    >
      <View className="min-w-0 flex-1 flex-row items-center gap-3">
        <View className="w-5 items-center">
          <SymbolView
            name={symbol}
            size={20}
            tintColor={accent}
            fallback={<Text style={{ color: accent }}>{fallback}</Text>}
          />
        </View>
        <Text
          className="shrink font-semibold"
          style={{
            color: destructive ? colors.destructive : colors.foreground,
          }}
        >
          {label}
        </Text>
      </View>
      <View className="ml-3 flex-row items-center gap-1.5">
        {detail ? (
          <Text
            className="text-right text-sm text-muted-foreground"
            numberOfLines={1}
          >
            {detail}
          </Text>
        ) : null}
        {destructive ? null : (
          <SymbolView
            name="chevron.right"
            size={13}
            weight="semibold"
            tintColor={colors.mutedForeground}
            fallback={
              <Text style={{ color: colors.mutedForeground }}>›</Text>
            }
          />
        )}
      </View>
    </Pressable>
  );
}

export function SettingsToggleRow({
  label,
  symbol,
  fallback,
  value,
  onValueChange,
  detail,
}: {
  label: string;
  symbol: SymbolViewProps["name"];
  fallback: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  detail?: string;
}) {
  const { colorScheme, colors } = useAppTheme();

  return (
    <View
      className="min-h-14 flex-row items-center justify-between px-4"
      style={{
        backgroundColor: withOpacity(
          colors.mutedForeground,
          colorScheme === "dark" ? 0.18 : 0.1,
        ),
      }}
    >
      <View className="min-w-0 flex-1 flex-row items-center gap-3">
        <View className="w-5 items-center">
          <SymbolView
            name={symbol}
            size={20}
            tintColor={colors.primary}
            fallback={
              <Text style={{ color: colors.primary }}>{fallback}</Text>
            }
          />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="font-semibold text-foreground">{label}</Text>
          {detail ? (
            <Text
              className="text-sm text-muted-foreground"
              numberOfLines={2}
            >
              {detail}
            </Text>
          ) : null}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: colors.primary }}
      />
    </View>
  );
}
