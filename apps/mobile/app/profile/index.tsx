import { useQueryClient } from "@tanstack/react-query";
import { supportEmail } from "@hakgyo/shared";
import { reloadAppAsync } from "expo";
import {
  router,
  Stack,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";
import * as Updates from "expo-updates";
import * as WebBrowser from "expo-web-browser";
import { useUpdates } from "expo-updates";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Linking, Text } from "react-native";

import { AppSegmentedControl } from "../../src/components/app-segmented-control";
import { LocalDataReport } from "../../src/components/local-data-report";
import { StudyScreen } from "../../src/components/learning-ui";
import {
  MilestoneTrail,
  ProfileHero,
  RecentActivity,
} from "../../src/components/profile-learner";
import { CourseBadges } from "../../src/components/course-badges";
import { useUserRefresh } from "../../src/lib/use-user-refresh";
import { useDemo } from "../../src/demo/demo-provider";
import {
  SettingsRow,
  SettingsSection,
  SettingsToggleRow,
} from "../../src/components/settings-ui";
import { WeeklyStreak } from "../../src/components/weekly-streak";
import { useAutoTour, useTourReplay } from "../../src/tour/tour-provider";
import { TourTarget } from "../../src/tour/tour-target";
import { apiUrl } from "../../src/config";
import { authClient } from "../../src/lib/auth-client";
import { openSyncStatus } from "../../src/lib/navigation";
import { forgetSecureStorage } from "../../src/lib/reset-app";
import { getStudyReminder } from "../../src/lib/study-reminder";
import { studyReminderSummary } from "../../src/lib/study-reminder-plan";
import {
  APP_VERSION,
  installedReleaseNotes,
  releaseDateLabel,
} from "../../src/lib/release-notes";
import { api } from "../../src/lib/trpc";
import { firstParam } from "../../src/lib/route-params";
import { stepSyncActivityPreview } from "../../src/sync/activity-preview";
import { useAppTheme } from "../../src/providers/AppThemeProvider";
import { useMobileSync } from "../../src/providers/MobileSyncProvider";
import {
  type PushStatus,
  usePushNotifications,
} from "../../src/providers/PushNotificationsProvider";
import { useSyncIndex } from "../../src/sync/hooks";
import { toolbarIcons } from "../../src/theme/toolbar-icons";
import type { LocalDataStats } from "../../src/sync/store";
import type { ResyncReport } from "../../src/sync/types";

const latestReleaseNote = installedReleaseNotes[0];
const UPDATE_CHANNEL = Updates.channel ?? "unpublished";
// Pengembangan shows in dev clients and in development and preview builds
// (TestFlight, preview APKs), where testers need to start over too.
const SHOW_DEVELOPER_TOOLS = __DEV__ || UPDATE_CHANNEL !== "production";
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

