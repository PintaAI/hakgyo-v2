import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Platform } from "react-native";

import { useSidebarIndicators } from "../../../src/lib/sidebar-indicators";
import { useAppTheme } from "../../../src/providers/AppThemeProvider";

export default function HomeTabsLayout() {
  const { colors } = useAppTheme();
  const { unreadCount } = useSidebarIndicators();

  return (
    <NativeTabs
      backgroundColor={colors.background}
      tintColor={colors.primary}
      iconColor={{
        default: colors.mutedForeground,
        selected: colors.primary,
      }}
      labelStyle={{ color: colors.foreground }}
      indicatorColor={Platform.OS === "android" ? colors.primary : undefined}
      rippleColor={Platform.OS === "android" ? colors.border : undefined}
    >
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
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{
            default: "person.crop.circle",
            selected: "person.crop.circle.fill",
          }}
          md="account_circle"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
