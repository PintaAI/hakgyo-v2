"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { CheckCircle2Icon, LoaderCircleIcon, RotateCwIcon } from "lucide-react";

import { useAssetUrlSigner } from "~/components/asset-download-url";
import { Button } from "~/components/ui/button";
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

  useEffect(() => {
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

/** One line telling the learner whether the media is ready for a shaky connection. */
export function AssessmentMediaStatus({
  progress,
  onRetry,
}: {
  progress: MediaPreloadProgress | null;
  onRetry: () => void;
}) {
  if (!progress || progress.total === 0) return null;
  const done = progress.ready + progress.failed.length >= progress.total;
  if (!done) {
    return (
      <p
        className="text-muted-foreground flex items-center gap-2 text-sm"
        aria-live="polite"
      >
        <LoaderCircleIcon className="size-4 animate-spin" />
        Menyiapkan gambar & audio soal… {progress.ready}/{progress.total}
      </p>
    );
  }
  if (progress.failed.length) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <p className="text-destructive">
          {progress.failed.length} dari {progress.total} media belum terunduh.
          Media itu dimuat saat soalnya tampil.
        </p>
        <Button size="sm" variant="outline" onClick={onRetry}>
          <RotateCwIcon /> Coba lagi
        </Button>
      </div>
    );
  }
  return (
    <p className="text-muted-foreground flex items-center gap-2 text-sm">
      <CheckCircle2Icon className="text-primary size-4" />
      Gambar & audio soal siap, aman jika koneksi terputus.
    </p>
  );
}
