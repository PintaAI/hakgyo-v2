import * as Updates from "expo-updates";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "../providers/AppThemeProvider";

type Phase =
  | { kind: "checking" }
  | { kind: "downloading" }
  | { kind: "restarting" }
  | { kind: "store" }
  | { kind: "error"; message: string };

/**
 * Store listings, shown when no OTA update can satisfy the server. Kept out of
 * app.config.ts so changing them never alters the native fingerprint. Null
 * until the app is published; the gate then offers only the OTA retry.
 */
const STORE_URLS: { ios: string | null; android: string | null } = {
  ios: null,
  android: null,
};

export function storeUrl() {
  const url = Platform.select({
    ios: STORE_URLS.ios,
    android: STORE_URLS.android,
  });
  return url?.trim() ? url : null;
}

/**
 * Full-screen gate shown when the server requires a newer client protocol.
 * Mirrors the manual "Check for updates" flow: check → fetch → reload. When
 * no OTA update can fix it (updates disabled, dev client, nothing published)
 * it points to the app store. The outbox is untouched; progress syncs after
 * the update.
 */
export function ForcedUpdateGate({ minProtocol }: { minProtocol: number }) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<Phase>({ kind: "checking" });
  const [attempt, setAttempt] = useState(0);
  const listing = storeUrl();

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (__DEV__ || !Updates.isEnabled) {
        setPhase({ kind: "store" });
        return;
      }
      try {
        setPhase({ kind: "checking" });
        const result = await Updates.checkForUpdateAsync();
        if (!active) return;
        if (!result.isAvailable) {
          setPhase({ kind: "store" });
          return;
        }
        setPhase({ kind: "downloading" });
        await Updates.fetchUpdateAsync();
        if (!active) return;
        setPhase({ kind: "restarting" });
        await Updates.reloadAsync();
      } catch (cause) {
        if (!active) return;
        setPhase({
          kind: "error",
          message:
            cause instanceof Error
              ? cause.message
              : "The update could not be downloaded.",
        });
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [attempt]);

  const openStore = useCallback(() => {
    if (listing) void Linking.openURL(listing);
  }, [listing]);

  const busy =
    phase.kind === "checking" ||
    phase.kind === "downloading" ||
    phase.kind === "restarting";

  return (
    <View
      accessibilityViewIsModal
      className="flex-1 items-center justify-center gap-6 bg-background px-8"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <View className="size-16 items-center justify-center rounded-2xl bg-primary/10">
        <Text className="text-3xl">⬆️</Text>
      </View>
      <View className="items-center gap-2">
        <Text
          accessibilityRole="header"
          className="text-center text-2xl font-black tracking-tight text-foreground"
        >
          Update required
        </Text>
        <Text className="text-center text-sm leading-5 text-muted-foreground">
          {busy
            ? phase.kind === "checking"
              ? "Checking for an update…"
              : phase.kind === "downloading"
                ? "Downloading the update…"
                : "Restarting to apply the update…"
            : phase.kind === "error"
              ? phase.message
              : "This version of Hakgyo can no longer sync with the server. Install the latest version to continue learning."}
        </Text>
        <Text className="text-center text-xs text-muted-foreground">
          Your saved progress stays on this device and syncs after the update.
        </Text>
      </View>

      {busy ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <View className="w-full gap-3">
          {listing ? (
            <Pressable
              accessibilityRole="button"
              className="min-h-12 items-center justify-center rounded-full bg-primary px-5 py-3 active:opacity-80"
              onPress={openStore}
            >
              <Text className="font-bold text-primary-foreground">
                {Platform.OS === "ios"
                  ? "Open the App Store"
                  : "Open Google Play"}
              </Text>
            </Pressable>
          ) : (
            <Text className="text-center text-sm text-muted-foreground">
              Install the latest Hakgyo build from{" "}
              {Platform.OS === "ios" ? "the App Store" : "Google Play"}.
            </Text>
          )}
          <Pressable
            accessibilityRole="button"
            className="min-h-12 items-center justify-center rounded-full border border-border px-5 py-3 active:opacity-80"
            onPress={() => setAttempt((value) => value + 1)}
          >
            <Text className="font-bold text-foreground">
              Check for an update again
            </Text>
          </Pressable>
        </View>
      )}
      <Text className="text-center text-[11px] text-muted-foreground">
        Requires sync protocol {minProtocol} or newer.
      </Text>
    </View>
  );
}
