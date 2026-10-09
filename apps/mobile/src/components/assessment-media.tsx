import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { useMobileSyncActions } from "../providers/MobileSyncProvider";
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

/** One line telling the learner whether the media is ready for a shaky connection. */
export function AssessmentMediaStatus({
  progress,
  onRetry,
}: {
  progress: AssetPrefetchProgress | null;
  onRetry: () => void;
}) {
  if (!progress || progress.total === 0) return null;
  const done = progress.ready + progress.failed.length >= progress.total;
  if (!done) {
    return (
      <Text
        accessibilityLiveRegion="polite"
        className="text-sm text-muted-foreground"
      >
        Menyiapkan gambar & audio soal… {progress.ready}/{progress.total}
      </Text>
    );
  }
  if (progress.failed.length) {
    return (
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
    );
  }
  return (
    <Text className="text-sm text-muted-foreground">
      ✓ Gambar & audio soal siap, aman jika koneksi terputus.
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
