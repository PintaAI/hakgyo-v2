import * as Updates from "expo-updates";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Linking, Platform, Text } from "react-native";

import { api } from "../lib/trpc";
import { APP_VERSION } from "../lib/release-notes";
import { useAppTheme } from "../providers/AppThemeProvider";
import { ReleaseNotesPanel } from "./release-notes";
import { Action } from "./ui/action";

type Phase =
  | { kind: "checking" }
  | { kind: "downloading" }
  | { kind: "restarting" }
  | { kind: "store" }
  | { kind: "error"; message: string };

/**
 * Store listings, shown when no OTA update can satisfy the server. Kept out of
 * app.config.ts so changing them never alters the native fingerprint. A null
 * entry makes the gate offer only the OTA retry. The iOS id is the App Store
 * Connect "Apple ID" of com.rorez.hakgyo (also `ascAppId` in eas.json).
 */
const STORE_URLS: { ios: string | null; android: string | null } = {
  ios: "https://apps.apple.com/app/id6759476908",
  android: "https://play.google.com/store/apps/details?id=com.rorez.hakgyo",
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
 * Mirrors the manual "Check for updates" flow: check → fetch → reload; the
 * "Yang baru" prompt then shows the update's notes. When no OTA update can
 * fix it (updates disabled, dev client, nothing published) it points to the
 * app store and lists what the store build adds, which only the server knows.
 * The outbox is untouched; progress syncs after the update.
 */
export function ForcedUpdateGate({ minProtocol }: { minProtocol: number }) {
  const { colors } = useAppTheme();
  const [phase, setPhase] = useState<Phase>({ kind: "checking" });
  const [attempt, setAttempt] = useState(0);
  const listing = storeUrl();
  const storeNotes = api.mobileRelease.storeNotes.useQuery(
    { version: APP_VERSION },
    { enabled: phase.kind === "store", staleTime: Infinity },
  );
  const notes = phase.kind === "store" ? (storeNotes.data ?? []) : [];

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
              : "Pembaruan tidak dapat diunduh.",
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
  const storeName = Platform.OS === "ios" ? "App Store" : "Google Play";

  return (
    <ReleaseNotesPanel
      symbol="arrow.down.circle.fill"
      title="Pembaruan diperlukan"
      description={
        phase.kind === "checking"
          ? "Memeriksa pembaruan…"
          : phase.kind === "downloading"
            ? "Mengunduh pembaruan…"
            : phase.kind === "restarting"
              ? "Memulai ulang untuk menerapkan pembaruan…"
              : phase.kind === "error"
                ? phase.message
                : `Versi Hakgyo ini tidak dapat lagi disinkronkan dengan server. Pasang versi terbaru dari ${storeName} untuk melanjutkan belajar.`
      }
      notesTitle={
        notes[0] ? `Yang baru di versi ${notes[0].version}` : undefined
      }
      notes={notes}
      status={
        <>
          {busy ? <ActivityIndicator color={colors.primary} /> : null}
          <Text className="text-center text-xs text-muted-foreground">
            Progres kamu tetap tersimpan di perangkat ini dan akan disinkronkan
            setelah pembaruan.
          </Text>
          <Text className="text-center text-[11px] text-muted-foreground">
            Requires sync protocol {minProtocol} or newer.
          </Text>
        </>
      }
      actions={
        busy ? null : (
          <>
            {listing ? (
              <Action onPress={openStore}>{`Buka ${storeName}`}</Action>
            ) : (
              <Text className="text-center text-sm text-muted-foreground">
                Pasang versi Hakgyo terbaru dari {storeName}.
              </Text>
            )}
            <Action
              variant="secondary"
              onPress={() => setAttempt((value) => value + 1)}
            >
              Periksa pembaruan lagi
            </Action>
          </>
        )
      }
    />
  );
}
