import { Stack } from "expo-router";
import type { ReactElement } from "react";

import {
  countUnreadIndicators,
  MAIN_SIDEBAR_INDICATOR_KINDS,
} from "../../lib/sidebar-indicator-count";
import { useSidebarIndicators } from "../../lib/sidebar-indicators";
import { useDrawer } from "../../providers/DrawerProvider";
import { useAppTheme } from "../../providers/AppThemeProvider";
import { toolbarIcons } from "../../theme/toolbar-icons";

/** Gap between the sidebar button and items placed after it. */
const TRAILING_GAP = 8;

/**
 * The sidebar button in the left of the native header. `trailing` renders
 * right after it in the same toolbar: a screen can only have one left
 * toolbar, so a second one would replace this button.
 */
export function SidebarToolbarButton({
  accessibilityLabel = "Buka menu",
  trailing,
}: {
  accessibilityLabel?: string;
  /** A view shown after the button, with its own background. */
  trailing?: ReactElement;
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
      {/* Direct children only: the toolbar drops fragments. */}
      {trailing ? <Stack.Toolbar.Spacer width={TRAILING_GAP} /> : null}
      {trailing ? (
        <Stack.Toolbar.View hidesSharedBackground>
          {trailing}
        </Stack.Toolbar.View>
      ) : null}
    </Stack.Toolbar>
  );
}
