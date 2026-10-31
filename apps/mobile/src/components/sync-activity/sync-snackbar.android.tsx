import {
  Host,
  Snackbar,
  SnackbarHost,
  type SnackbarHostRef,
} from "@expo/ui/jetpack-compose";
import { useIsFocused } from "expo-router";
import { useEffect, useRef } from "react";
import { View } from "react-native";

import { openSyncStatus } from "../../lib/navigation";
import { useAppTheme } from "../../providers/AppThemeProvider";
import type { SyncActivity } from "../../sync/activity";
import { useSyncActivity } from "../../sync/use-sync-activity";

// Every tab root mounts a host, and only the focused one announces. Shared so
// switching tabs does not repeat an announcement.
let lastAnnouncedKey: string | null = null;

function snackbarMessage(activity: SyncActivity) {
  if (activity.kind !== "downloading") return activity.title;
  const total = activity.progress?.total ?? 1;
  return total > 1
    ? `Mengunduh ${total} kursus untuk dipakai offline`
    : `${activity.title} untuk dipakai offline`;
}

/**
 * Android's sync announcements: a Material 3 snackbar above the tab bar when
 * downloads start, when they finish or fail, and when progress has to wait.
 * "Lihat" opens the sync status sheet.
 */
export function SyncSnackbar() {
  const { colorScheme, colors } = useAppTheme();
  const focused = useIsFocused();
  const activity = useSyncActivity();
  const host = useRef<SnackbarHostRef>(null);
  const key = activity?.key ?? null;

  useEffect(() => {
    if (!focused) return;
    if (!activity) {
      // Waiting again later is a new announcement.
      lastAnnouncedKey = null;
      return;
    }
    if (activity.key === lastAnnouncedKey) return;
    lastAnnouncedKey = activity.key;
    void host.current
      ?.showSnackbar({
        message: snackbarMessage(activity),
        actionLabel: "Lihat",
        duration: activity.kind === "failed" ? "long" : "short",
      })
      .then((result) => {
        if (result === "actionPerformed") openSyncStatus();
      });
    // Announce once per key, not on every progress update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused, key]);

  return (
    <View
      pointerEvents="box-none"
      className="absolute bottom-0 left-0 right-0 px-2"
    >
      <Host
        matchContents={{ vertical: true }}
        colorScheme={colorScheme}
        seedColor={colors.primary}
      >
        <SnackbarHost ref={host}>
          <Snackbar actionContentColor={colors.primary} />
        </SnackbarHost>
      </Host>
    </View>
  );
}
