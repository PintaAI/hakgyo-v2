import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Platform } from "react-native";

import { useAppTheme } from "../../../src/providers/AppThemeProvider";

export default function HomeTabsLayout() {
  const { colors } = useAppTheme();

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
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="cohorts">
        <NativeTabs.Trigger.Label>Cohorts</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.3.fill" md="groups" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="assessments">
        <NativeTabs.Trigger.Label>Assessments</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="checklist" md="checklist" />
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
