import type { ReactNode } from "react";
import {
  Badge,
  BadgedBox,
  Host,
  Icon,
  IconButton,
  Text,
} from "@expo/ui/jetpack-compose";
import { type ImageSourcePropType, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  countUnreadIndicators,
  MAIN_SIDEBAR_INDICATOR_KINDS,
} from "../../lib/sidebar-indicator-count";
import { useSidebarIndicators } from "../../lib/sidebar-indicators";
import { useAppTheme } from "../../providers/AppThemeProvider";
import { useDrawer } from "../../providers/DrawerProvider";
import { type ToolbarIconName, toolbarIcons } from "../../theme/toolbar-icons";

/**
 * In-content replacement for the tab root `Stack.Toolbar` buttons on Android.
 * There a left/right `Stack.Toolbar` forces the native header to show, while
 * Android tab roots are meant to have no header.
 */
export function AndroidTabActions({
  left,
  right,
  floating = false,
}: {
  /** Shown right after the menu button. */
  left?: ReactNode;
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
      // Off the floating overlay, pull the 48dp buttons into the gutter so
      // their icons line up with the content.
      className={`flex-row items-center justify-between gap-3 ${floating ? "" : "-mx-3"}`}
      style={
        floating
          ? {
              position: "absolute",
              top: insets.top + 8,
              // The 48dp buttons pad their 24dp icons by 12dp; this keeps
              // the icons on the screen's 20dp gutter.
              left: 8,
              right: 8,
              zIndex: 2,
            }
          : undefined
      }
      pointerEvents="box-none"
    >
      <View className="min-w-0 flex-1 flex-row items-center gap-2">
        <TabActionButton
          icon="menu"
          accessibilityLabel="Buka menu"
          badgeCount={unreadCount}
          onPress={open}
        />
        {left}
      </View>
      {right}
    </View>
  );
}

/**
 * A Material 3 standard icon button: a 48dp touch target around a 24dp
 * vector icon with no container, as top app bar actions are on Android.
 */
export function TabActionButton({
  icon: name,
  accessibilityLabel,
  badgeCount = 0,
  onPress,
}: {
  icon: ToolbarIconName;
  accessibilityLabel: string;
  badgeCount?: number;
  onPress: () => void;
}) {
  const { colorScheme, colors } = useAppTheme();
  const icon = (
    <Icon
      // On Android `Icon.select` resolves to the XML vector drawable.
      source={toolbarIcons[name] as ImageSourcePropType}
      size={24}
      contentDescription={accessibilityLabel}
    />
  );

  return (
    <Host
      matchContents
      colorScheme={colorScheme === "dark" ? "dark" : "light"}
      seedColor={colors.primary}
    >
      <IconButton
        onClick={onPress}
        colors={{ contentColor: colors.foreground }}
      >
        {/* Without a badge slot, BadgedBox draws an empty dot, so only use it
            when there is a count to show. */}
        {badgeCount > 0 ? (
          <BadgedBox>
            <BadgedBox.Badge>
              <Badge
                containerColor={colors.destructive}
                contentColor={colors.destructiveForeground}
              >
                <Text>{badgeCount > 99 ? "99+" : String(badgeCount)}</Text>
              </Badge>
            </BadgedBox.Badge>
            {icon}
          </BadgedBox>
        ) : (
          icon
        )}
      </IconButton>
    </Host>
  );
}
