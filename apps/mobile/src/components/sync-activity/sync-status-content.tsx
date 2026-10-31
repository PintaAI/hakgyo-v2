import { useContext, useEffect, useState } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";

import { useAppTheme } from "../../providers/AppThemeProvider";
import { useMobileSync } from "../../providers/MobileSyncProvider";
import { WAITING_DETAIL } from "../../sync/activity";
import { SyncDataContext } from "../../sync/hooks";
import type { BundleChange, BundleSyncProgress } from "../../sync/types";
import { useIndexedCourseTitles } from "../../sync/use-sync-activity";
import { withOpacity } from "../../theme/colors";
import { Action, SectionHeader } from "../learning-ui";
import { SettingsSection } from "../settings-ui";
import { SymbolIcon } from "../ui/symbol-icon";
import type { SymbolName } from "../ui/symbol-names";

type Tone = "default" | "primary" | "destructive";

/** Clock time on this device, such as "10.42". */
function clockTime(at: number) {
  return new Date(at).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function courseStatus(
  courseId: string,
  bundles: BundleSyncProgress | null,
  change: BundleChange | undefined,
  stored: boolean,
): { label: string; tone: Tone } {
  if (bundles?.changingCourseIds.includes(courseId)) {
    return bundles.activeCourseIds.includes(courseId)
      ? { label: "Mengunduh…", tone: "primary" }
      : { label: "Menunggu giliran", tone: "default" };
  }
  if (change?.kind === "failed") {
    return { label: "Gagal, dicoba lagi", tone: "destructive" };
  }
  if (change?.kind === "added") {
    return { label: `Diunduh ${clockTime(change.at)}`, tone: "primary" };
  }
  if (change?.kind === "updated") {
    return { label: `Diperbarui ${clockTime(change.at)}`, tone: "primary" };
  }
  return stored
    ? { label: "Siap offline", tone: "default" }
    : { label: "Belum diunduh", tone: "default" };
}

function StatusRow({
  label,
  subtitle,
  status,
  tone = "default",
  symbol,
}: {
  label: string;
  subtitle?: string;
  status?: string;
  tone?: Tone;
  symbol: SymbolName;
}) {
  const { colorScheme, colors } = useAppTheme();
  const toneColor =
    tone === "destructive"
      ? colors.destructive
      : tone === "primary"
        ? colors.primary
        : colors.mutedForeground;
  return (
    <View
      className="min-h-14 flex-row items-center gap-3 px-4 py-3"
      style={{
        backgroundColor: withOpacity(
          colors.mutedForeground,
          colorScheme === "dark" ? 0.18 : 0.1,
        ),
      }}
    >
      <View className="w-5 items-center">
        <SymbolIcon name={symbol} size={20} tintColor={toneColor} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="font-semibold text-foreground" numberOfLines={2}>
          {label}
        </Text>
        {subtitle ? (
          <Text className="text-sm text-muted-foreground">{subtitle}</Text>
        ) : null}
      </View>
      {status ? (
        <Text
          className="max-w-[45%] text-right text-sm font-semibold"
          style={{ color: toneColor }}
          numberOfLines={1}
        >
          {status}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * What is on this device and what sync is doing: progress waiting to be
 * sent, and each course of the active organization (downloading, just added
 * or updated, failed, ready offline or not downloaded yet).
 */
export function SyncStatusContent({ onClose }: { onClose: () => void }) {
  const { colors } = useAppTheme();
  const localData = useContext(SyncDataContext)?.localData ?? null;
  const {
    isSyncing,
    pendingCount,
    deadLetterCount,
    outboxWaiting,
    bundles,
    bundleChanges,
    lastRefreshedAt,
    syncNow,
  } = useMobileSync();
  const { activeOrganizationId } = useAppTheme();
  const courseTitles = useIndexedCourseTitles();
  const [stored, setStored] = useState<ReadonlySet<string>>(new Set());
  const changing = bundles?.changingCourseIds.length ?? 0;

  useEffect(() => {
    let active = true;
    void localData
      ?.listBundleRevisions()
      .then((revisions) => {
        if (active) {
          setStored(new Set(revisions.map((bundle) => bundle.courseId)));
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [localData, changing, bundleChanges]);

  const courses = Object.entries(courseTitles).sort(([, left], [, right]) =>
    left.localeCompare(right, "id"),
  );

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="flex-grow gap-6 px-5 pb-8 pt-4"
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      {Platform.OS !== "ios" ? (
        <SectionHeader
          title="Status sinkron"
          trailing={
            <Pressable
              accessibilityLabel="Tutup status sinkron"
              accessibilityRole="button"
              className="rounded-full px-3 py-2 active:opacity-60"
              onPress={onClose}
            >
              <SymbolIcon name="xmark" size={20} tintColor={colors.primary} />
            </Pressable>
          }
        />
      ) : null}

      <SettingsSection title="Progres kamu">
        {pendingCount > 0 ? (
          <StatusRow
            symbol={isSyncing ? "arrow.triangle.2.circlepath" : "icloud.slash"}
            label={`${pendingCount} progres belum terkirim`}
            subtitle={
              isSyncing
                ? "Sedang dikirim…"
                : outboxWaiting
                  ? WAITING_DETAIL[outboxWaiting]
                  : "Tersimpan di HP dan segera dikirim."
            }
          />
        ) : (
          <StatusRow
            symbol="checkmark.circle.fill"
            tone="primary"
            label="Semua progres sudah terkirim"
          />
        )}
        {deadLetterCount > 0 ? (
          <StatusRow
            symbol="exclamationmark.triangle.fill"
            tone="destructive"
            label={`${deadLetterCount} perubahan ditolak server`}
            subtitle="Disimpan di HP ini. Hubungi pengajar kalau ada progres yang hilang."
          />
        ) : null}
      </SettingsSection>

      {courses.length ? (
        <SettingsSection title="Kursus di HP ini">
          {courses.map(([courseId, title]) => {
            const status = courseStatus(
              courseId,
              bundles,
              bundleChanges[courseId],
              stored.has(courseId),
            );
            return (
              <StatusRow
                key={courseId}
                symbol={
                  status.tone === "destructive"
                    ? "exclamationmark.triangle.fill"
                    : "book.closed.fill"
                }
                label={title}
                status={status.label}
                tone={status.tone}
              />
            );
          })}
        </SettingsSection>
      ) : null}

      <View className="gap-2">
        <Action
          loading={isSyncing}
          onPress={() =>
            // The status context already reports a failed sync.
            void syncNow(activeOrganizationId ?? undefined).catch(
              () => undefined,
            )
          }
        >
          Sinkronkan sekarang
        </Action>
        <Text className="text-center text-xs text-muted-foreground">
          {lastRefreshedAt
            ? `Terakhir dicek pukul ${clockTime(lastRefreshedAt)}.`
            : "Belum dicek sejak aplikasi dibuka."}{" "}
          Materi yang sudah diunduh tetap bisa dibuka tanpa internet.
        </Text>
      </View>
    </ScrollView>
  );
}