export default function ProfileScreen() {
  const queryClient = useQueryClient();
  const { data: session, refetch: refetchSession } = authClient.useSession();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isResettingApp, setIsResettingApp] = useState(false);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const { isUpdatePending } = useUpdates();
  const params = useLocalSearchParams<{ segment?: string | string[] }>();
  // The header gear opens the sheet straight on Pengaturan.
  const [segment, setSegment] = useState(
    firstParam(params.segment) === "settings" ? 1 : 0,
  );
  const [error, setError] = useState<string | null>(null);
  const { activeBrand, activeOrganizationId, refreshOrganizations } =
    useAppTheme();
  const {
    isSyncing,
    pendingCount,
    deadLetterCount,
    upgradeRequired,
    syncNow,
    checkpoint,
    clearLocalDataAndResync,
    clearDeviceData,
    getLocalDataStats,
  } = useMobileSync();
  const push = usePushNotifications();
  // Read again on return from the Pengingat belajar page, which changes it.
  const [reminderSummary, setReminderSummary] = useState(() =>
    studyReminderSummary(getStudyReminder()),
  );
  useFocusEffect(
    useCallback(() => {
      setReminderSummary(studyReminderSummary(getStudyReminder()));
    }, []),
  );
  const demo = useDemo();
  const [isResetting, setIsResetting] = useState(false);
  const [localStats, setLocalStats] = useState<LocalDataStats | null>(null);
  const [resyncReport, setResyncReport] = useState<ResyncReport | null>(null);
  const [syncPreviewTitle, setSyncPreviewTitle] = useState<string | null>(null);
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
  const pullRefresh = useUserRefresh(() =>
    Promise.all([
      syncNow(activeOrganizationId ?? undefined),
      refreshOrganizations(),
    ]),
  );
  const progress = api.gamification.getMySummary.useQuery();
  // Opened on Pengaturan from the gear, the profile tour waits for Profil.
  useAutoTour("profile", segment === 0 && !progress.isPending);
  const replayTours = useTourReplay();
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

  // Everything on the device goes, including what a sign-out keeps (the
  // onboarding and "Yang baru" markers), then the app restarts as if newly
  // installed.
  const resetApp = async () => {
    setError(null);
    setIsResettingApp(true);

    try {
      if (pendingCount > 0) {
        const flushed = await checkpoint(activeOrganizationId ?? undefined)
          .then((sync) => sync.state === "synced")
          .catch(() => false);
        if (!flushed && !(await confirmDiscardPending())) return;
      }

      // Both need the session. Offline, the server session simply expires;
      // the device forgets it either way.
      await push.unregisterDevice().catch(() => undefined);
      await authClient.signOut().catch(() => undefined);
      await clearDeviceData();
      await forgetSecureStorage();
      await reloadAppAsync("Reset aplikasi");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Tidak dapat mereset aplikasi.",
      );
    } finally {
      setIsResettingApp(false);
    }
  };

  const confirmResetApp = () => {
    if (isResettingApp || isSigningOut) return;
    Alert.alert(
      "Reset aplikasi?",
      "Semua data aplikasi di HP ini dihapus: materi offline, gambar, info masuk, dan pengaturan. Aplikasi lalu dibuka ulang seperti baru dipasang. Akun dan progres yang sudah terkirim tetap aman.",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => void resetApp(),
        },
      ],
    );
  };

  return (
    <>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          accessibilityLabel="Tutup profil"
          icon={toolbarIcons.close}
          onPress={() => router.back()}
        />
      </Stack.Toolbar>
      <StudyScreen
        title="Profil"
        headerShown
        // Spins for the learner's own pull only, not background syncs.
        onRefresh={pullRefresh.onRefresh}
        refreshing={pullRefresh.refreshing}
      >
        <TourTarget id="profile.segments">
          <AppSegmentedControl
            values={["Profil", "Pengaturan"]}
            selectedIndex={segment}
            onIndexChange={setSegment}
          />
        </TourTarget>

        {segment === 0 ? (
          <>
            <TourTarget id="profile.stats">
              <ProfileHero
                displayName={displayName}
                initials={initials}
                image={session?.user.image}
                email={session?.user.email ?? "Belum masuk"}
                stats={progress.data?.profileStats}
                isPending={progress.isPending}
              />
            </TourTarget>
            <WeeklyStreak />
            <TourTarget id="profile.milestones">
              <MilestoneTrail
                achievements={progress.data?.achievements}
                isPending={progress.isPending}
                error={progress.error}
                onRetry={() => void progress.refetch()}
              />
            </TourTarget>
            <CourseBadges />
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
                onPress={() => router.push("/profile/account")}
              />
              {/* Its screen shows each course and has "Sinkronkan sekarang". */}
              <SettingsRow
                label="Sinkronisasi"
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
                onPress={openSyncStatus}
              />
              <SettingsRow
                label="Keluar"
                symbol="arrow.right"
                destructive
                onPress={() => void handleSignOut()}
              />
            </SettingsSection>

            <SettingsSection title="Tampilan">
              <SettingsRow
                label="Organisasi"
                detail={activeBrand.name}
                symbol="square.grid.2x2"
                onPress={() => router.push("/organization-switcher")}
              />
            </SettingsSection>

            <SettingsSection title="Notifikasi">
              <SettingsToggleRow
                label="Notifikasi push"
                detail={PUSH_STATUS_DETAIL[push.status]}
                symbol="bell.fill"
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
                label="Pengingat belajar"
                detail={reminderSummary}
                symbol="alarm.fill"
                onPress={() => router.push("/profile/study-reminder")}
              />
              <SettingsRow
                label="Pengingat dan peringatan"
                detail="Pengaturan sistem"
                symbol="speaker.fill"
                onPress={() => void Linking.openSettings()}
              />
            </SettingsSection>

            <SettingsSection title="Pembaruan">
              {upgradeRequired ? (
                <SettingsRow
                  label="Pembaruan diperlukan"
                  subtitle={`Server membutuhkan protokol sinkronisasi ${upgradeRequired.minProtocol}. Progres tetap tersimpan di perangkat ini sampai kamu memperbarui aplikasi.`}
                  symbol="exclamationmark.triangle.fill"
                  destructive
                  onPress={() => void handleCheckForUpdates()}
                />
              ) : null}
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
                onPress={() => void handleCheckForUpdates()}
              />
              <SettingsRow
                label="Yang baru"
                detail={
                  latestReleaseNote
                    ? releaseDateLabel(latestReleaseNote.date)
                    : undefined
                }
                symbol="sparkles"
                onPress={() => router.push("/profile/whats-new")}
              />
              <SettingsRow
                label={`Versi aplikasi ${APP_VERSION}`}
                detail={
                  CURRENT_UPDATE_ID
                    ? `${UPDATE_CHANNEL} · ${CURRENT_UPDATE_ID.slice(0, 8)}`
                    : UPDATE_CHANNEL
                }
                symbol="list.bullet"
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

            {SHOW_DEVELOPER_TOOLS ? (
              <SettingsSection title="Pengembangan">
                <SettingsRow
                  label="Jalankan demo"
                  subtitle="Mulai rekam layar dulu. Aplikasi lalu berjalan sendiri: Hari Ini, Belajar, Latihan, Cari, dan Profil."
                  detail={demo.running ? "Berjalan…" : undefined}
                  symbol="play.fill"
                  onPress={() => {
                    if (!demo.running) demo.start("tour");
                  }}
                />
                <SettingsRow
                  label="Reset aplikasi"
                  subtitle="Mulai lagi seperti baru dipasang"
                  detail={isResettingApp ? "Memproses…" : undefined}
                  symbol="trash"
                  destructive
                  onPress={confirmResetApp}
                />
                <SettingsRow
                  label="Sinkronkan ulang"
                  subtitle="Hapus data lokal, lalu unduh ulang materi dan gambar"
                  detail={isResetting ? "Memproses…" : undefined}
                  symbol="arrow.clockwise"
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
                <SettingsRow
                  label="Pratinjau indikator sinkron"
                  subtitle="Tampilkan contoh berikutnya: mengunduh, diperbarui, gagal, menunggu, lalu mati"
                  detail={syncPreviewTitle ?? "Mati"}
                  symbol="sparkles"
                  onPress={() => setSyncPreviewTitle(stepSyncActivityPreview())}
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
                label="Lihat tur aplikasi"
                subtitle="Kenali lagi menu dan fitur Hakgyo"
                symbol="sparkles"
                onPress={() => {
                  // Every screen shows its tour again; Hari Ini starts now.
                  void replayTours().then(() => {
                    router.back();
                    router.navigate("/(home)/(tabs)/home");
                  });
                }}
              />
              <SettingsRow
                label="Pusat bantuan"
                symbol="questionmark.circle"
                onPress={() => openWebPage("/support")}
              />
              <SettingsRow
                label="Hubungi dukungan"
                detail={supportEmail}
                symbol="envelope.fill"
                onPress={contactSupport}
              />
              <SettingsRow
                label="Kebijakan privasi"
                symbol="hand.raised.fill"
                onPress={() => openWebPage("/privacy")}
              />
              <SettingsRow
                label="Syarat dan ketentuan"
                symbol="doc.text"
                onPress={() => openWebPage("/terms")}
              />
            </SettingsSection>

            {(error ?? (isSigningOut || isResettingApp)) ? (
              <Text
                accessibilityLiveRegion="polite"
                className="text-center text-sm font-semibold text-muted-foreground"
              >
                {error ??
                  (isResettingApp ? "Mereset aplikasi…" : "Sedang keluar…")}
              </Text>
            ) : null}
          </>
        )}
      </StudyScreen>
    </>
  );
}
