import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Pressable, Text, View } from "react-native";

import { openSyncStatus } from "../../lib/navigation";
import { useAppTheme } from "../../providers/AppThemeProvider";
import type { SyncActivity } from "../../sync/activity";
import { SyncActivityIcon } from "./sync-activity-icon";

export { supportsTabBarAccessory } from "./supports-accessory";

/**
 * Sync activity in the iOS 26 tab bar accessory: a full line above the tab
 * bar, or a compact one beside it while the tab bar is minimized. Native tabs
 * render one copy per placement, so everything comes from props.
 */
export function SyncAccessory({ activity }: { activity: SyncActivity }) {
  const { colors } = useAppTheme();
  const placement = NativeTabs.BottomAccessory.usePlacement();
  const inline = placement === "inline";
  const count = activity.progress
    ? `${Math.min(activity.progress.done + 1, activity.progress.total)}/${activity.progress.total}`
    : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${activity.title}. ${activity.detail}`}
      accessibilityHint="Buka status sinkron"
      className={`h-full flex-row items-center ${inline ? "gap-2 px-3" : "gap-3 px-4"}`}
      onPress={openSyncStatus}
    >
      <View className="w-5 items-center">
        <SyncActivityIcon kind={activity.kind} size={inline ? 16 : 20} />
      </View>
      <View className="min-w-0 flex-1">
        <Text
          className={`font-semibold ${inline ? "text-sm" : "text-[15px]"}`}
          style={{ color: colors.foreground }}
          numberOfLines={1}
        >
          {activity.title}
        </Text>
        {inline ? null : (
          <Text className="text-xs text-muted-foreground" numberOfLines={1}>
            {activity.detail}
          </Text>
        )}
      </View>
      {count && !inline ? (
        <Text className="text-xs font-semibold text-muted-foreground">
          {count}
        </Text>
      ) : null}
    </Pressable>
  );
}
