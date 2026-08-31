import { useEffect, useState } from "react";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { ActivityIndicator, Image, Pressable, Text, View } from "react-native";

import { useContentRenderer } from "./context";

const assetUrlPrefix = "hakgyo-asset:";

type ResolvedSource =
  | { status: "empty" | "loading" | "error"; url: null }
  | { status: "ready"; url: string };

function useResolvedSource(source?: string): ResolvedSource {
  const { resolveAssetUrl } = useContentRenderer();
  const [resolved, setResolved] = useState<ResolvedSource>(() => {
    if (!source) return { status: "empty", url: null };
    if (!source.startsWith(assetUrlPrefix)) {
      return { status: "ready", url: source };
    }
    return { status: "loading", url: null };
  });

  useEffect(() => {
    let active = true;
    if (!source) {
      setResolved({ status: "empty", url: null });
      return () => {
        active = false;
      };
    }
    if (!source.startsWith(assetUrlPrefix)) {
      setResolved({ status: "ready", url: source });
      return () => {
        active = false;
      };
    }
    if (!resolveAssetUrl) {
      setResolved({ status: "error", url: null });
      return () => {
        active = false;
      };
    }

    setResolved({ status: "loading", url: null });
    void resolveAssetUrl(source.slice(assetUrlPrefix.length))
      .then((url) => {
        if (!active) return;
        setResolved(
          url ? { status: "ready", url } : { status: "error", url: null },
        );
      })
      .catch(() => {
        if (active) setResolved({ status: "error", url: null });
      });

    return () => {
      active = false;
    };
  }, [resolveAssetUrl, source]);

  return resolved;
}

export function assetSource(assetId: string) {
  return assetId ? `${assetUrlPrefix}${assetId}` : "";
}

export function ContentImage({
  accessibilityLabel,
  caption,
  source,
}: {
  accessibilityLabel: string;
  caption?: string;
  source?: string;
}) {
  const resolved = useResolvedSource(source);

  return (
    <View className="gap-2">
      <View className="aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted">
        {resolved.status === "ready" ? (
          <Image
            accessibilityIgnoresInvertColors
            accessibilityLabel={accessibilityLabel}
            className="h-full w-full"
            resizeMode="cover"
            source={{ uri: resolved.url }}
          />
        ) : resolved.status === "loading" ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator />
          </View>
        ) : (
          <View className="flex-1 items-center justify-center px-5">
            <Text className="text-center text-sm text-muted-foreground">
              Image unavailable
            </Text>
          </View>
        )}
      </View>
      {caption ? (
        <Text className="text-center text-xs leading-5 text-muted-foreground">
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

function formatTime(seconds: number) {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  return `${minutes}:${Math.floor(safeSeconds % 60)
    .toString()
    .padStart(2, "0")}`;
}

function AudioPlayer({
  caption,
  fileName,
  url,
}: {
  caption?: string;
  fileName?: string;
  url: string;
}) {
  const player = useAudioPlayer(url, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const progress = status.duration
    ? Math.min(100, (status.currentTime / status.duration) * 100)
    : 0;

  return (
    <View className="gap-3 rounded-xl border border-border bg-muted/40 p-4">
      <View className="flex-row items-center gap-3">
        <Pressable
          accessibilityLabel={status.playing ? "Pause audio" : "Play audio"}
          accessibilityRole="button"
          className="size-11 items-center justify-center rounded-full bg-primary"
          disabled={!status.isLoaded && !status.isBuffering}
          onPress={() => {
            if (status.playing) {
              player.pause();
            } else {
              if (status.didJustFinish) void player.seekTo(0);
              player.play();
            }
          }}
        >
          <Text className="text-base font-black text-primary-foreground">
            {status.isBuffering ? "…" : status.playing ? "Ⅱ" : "▶"}
          </Text>
        </Pressable>
        <View className="min-w-0 flex-1 gap-1.5">
          <Text className="font-bold text-foreground" numberOfLines={1}>
            {fileName || "Audio"}
          </Text>
          <View className="h-1.5 overflow-hidden rounded-full bg-border">
            <View
              className="h-full rounded-full bg-primary"
              style={{ width: `${progress}%` }}
            />
          </View>
          <Text className="text-xs tabular-nums text-muted-foreground">
            {formatTime(status.currentTime)} / {formatTime(status.duration)}
          </Text>
        </View>
      </View>
      {caption ? (
        <Text className="text-sm leading-5 text-muted-foreground">
          {caption}
        </Text>
      ) : null}
      {status.error ? (
        <Text className="text-xs text-destructive">Audio unavailable</Text>
      ) : null}
    </View>
  );
}

export function ContentAudio({
  caption,
  fileName,
  source,
}: {
  caption?: string;
  fileName?: string;
  source?: string;
}) {
  const resolved = useResolvedSource(source);

  if (resolved.status === "loading") {
    return (
      <View className="min-h-24 items-center justify-center rounded-xl bg-muted/40">
        <ActivityIndicator />
      </View>
    );
  }
  if (resolved.status !== "ready") {
    return (
      <View className="rounded-xl border border-dashed border-border p-5">
        <Text className="text-center text-sm text-muted-foreground">
          Audio unavailable
        </Text>
      </View>
    );
  }

  return (
    <AudioPlayer
      caption={caption}
      fileName={fileName}
      key={resolved.url}
      url={resolved.url}
    />
  );
}

export function ContentFile({
  fileName,
  source,
}: {
  fileName?: string;
  source?: string;
}) {
  const resolved = useResolvedSource(source);
  const { onOpenUrl } = useContentRenderer();

  return (
    <Pressable
      accessibilityRole="link"
      className="flex-row items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 p-4"
      disabled={resolved.status !== "ready"}
      onPress={() => {
        if (resolved.status === "ready") void onOpenUrl(resolved.url);
      }}
    >
      <View className="min-w-0 flex-1">
        <Text className="font-bold text-foreground" numberOfLines={2}>
          {fileName || "Open file"}
        </Text>
        <Text className="mt-1 text-xs text-muted-foreground">
          {resolved.status === "loading" ? "Preparing…" : "Tap to open"}
        </Text>
      </View>
      <Text className="text-lg text-muted-foreground">↗</Text>
    </Pressable>
  );
}
