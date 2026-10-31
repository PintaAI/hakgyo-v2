import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Platform } from "react-native";

import {
  supportsTabBarAccessory,
  SyncAccessory,
} from "../../../src/components/sync-activity/sync-accessory";
import { useUpdatesBadgeCount } from "../../../src/lib/sidebar-indicators";
import { useAppTheme } from "../../../src/providers/AppThemeProvider";
import { useSyncActivity } from "../../../src/sync/use-sync-activity";

export default function HomeTabsLayout() {
  const { colors } = useAppTheme();
  const unreadCount = useUpdatesBadgeCount();
  const syncActivity = useSyncActivity();

  return (
    <NativeTabs
      backgroundColor={colors.background}
      tintColor={colors.primary}
      iconColor={{
        default: colors.mutedForeground,
        // Android draws the selected icon on the primary-colored indicator.
        selected:
          Platform.OS === "android" ? colors.primaryForeground : colors.primary,
      }}
      labelStyle={{ color: colors.foreground }}
      indicatorColor={Platform.OS === "android" ? colors.primary : undefined}
      rippleColor={Platform.OS === "android" ? colors.border : undefined}
    >
      {/* Shown only while sync has something to tell (iOS 26+). Android
          announces the same activity in a snackbar from `TabScreen`. */}
      {supportsTabBarAccessory && syncActivity ? (
        <NativeTabs.BottomAccessory>
          <SyncAccessory activity={syncActivity} />
        </NativeTabs.BottomAccessory>
      ) : null}
      <NativeTabs.Trigger name="home">
        <NativeTabs.Trigger.Label>Hari Ini</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="learn" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Label>Belajar</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="book.fill" md="menu_book" />
        {unreadCount > 0 ? (
          <NativeTabs.Trigger.Badge
            selectedBackgroundColor={colors.destructive}
          >
            {unreadCount > 99 ? "99+" : String(unreadCount)}
          </NativeTabs.Trigger.Badge>
        ) : null}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="assessments">
        <NativeTabs.Trigger.Label>Latihan</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf="pencil.and.list.clipboard"
          md="edit_note"
        />
      </NativeTabs.Trigger>
      {/* iOS draws the system search item (detached on iOS 26) and ignores
          the label; Android shows an ordinary tab. */}
      <NativeTabs.Trigger name="search" role="search">
        <NativeTabs.Trigger.Label>Cari</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
