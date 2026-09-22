import { Stack } from "expo-router";

import {
  countUnreadIndicators,
  MAIN_SIDEBAR_INDICATOR_KINDS,
} from "../../lib/sidebar-indicator-count";
import { useSidebarIndicators } from "../../lib/sidebar-indicators";
import { useDrawer } from "../../providers/DrawerProvider";
import { useAppTheme } from "../../providers/AppThemeProvider";
import { toolbarIcons } from "../../theme/toolbar-icons";

export function SidebarToolbarButton({
  accessibilityLabel = "Open menu",
}: {
  accessibilityLabel?: string;
}) {
  const { open } = useDrawer();
  const { colors } = useAppTheme();
  const { items } = useSidebarIndicators();
  const unreadCount = countUnreadIndicators(
    items,
    MAIN_SIDEBAR_INDICATOR_KINDS,
  );

  return (
    <Stack.Toolbar placement="left">
      <Stack.Toolbar.Button
        icon={toolbarIcons.menu}
        accessibilityLabel={accessibilityLabel}
        onPress={open}
      >
        {unreadCount > 0 ? (
          <Stack.Toolbar.Badge
            style={{
              backgroundColor: colors.destructive,
              color: colors.destructiveForeground,
            }}
          >
            {unreadCount > 99 ? "99+" : String(unreadCount)}
          </Stack.Toolbar.Badge>
        ) : null}
      </Stack.Toolbar.Button>
    </Stack.Toolbar>
  );
}
