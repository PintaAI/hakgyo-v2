import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text } from "react-native";

import { useAppTheme } from "../providers/AppThemeProvider";
import { useApiAssetResolver } from "./content-renderer/use-api-asset-resolver";

function PlayableButton({
  url,
  entryId,
  speakingId,
  onSpeak,
}: {
  url: string;
  entryId: string;
  speakingId: string | null;
  onSpeak: (entryId: string | null) => void;
}) {
  const { colors } = useAppTheme();
  const player = useAudioPlayer(url);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    if (speakingId !== entryId && status.playing) player.pause();
  }, [speakingId, entryId, status.playing, player]);

  useEffect(() => {
    player.play();
    onSpeak(entryId);
    // Mounting follows the initial tap after the asset URL resolves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Pressable
      accessibilityLabel={
        status.playing ? "Pause pronunciation" : "Play pronunciation"
      }
      accessibilityRole="button"
      className="size-11 items-center justify-center rounded-full border border-border bg-background active:opacity-60"
      onPress={() => {
        if (status.playing) {
          player.pause();
          onSpeak(null);
        } else {
          if (status.didJustFinish) void player.seekTo(0);
          player.play();
          onSpeak(entryId);
        }
      }}
    >
      <SymbolView
        fallback={
          <Text className="text-xs font-black text-primary">
            {status.playing ? "Ⅱ" : "▶"}
          </Text>
        }
        name={status.playing ? "pause.fill" : "play.fill"}
        size={13}
        tintColor={colors.primary}
        weight="semibold"
      />
    </Pressable>
  );
}

export function VocabularyAudioButton({
  assetId,
  entryId,
  speakingId,
  onSpeak,
}: {
  assetId: string;
  entryId: string;
  speakingId: string | null;
  onSpeak: (entryId: string | null) => void;
}) {
  const { colors } = useAppTheme();
  const resolveAssetUrl = useApiAssetResolver();
  const [url, setUrl] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setUrl(null);
    setFailed(false);
    setResolving(false);
  }, [assetId]);

  if (failed) return null;
  if (url) {
    return (
      <PlayableButton
        entryId={entryId}
        onSpeak={onSpeak}
        speakingId={speakingId}
        url={url}
      />
    );
  }

  return (
    <Pressable
      accessibilityLabel="Play pronunciation"
      accessibilityRole="button"
      accessibilityState={{ busy: resolving }}
      className="size-11 items-center justify-center rounded-full border border-border bg-background active:opacity-60"
      disabled={resolving}
      onPress={() => {
        setResolving(true);
        void resolveAssetUrl(assetId).then(
          (resolved) => {
            setUrl(resolved);
            setResolving(false);
          },
          () => {
            setFailed(true);
            setResolving(false);
          },
        );
      }}
    >
      {resolving ? (
        <ActivityIndicator color={colors.primary} size="small" />
      ) : (
        <SymbolView
          fallback={<Text className="text-xs font-black text-primary">▶</Text>}
          name="play.fill"
          size={13}
          tintColor={colors.primary}
          weight="semibold"
        />
      )}
    </Pressable>
  );
}
