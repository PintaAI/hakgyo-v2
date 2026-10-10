import { downloadedBytes, formatByteSize } from "@hakgyo/shared";
import { SymbolView } from "expo-symbols";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { useAppTheme } from "../providers/AppThemeProvider";
import {
  useOfflineDownload,
  useOfflineMedia,
  useOfflineRevision,
} from "../providers/MobileSyncProvider";

/** A thin progress bar; `fraction` is clamped to 0..1. */
export function DownloadProgressBar({ fraction }: { fraction: number }) {
  const percent = Math.round(Math.min(1, Math.max(0, fraction)) * 100);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: percent }}
      className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
    >
      <View
        className="h-full rounded-full bg-primary"
        style={{ width: `${percent}%` }}
      />
    </View>
  );
}

function sumBytes(
  assetIds: readonly string[],
  sizes: ReadonlyMap<string, number>,
) {
  return assetIds.reduce((total, id) => total + (sizes.get(id) ?? 0), 0);
}

/**
 * What of `assetIds` is stored on the device, plus the progress of the offline download under
 * `key`. Re-checks the device whenever an offline download stores files.
 */
export function useOfflineStatus(
  key: string,
  assetIds: readonly string[],
  sizes: ReadonlyMap<string, number>,
) {
  const { onDevice, start } = useOfflineMedia();
  const download = useOfflineDownload(key);
  const revision = useOfflineRevision();
  const idsKey = [...new Set(assetIds)].join("\n");
  const [stored, setStored] = useState<{ key: string; ids: string[] } | null>(
    null,
  );

  useEffect(() => {
    if (!idsKey) return;
    let active = true;
    void onDevice(idsKey.split("\n")).then((ids) => {
      if (active) setStored({ key: idsKey, ids });
    });
    return () => {
      active = false;
    };
  }, [idsKey, onDevice, revision]);

  return useMemo(() => {
    const ids = idsKey ? idsKey.split("\n") : [];
    const storedIds = stored?.key === idsKey ? stored.ids : [];
    const totalBytes = sumBytes(ids, sizes);
    const running = Boolean(download?.running);
    const readyIds = running ? (download?.readyIds ?? []) : storedIds;
    const readyCount = running ? (download?.ready ?? 0) : storedIds.length;
    return {
      total: ids.length,
      /** Known once the device has been checked. */
      checked: stored?.key === idsKey || !idsKey,
      complete: ids.length > 0 && storedIds.length >= ids.length,
      running,
      failed: !running && (download?.failed.length ?? 0) > 0,
      fraction:
        totalBytes > 0
          ? downloadedBytes(readyIds, sizes) / totalBytes
          : ids.length
            ? readyCount / ids.length
            : 0,
      readyBytes: downloadedBytes(readyIds, sizes),
      totalBytes,
      missingBytes: totalBytes - downloadedBytes(storedIds, sizes),
      start: () => start(key, ids),
    };
  }, [download, idsKey, key, sizes, start, stored]);
}

/**
 * "Simpan offline" for a whole course: downloads the media of every chapter the learner can
 * open, with a progress bar while it runs.
 */
