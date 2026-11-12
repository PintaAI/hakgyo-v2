import { router, Stack } from "expo-router";
import { Platform } from "react-native";

import { LeaderboardContent } from "../src/components/leaderboard-content";
import { toolbarIcons } from "../src/theme/toolbar-icons";

/** Peringkat minggu ini, opened from the XP pill of the weekly streak. */
export default function LeaderboardScreen() {
  const close = () => router.back();

  return (
    <>
      {Platform.OS === "ios" ? (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            accessibilityLabel="Tutup peringkat"
            icon={toolbarIcons.close}
            onPress={close}
          />
        </Stack.Toolbar>
      ) : null}
      <LeaderboardContent onClose={close} />
    </>
  );
}
