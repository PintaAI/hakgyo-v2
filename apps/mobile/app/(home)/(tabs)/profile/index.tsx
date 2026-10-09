import { useQueryClient } from "@tanstack/react-query";
import { supportEmail } from "@hakgyo/shared";
import Constants from "expo-constants";
import { router } from "expo-router";
import * as Updates from "expo-updates";
import * as WebBrowser from "expo-web-browser";
import { useUpdates } from "expo-updates";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Linking, Platform, Text } from "react-native";

import { AppSegmentedControl } from "../../../../src/components/app-segmented-control";
import { DoodleBackground } from "../../../../src/components/doodle-background";
import {
  formatDuration,
  LocalDataReport,
} from "../../../../src/components/local-data-report";
import { StudyScreen } from "../../../../src/components/learning-ui";
import {
  MilestoneTrail,
  ProfileHero,
  RecentActivity,
} from "../../../../src/components/profile-learner";
import {
  SettingsRow,
  SettingsSection,
  SettingsToggleRow,
} from "../../../../src/components/settings-ui";
import { WeeklyStreak } from "../../../../src/components/weekly-streak";
import { apiUrl } from "../../../../src/config";
import { authClient } from "../../../../src/lib/auth-client";
import { api } from "../../../../src/lib/trpc";
import { useAppTheme } from "../../../../src/providers/AppThemeProvider";
import { useMobileSync } from "../../../../src/providers/MobileSyncProvider";
import {
  type PushStatus,
  usePushNotifications,
} from "../../../../src/providers/PushNotificationsProvider";
import { useSyncIndex } from "../../../../src/sync/hooks";
import type { LocalDataStats } from "../../../../src/sync/store";
import type { ResyncReport } from "../../../../src/sync/types";

const APP_VERSION = Constants.expoConfig?.version ?? "1.0.0";
const UPDATE_CHANNEL = Updates.channel ?? "unpublished";
const CURRENT_UPDATE_ID = Updates.updateId ?? null;

const PUSH_STATUS_DETAIL: Record<PushStatus, string | undefined> = {
  loading: undefined,
  unsupported: "Tidak tersedia di perangkat ini",
  off: "Tugas, tryout, dan pertemuan kelas",
  undetermined: "Tugas, tryout, dan pertemuan kelas",
  denied: "Izin notifikasi belum diberikan",
  blocked: "Diblokir di pengaturan perangkat",
  unregistered: "Belum terhubung, coba lagi saat online",
  enabled: "Tugas, tryout, dan pertemuan kelas",
};

function openWebPage(path: string) {
  void WebBrowser.openBrowserAsync(`${apiUrl}${path}`).catch(() =>
    Alert.alert("Tidak dapat membuka halaman", `${apiUrl}${path}`),
  );
}

function contactSupport() {
  const url = `mailto:${supportEmail}?subject=${encodeURIComponent(
    `Bantuan Hakgyo v${APP_VERSION}`,
  )}`;
  void Linking.openURL(url).catch(() =>
    Alert.alert("Hubungi dukungan", `Kirim email ke ${supportEmail}.`),
  );
}

