import { router, Stack } from "expo-router";
import { Platform } from "react-native";

import { SyncStatusContent } from "../src/components/sync-activity/sync-status-content";
import { toolbarIcons } from "../src/theme/toolbar-icons";

export default function SyncStatusScreen() {
  const close = () => router.back();

  return (
    <>
      {Platform.OS === "ios" ? (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            accessibilityLabel="Tutup status sinkron"
            icon={toolbarIcons.close}
            onPress={close}
          />
        </Stack.Toolbar>
      ) : null}
      <SyncStatusContent onClose={close} />
    </>
  );
}
