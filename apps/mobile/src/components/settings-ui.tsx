import { Children, Fragment, type ReactNode } from "react";
import { Pressable, Switch, Text, View } from "react-native";

import { useAppTheme } from "../providers/AppThemeProvider";
import { withOpacity } from "../theme/colors";
import { Eyebrow } from "./learning-ui";
import { SymbolIcon } from "./ui/symbol-icon";
import type { SymbolName } from "./ui/symbol-names";

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
      <Eyebrow className="mb-2 px-1" size="md">
        {title}
      </Eyebrow>
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
  subtitle,
  detail,
  symbol,
  onPress,
  destructive = false,
}: {
  label: string;
  /** Explanation under the label; use it for anything longer than a status. */
  subtitle?: string;
  /** Short status on the right; truncated so it never squeezes the label. */
  detail?: string;
  symbol: SymbolName;
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
          <SymbolIcon name={symbol} size={20} tintColor={accent} />
        </View>
        <View className="min-w-0 flex-1">
          <Text
            className="font-semibold"
            style={{
              color: destructive ? colors.destructive : colors.foreground,
            }}
          >
            {label}
          </Text>
          {subtitle ? (
            <Text className="text-sm text-muted-foreground" numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      <View className="ml-3 max-w-[45%] shrink flex-row items-center gap-1.5">
        {detail ? (
          <Text
            className="shrink text-right text-sm text-muted-foreground"
            numberOfLines={1}
          >
            {detail}
          </Text>
        ) : null}
        {destructive ? null : (
          <SymbolIcon
            name="chevron.right"
            size={13}
            weight="semibold"
            tintColor={colors.mutedForeground}
          />
        )}
      </View>
    </Pressable>
  );
}

export function SettingsToggleRow({
  label,
  symbol,
  value,
  onValueChange,
  detail,
  disabled = false,
}: {
  label: string;
  symbol: SymbolName;
  value: boolean;
  onValueChange: (value: boolean) => void;
  detail?: string;
  /** Locks the switch, for example while the change is saved. */
  disabled?: boolean;
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
          <SymbolIcon name={symbol} size={20} tintColor={colors.primary} />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="font-semibold text-foreground">{label}</Text>
          {detail ? (
            <Text className="text-sm text-muted-foreground" numberOfLines={2}>
              {detail}
            </Text>
          ) : null}
        </View>
      </View>
      <Switch
        accessibilityState={{ disabled }}
        disabled={disabled}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: colors.primary }}
      />
    </View>
  );
}