export default function ProfileTab() {
  const queryClient = useQueryClient();
  const { data: session, refetch: refetchSession } = authClient.useSession();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const { isUpdatePending } = useUpdates();
  const [segment, setSegment] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const {
    activeBrand,
    activeOrganizationId,
    isRefreshingOrganizations,
    refreshOrganizations,
  } = useAppTheme();
  const {
    isSyncing,
    pendingCount,
    deadLetterCount,
    upgradeRequired,
    syncNow,
    checkpoint,
    clearLocalDataAndResync,
    getLocalDataStats,
  } = useMobileSync();
  const push = usePushNotifications();
  const [isResetting, setIsResetting] = useState(false);
  const [localStats, setLocalStats] = useState<LocalDataStats | null>(null);
  const [resyncReport, setResyncReport] = useState<ResyncReport | null>(null);
  const syncIndex = useSyncIndex(activeOrganizationId);
  const courseTitles = useMemo(
    () =>
      Object.fromEntries(
        (syncIndex.data?.courses ?? []).map((course) => [
          course.id,
          course.title,
        ]),
      ),
    [syncIndex.data],
  );
  const refreshLocalStats = useCallback(() => {
    if (!__DEV__) return;
    void getLocalDataStats()
      .then(setLocalStats)
      .catch(() => undefined);
  }, [getLocalDataStats]);
  useEffect(() => {
    if (!isSyncing) refreshLocalStats();
  }, [isSyncing, refreshLocalStats]);
  const progress = api.gamification.getMySummary.useQuery();
  const displayName = session?.user.name || "Pelajar Hakgyo";
  const initials = displayName
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");

  const handleCheckForUpdates = async () => {
    if (isCheckingUpdates) return;
    setIsCheckingUpdates(true);

    try {
      if (__DEV__ || !Updates.isEnabled) {
        Alert.alert(
          "Pembaruan",
          "Pembaruan over-the-air hanya berfungsi di build standalone. Kamu sedang menjalankan mode pengembangan.",
        );
        return;
      }
      if (isUpdatePending) {
        Alert.alert(
          "Pembaruan siap",
          "Pembaruan yang sudah diunduh sedang menunggu. Mulai ulang sekarang untuk menerapkannya?",
          [
            { text: "Nanti", style: "cancel" },
            {
              text: "Mulai ulang",
              onPress: () => void Updates.reloadAsync(),
            },
          ],
        );
        return;
      }
      const result = await Updates.checkForUpdateAsync();
      if (!result.isAvailable) {
        Alert.alert(
          "Sudah terbaru",
          `Kamu sudah memakai pembaruan ${UPDATE_CHANNEL} terbaru (v${APP_VERSION}).`,
        );
        return;
      }
      Alert.alert(
        "Pembaruan tersedia",
        "Unduh dan mulai ulang aplikasi sekarang?",
        [
          { text: "Nanti", style: "cancel" },
          {
            text: "Unduh & mulai ulang",
            onPress: () =>
              void (async () => {
                try {
                  await Updates.fetchUpdateAsync();
                  await Updates.reloadAsync();
                } catch (cause) {
                  Alert.alert(
                    "Pembaruan gagal",
                    cause instanceof Error
                      ? cause.message
                      : "Pembaruan tidak dapat diunduh.",
                  );
                }
              })(),
          },
        ],
      );
    } catch (cause) {
      Alert.alert(
        "Gagal memeriksa pembaruan",
        cause instanceof Error
          ? cause.message
          : "Tidak dapat memeriksa pembaruan.",
      );
    } finally {
      setIsCheckingUpdates(false);
    }
  };

  // Signing out wipes every local record (MobileSyncProvider), so upload
  // queued progress first and ask before discarding what could not be sent.
  const confirmDiscardPending = () =>
    new Promise<boolean>((resolve) => {
      Alert.alert(
        "Progres belum tersinkron",
        "Sebagian progres belajar belum terkirim ke server. Jika keluar sekarang, progres itu akan hilang.",
        [
          { text: "Batal", style: "cancel", onPress: () => resolve(false) },
          {
            text: "Tetap keluar",
            style: "destructive",
            onPress: () => resolve(true),
          },
        ],
        { cancelable: true, onDismiss: () => resolve(false) },
      );
    });

  const handleSignOut = async () => {
    setError(null);
    setIsSigningOut(true);

    try {
      if (pendingCount > 0) {
        const flushed = await checkpoint(activeOrganizationId ?? undefined)
          .then((sync) => sync.state === "synced")
          .catch(() => false);
        if (!flushed && !(await confirmDiscardPending())) return;
      }

      // Needs the session, so it must run before signing out.
      await push.unregisterDevice();
      const result = await authClient.signOut();

      if (result.error) {
        setError(result.error.message || "Tidak dapat keluar.");
        return;
      }

      await queryClient.cancelQueries();
      queryClient.clear();
      router.replace("/");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Tidak dapat keluar.");
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <>
      <DoodleBackground />
      <StudyScreen
        title=""
        headerShown={Platform.OS === "ios"}
        onRefresh={() => {
          void syncNow(activeOrganizationId ?? undefined);
          void refreshOrganizations();
        }}
        refreshing={isSyncing || isRefreshingOrganizations}
      >
        <Text
          accessibilityRole="header"
          className="text-[26px] font-black leading-8 tracking-tight text-foreground"
        >
          Profil
        </Text>
        <AppSegmentedControl
          values={["Profil", "Pengaturan"]}
          selectedIndex={segment}
          onIndexChange={setSegment}
        />

        {segment === 0 ? (
          <>
            <ProfileHero
              displayName={displayName}
              initials={initials}
              image={session?.user.image}
              email={session?.user.email ?? "Belum masuk"}
              stats={progress.data?.profileStats}
              isPending={progress.isPending}
            />
            <WeeklyStreak />
            <MilestoneTrail
              achievements={progress.data?.achievements}
              isPending={progress.isPending}
              error={progress.error}
              onRetry={() => void progress.refetch()}
            />
            <RecentActivity
              activities={progress.data?.recentActivity ?? []}
              weekXp={progress.data?.weeklyActivity.xp ?? 0}
            />
          </>
        ) : (
          <>
            <SettingsSection title="Akun">
              <SettingsRow
                label="Detail akun"
                detail={session?.user.email ?? "Belum masuk"}
                symbol="person.crop.circle"
                fallback="?"
                onPress={() => router.push("/(home)/(tabs)/profile/account")}
              />
              <SettingsRow
                label="Keluar"
                symbol="arrow.right"
                fallback="→"
                destructive
                onPress={() => void handleSignOut()}
              />
            </SettingsSection>

            <SettingsSection title="Tampilan">
              <SettingsRow
                label="Organisasi"
                detail={activeBrand.name}
                symbol="square.grid.2x2"
                fallback="#"
                onPress={() => router.push("/organization-switcher")}
              />
            </SettingsSection>

            <SettingsSection title="Notifikasi">
              <SettingsToggleRow
                label="Notifikasi push"
                detail={PUSH_STATUS_DETAIL[push.status]}
                symbol="bell.fill"
                fallback="!"
                value={push.status === "enabled"}
                onValueChange={(enabled) => {
                  if (push.status === "unsupported") {
                    Alert.alert(
                      "Notifikasi push",
                      "Notifikasi push hanya tersedia di aplikasi yang terpasang pada perangkat fisik.",
                    );
                    return;
                  }
                  void push.setEnabled(enabled);
                }}
              />
              <SettingsRow
                label="Pengingat dan peringatan"
                detail="Pengaturan sistem"
                symbol="speaker.fill"
                fallback="♪"
                onPress={() => void Linking.openSettings()}
              />
            </SettingsSection>

            <SettingsSection title="Pembaruan">
              {upgradeRequired ? (
                <SettingsRow
                  label="Pembaruan diperlukan"
                  subtitle={`Server membutuhkan protokol sinkronisasi ${upgradeRequired.minProtocol}. Progres tetap tersimpan di perangkat ini sampai kamu memperbarui aplikasi.`}
                  symbol="exclamationmark.triangle.fill"
                  fallback="!"
                  destructive
                  onPress={() => void handleCheckForUpdates()}
                />
              ) : null}
              <SettingsRow
                label="Sinkronkan materi dan progres"
                detail={
                  isSyncing
                    ? "Menyinkronkan…"
                    : pendingCount
                      ? `${pendingCount} perubahan menunggu sinkronisasi`
                      : deadLetterCount
                        ? `${deadLetterCount} perubahan gagal disinkronkan`
                        : "Sudah terbaru"
                }
                symbol="arrow.triangle.2.circlepath"
                fallback="↻"
                onPress={() => void syncNow(activeOrganizationId ?? undefined)}
              />
              <SettingsRow
                label="Periksa pembaruan"
                detail={
                  isCheckingUpdates
                    ? "Memeriksa…"
                    : isUpdatePending
                      ? "Mulai ulang untuk menerapkan"
                      : `v${APP_VERSION}`
                }
                symbol="checkmark"
                fallback="✓"
                onPress={() => void handleCheckForUpdates()}
              />
              <SettingsRow
                label={`Versi aplikasi ${APP_VERSION}`}
                detail={
                  CURRENT_UPDATE_ID
                    ? `${UPDATE_CHANNEL} · ${CURRENT_UPDATE_ID.slice(0, 8)}`
                    : UPDATE_CHANNEL
                }
                symbol="list.bullet"
                fallback="i"
                onPress={() =>
                  Alert.alert(
                    "Versi aplikasi",
                    CURRENT_UPDATE_ID
                      ? `v${APP_VERSION} (${UPDATE_CHANNEL})\nPembaruan: ${CURRENT_UPDATE_ID}`
                      : `v${APP_VERSION} (${UPDATE_CHANNEL})\nBuild bawaan, belum ada pembaruan OTA yang diterapkan.`,
                  )
                }
              />
            </SettingsSection>

            {__DEV__ ? (
              <SettingsSection title="Pengembangan">
                <SettingsRow
                  label="Sinkronkan ulang"
                  subtitle="Hapus data lokal, lalu unduh ulang materi dan gambar"
                  detail={isResetting ? "Memproses…" : undefined}
                  symbol="arrow.clockwise"
                  fallback="↻"
                  onPress={() => {
                    if (isResetting || isSyncing) return;
                    Alert.alert(
                      "Hapus data lokal?",
                      "Progres yang tertunda akan disinkronkan terlebih dahulu. Setelah itu, data belajar dan gambar akan diunduh ulang.",
                      [
                        { text: "Batal", style: "cancel" },
                        {
                          text: "Hapus & sinkronkan ulang",
                          onPress: () => {
                            setIsResetting(true);
                            void clearLocalDataAndResync(
                              activeOrganizationId ?? undefined,
                            )
                              .then(async (report) => {
                                setResyncReport(report);
                                setLocalStats(report.stats);
                                await Promise.all([
                                  refreshOrganizations(),
                                  progress.refetch(),
                                  refetchSession(),
                                ]);
                                Alert.alert(
                                  "Sinkronisasi ulang selesai",
                                  `Data dimuat ulang dalam ${formatDuration(report.totalMs)}. Lihat rinciannya di bawah.`,
                                );
                              })
                              .catch((cause: unknown) => {
                                Alert.alert(
                                  "Tidak dapat menyinkronkan ulang",
                                  cause instanceof Error
                                    ? cause.message
                                    : "Coba lagi saat online.",
                                );
                              })
                              .finally(() => setIsResetting(false));
                          },
                        },
                      ],
                    );
                  }}
                />
                <LocalDataReport
                  stats={localStats}
                  report={resyncReport}
                  courseTitles={courseTitles}
                  isSyncing={isResetting}
                />
              </SettingsSection>
            ) : null}

            <SettingsSection title="Bantuan">
              <SettingsRow
                label="Pusat bantuan"
                symbol="questionmark.circle"
                fallback="?"
                onPress={() => openWebPage("/support")}
              />
              <SettingsRow
                label="Hubungi dukungan"
                detail={supportEmail}
                symbol="envelope.fill"
                fallback="@"
                onPress={contactSupport}
              />
              <SettingsRow
                label="Kebijakan privasi"
                symbol="hand.raised.fill"
                fallback="i"
                onPress={() => openWebPage("/privacy")}
              />
              <SettingsRow
                label="Syarat dan ketentuan"
                symbol="doc.text"
                fallback="§"
                onPress={() => openWebPage("/terms")}
              />
            </SettingsSection>

            {(error ?? isSigningOut) ? (
              <Text
                accessibilityLiveRegion="polite"
                className="text-center text-sm font-semibold text-muted-foreground"
              >
                {error ?? "Sedang keluar…"}
              </Text>
            ) : null}
          </>
        )}
      </StudyScreen>
    </>
  );
}
