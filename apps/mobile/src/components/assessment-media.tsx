import { downloadedBytes, formatByteSize } from "@hakgyo/shared";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { useAppTheme } from "../providers/AppThemeProvider";
import { useMobileSyncActions } from "../providers/MobileSyncProvider";
import { DownloadProgressBar } from "./offline-download";
import type { AssetPrefetchProgress } from "../sync/asset-resolver";

/**
 * Downloads an assessment's images and audio to the device while `enabled`, so an attempt keeps
 * working when the connection drops.
 */
export function useAssessmentMediaPrefetch(
  assetIds: readonly string[],
  enabled = true,
) {
  const { prefetchAssessmentMedia } = useMobileSyncActions();
  const [progress, setProgress] = useState<AssetPrefetchProgress | null>(null);
  const [run, setRun] = useState(0);
  const key = [...new Set(assetIds)].join("\n");
  const prefetch = useRef(prefetchAssessmentMedia);
  prefetch.current = prefetchAssessmentMedia;

  useEffect(() => {
    if (!enabled || !key) return;
    let active = true;
    const update = (next: AssetPrefetchProgress | null) => {
      if (active && next) setProgress(next);
    };
    void prefetch.current(key.split("\n"), update).then(update);
    return () => {
      active = false;
    };
  }, [enabled, key, run]);

  return {
    progress: enabled && key ? progress : null,
    retry: () => setRun((value) => value + 1),
  };
}

/**
 * Download state of the question media: a progress bar while downloading, a retry when some
 * files failed, and a short confirmation once everything is on the device. Counts files when
 * sizes are unknown.
 */
export function AssessmentMediaStatus({
  progress,
  sizes,
  onRetry,
}: {
  progress: AssetPrefetchProgress | null;
  sizes?: ReadonlyMap<string, number>;
  onRetry: () => void;
}) {
  const { colors } = useAppTheme();
  if (!progress || progress.total === 0) return null;
  const done = progress.ready + progress.failed.length >= progress.total;
  const totalBytes = sizes
    ? [...sizes.values()].reduce((total, size) => total + size, 0)
    : 0;
  const readyBytes = sizes ? downloadedBytes(progress.readyIds, sizes) : 0;
  const fraction =
    totalBytes > 0 ? readyBytes / totalBytes : progress.ready / progress.total;
  const amount =
    totalBytes > 0
      ? `${formatByteSize(readyBytes)} / ${formatByteSize(totalBytes)}`
      : `${progress.ready}/${progress.total} file`;

  if (!done) {
    return (
      <View className="gap-1.5" accessibilityLiveRegion="polite">
        <View className="flex-row items-center justify-between gap-3">
          <View className="min-w-0 flex-1 flex-row items-center gap-2">
            <ActivityIndicator size="small" color={colors.primary} />
            <Text className="shrink text-sm text-muted-foreground">
              Menyiapkan gambar & audio soal
            </Text>
          </View>
          <Text
            numberOfLines={1}
            className="text-xs tabular-nums text-muted-foreground"
          >
            {amount}
          </Text>
        </View>
        <DownloadProgressBar fraction={fraction} />
      </View>
    );
  }
  if (progress.failed.length) {
    return (
      <View className="gap-2">
        <DownloadProgressBar fraction={fraction} />
        <View className="flex-row flex-wrap items-center gap-2">
          <Text className="flex-1 text-sm text-destructive">
            {progress.failed.length} dari {progress.total} media belum terunduh.
            Media itu dimuat saat soalnya tampil.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={onRetry}
            className="rounded-full border border-border px-3 py-1.5 active:opacity-70"
          >
            <Text className="text-sm font-semibold text-foreground">
              Coba lagi
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }
  return (
    <Text className="text-sm text-muted-foreground">
      ✓ Gambar & audio soal siap
      {totalBytes > 0 ? ` (${formatByteSize(totalBytes)})` : ""}, aman jika
      koneksi terputus.
    </Text>
  );
}

/**
 * Downloads, in the background and on Wi-Fi only, the media of events the learner can work on
 * now (open, or started), from the course bundle on the device.
 */
export function useOpenEventMediaPrefetch(
  events:
    | ReadonlyArray<{
        status?: string | null;
        course: { id: string };
        courseItem: { id: string };
        entry: { canStart?: boolean; state?: string };
      }>
    | undefined,
) {
  const { prefetchEventMedia } = useMobileSyncActions();
  const key = (events ?? [])
    .filter(
      (event) =>
        event.entry.canStart === true || event.entry.state === "IN_PROGRESS",
    )
    .map((event) => `${event.course.id}:${event.courseItem.id}`)
    .sort()
    .join(",");
  useEffect(() => {
    for (const pair of key ? key.split(",") : []) {
      const [courseId, courseItemId] = pair.split(":");
      if (courseId && courseItemId) prefetchEventMedia(courseId, courseItemId);
    }
  }, [key, prefetchEventMedia]);
}
