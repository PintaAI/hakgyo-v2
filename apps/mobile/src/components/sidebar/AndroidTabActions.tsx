import { SymbolView, type SymbolViewProps } from "expo-symbols";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  countUnreadIndicators,
  MAIN_SIDEBAR_INDICATOR_KINDS,
} from "../../lib/sidebar-indicator-count";
import { useSidebarIndicators } from "../../lib/sidebar-indicators";
import { useAppTheme } from "../../providers/AppThemeProvider";
import { useDrawer } from "../../providers/DrawerProvider";

/**
 * In-content replacement for the tab root `Stack.Toolbar` buttons on Android.
 * There a left/right `Stack.Toolbar` forces the native header to show, while
 * Android tab roots are meant to have no header.
 */
export function AndroidTabActions({
  right,
  floating = false,
}: {
  right?: ReactNode;
  /** Overlay the row under the status bar for full-bleed screens. */
  floating?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { open } = useDrawer();
  const { items } = useSidebarIndicators();
  const unreadCount = countUnreadIndicators(
    items,
    MAIN_SIDEBAR_INDICATOR_KINDS,
  );

  return (
    <View
      className="flex-row items-center justify-between gap-3"
      style={
        floating
          ? {
              position: "absolute",
              top: insets.top + 8,
              left: 20,
              right: 20,
              zIndex: 2,
            }
          : undefined
      }
      pointerEvents="box-none"
    >
      <TabActionButton
        symbol={{ ios: "sidebar.left", android: "menu" }}
        accessibilityLabel="Buka menu"
        badgeCount={unreadCount}
        onPress={open}
      />
      {right}
    </View>
  );
}

export function TabActionButton({
  symbol,
  accessibilityLabel,
  badgeCount = 0,
  onPress,
}: {
  symbol: SymbolViewProps["name"];
  accessibilityLabel: string;
  badgeCount?: number;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={4}
      onPress={onPress}
      className="size-11 items-center justify-center rounded-full border border-border bg-card active:opacity-70"
    >
      <SymbolView name={symbol} size={22} tintColor={colors.foreground} />
      {badgeCount > 0 ? (
        <View
          className="absolute -right-1 -top-1 h-5 min-w-5 items-center justify-center rounded-full px-1"
          style={{ backgroundColor: colors.destructive }}
        >
          <Text
            className="text-[10px] font-bold"
            style={{ color: colors.destructiveForeground }}
          >
            {badgeCount > 99 ? "99+" : String(badgeCount)}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