export function CourseOfflineCard({
  courseId,
  assetIds,
  sizes,
}: {
  courseId: string;
  assetIds: readonly string[];
  sizes: ReadonlyMap<string, number>;
}) {
  const status = useOfflineStatus(`course:${courseId}`, assetIds, sizes);
  const { colors } = useAppTheme();
  if (status.total === 0 || !status.checked) return null;

  if (status.running) {
    return (
      <View className="gap-2 rounded-xl border border-border px-4 py-3">
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-row items-center gap-2">
            <ActivityIndicator size="small" color={colors.primary} />
            <Text className="text-sm font-semibold text-foreground">
              Menyimpan untuk offline…
            </Text>
          </View>
          <Text className="text-xs tabular-nums text-muted-foreground">
            {status.totalBytes > 0
              ? `${formatByteSize(status.readyBytes)} / ${formatByteSize(status.totalBytes)}`
              : `${Math.round(status.fraction * 100)}%`}
          </Text>
        </View>
        <DownloadProgressBar fraction={status.fraction} />
      </View>
    );
  }

  if (status.complete) {
    return (
      <View className="flex-row items-center gap-2 px-1">
        <SymbolView
          name="checkmark.circle.fill"
          size={16}
          tintColor={colors.primary}
          fallback={<Text className="text-primary">✓</Text>}
        />
        <Text className="text-sm text-muted-foreground">
          Tersedia offline
          {status.totalBytes > 0
            ? ` · ${formatByteSize(status.totalBytes)}`
            : ""}
        </Text>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Mengunduh gambar, audio, dan halaman materi agar bisa dibuka tanpa internet"
      onPress={() => void status.start()}
      className="flex-row items-center gap-3 rounded-xl border border-border px-4 py-3 active:opacity-70"
    >
      <SymbolView
        name="arrow.down.circle"
        size={22}
        tintColor={colors.primary}
        fallback={<Text className="text-lg text-primary">↓</Text>}
      />
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="text-sm font-bold text-foreground">
          {status.failed ? "Lanjutkan simpan offline" : "Simpan offline"}
        </Text>
        <Text className="text-xs text-muted-foreground" numberOfLines={2}>
          {status.failed
            ? "Sebagian file gagal diunduh. Ketuk untuk mencoba lagi."
            : `Gambar, audio, dan halaman materi${
                status.missingBytes > 0
                  ? ` · ${formatByteSize(status.missingBytes)}`
                  : ""
              }. Sebaiknya pakai Wi‑Fi.`}
        </Text>
      </View>
    </Pressable>
  );
}

/** Offline state of one chapter: stored, downloading (percent) or a download button. */
export function ModuleOfflineBadge({
  moduleId,
  assetIds,
  sizes,
}: {
  moduleId: string;
  assetIds: readonly string[];
  sizes: ReadonlyMap<string, number>;
}) {
  const status = useOfflineStatus(`module:${moduleId}`, assetIds, sizes);
  const { colors } = useAppTheme();
  if (status.total === 0 || !status.checked) return null;

  if (status.running) {
    return (
      <View
        accessibilityLabel={`Menyimpan bab untuk offline, ${Math.round(status.fraction * 100)} persen`}
        className="w-14 gap-1"
      >
        <Text className="text-right text-[10px] font-bold tabular-nums text-primary">
          {Math.round(status.fraction * 100)}%
        </Text>
        <DownloadProgressBar fraction={status.fraction} />
      </View>
    );
  }

  if (status.complete) {
    return (
      <View
        accessibilityLabel="Bab tersedia offline"
        className="flex-row items-center gap-1"
      >
        <SymbolView
          name="checkmark.circle.fill"
          size={12}
          tintColor={colors.primary}
          fallback={<Text className="text-[10px] text-primary">✓</Text>}
        />
        <Text className="text-[10px] font-bold uppercase tracking-[1px] text-primary">
          Offline
        </Text>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Simpan bab untuk offline${
        status.missingBytes > 0
          ? `, ${formatByteSize(status.missingBytes)}`
          : ""
      }`}
      hitSlop={8}
      onPress={() => void status.start()}
      className="flex-row items-center gap-1 rounded-full border border-border px-2 py-0.5 active:opacity-70"
    >
      <SymbolView
        name="arrow.down.circle"
        size={12}
        tintColor={colors.mutedForeground}
        fallback={<Text className="text-[10px] text-muted-foreground">↓</Text>}
      />
      <Text className="text-[10px] font-bold text-muted-foreground">
        {status.failed
          ? "Ulangi"
          : status.missingBytes > 0
            ? formatByteSize(status.missingBytes)
            : "Simpan"}
      </Text>
    </Pressable>
  );
}
