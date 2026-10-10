"use client";

import { useEffectEvent, useLayoutEffect, useState } from "react";
import { CheckCircle2Icon, LoaderCircleIcon, RotateCwIcon } from "lucide-react";

import { downloadedBytes, formatByteSize } from "@hakgyo/shared";

import { useAssetUrlSigner } from "~/components/asset-download-url";
import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import {
  preloadAssessmentMedia,
  type MediaPreloadProgress,
} from "~/lib/assessment-media-cache";

/**
 * Downloads an assessment's images and audio ahead (see `~/lib/assessment-media-cache`) while
 * `enabled`, so the attempt keeps working when the connection drops.
 */
export function useAssessmentMediaPreload(
  assetIds: readonly string[],
  enabled = true,
) {
  const sign = useAssetUrlSigner();
  const [progress, setProgress] = useState<MediaPreloadProgress | null>(null);
  const [run, setRun] = useState(0);
  const key = [...new Set(assetIds)].join("\n");
  const preload = useEffectEvent(
    (onProgress: (progress: MediaPreloadProgress) => void) =>
      preloadAssessmentMedia(key ? key.split("\n") : [], sign, onProgress),
  );

  // A layout effect runs before the passive effects in which media blocks look up their URLs,
  // so the downloads are registered first and those lookups wait for the local copies.
  useLayoutEffect(() => {
    if (!enabled || !key) return;
    let active = true;
    const update = (next: MediaPreloadProgress) => {
      if (active) setProgress(next);
    };
    void preload(update).then(update);
    return () => {
      active = false;
    };
  }, [enabled, key, run]);

  return {
    progress: enabled && key ? progress : null,
    retry: () => setRun((value) => value + 1),
  };
}

function statusText(progress: MediaPreloadProgress, sizes?: SizeMap) {
  const totalBytes = sizes
    ? [...sizes.values()].reduce((total, size) => total + size, 0)
    : 0;
  if (totalBytes > 0 && sizes) {
    const readyBytes = downloadedBytes(progress.readyIds, sizes);
    return {
      fraction: readyBytes / totalBytes,
      amount: `${formatByteSize(readyBytes)} / ${formatByteSize(totalBytes)}`,
      total: formatByteSize(totalBytes),
    };
  }
  return {
    fraction: progress.total ? progress.ready / progress.total : 0,
    amount: `${progress.ready}/${progress.total} file`,
    total: `${progress.total} file`,
  };
}

type SizeMap = ReadonlyMap<string, number>;

/**
 * Download state of the question media: a progress bar while downloading, a retry when some
 * files failed, and a short confirmation once everything is on the device.
 */
export function AssessmentMediaStatus({
  progress,
  sizes,
  onRetry,
}: {
  progress: MediaPreloadProgress | null;
  /** Asset sizes in bytes; without them progress counts files. */
  sizes?: SizeMap;
  onRetry: () => void;
}) {
  if (!progress || progress.total === 0) return null;
  const done = progress.ready + progress.failed.length >= progress.total;
  const text = statusText(progress, sizes);
  if (!done) {
    return (
      <Progress
        value={Math.round(text.fraction * 100)}
        aria-label="Unduhan gambar dan audio soal"
        className="gap-1.5"
      >
        <div
          className="text-muted-foreground flex w-full items-center justify-between gap-3 text-sm"
          aria-live="polite"
        >
          <span className="flex min-w-0 items-center gap-2">
            <LoaderCircleIcon className="size-4 shrink-0 animate-spin" />
            Menyiapkan gambar & audio soal
          </span>
          <span className="shrink-0 whitespace-nowrap tabular-nums">
            {text.amount}
          </span>
        </div>
      </Progress>
    );
  }
  if (progress.failed.length) {
    return (
      <div className="space-y-2">
        <Progress
          value={Math.round(text.fraction * 100)}
          aria-label="Unduhan gambar dan audio soal"
        />
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <p className="text-destructive">
            {progress.failed.length} dari {progress.total} media belum terunduh.
            Media itu dimuat saat soalnya tampil.
          </p>
          <Button size="sm" variant="outline" onClick={onRetry}>
            <RotateCwIcon /> Coba lagi
          </Button>
        </div>
      </div>
    );
  }
  return (
    <p className="text-muted-foreground flex items-center gap-2 text-sm">
      <CheckCircle2Icon className="text-primary size-4 shrink-0" />
      Gambar & audio soal siap ({text.total}), aman jika koneksi terputus.
    </p>
  );
}
