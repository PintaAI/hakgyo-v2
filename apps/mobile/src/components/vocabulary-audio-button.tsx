import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text } from "react-native";

import { useAppTheme } from "../providers/AppThemeProvider";
import { useApiAssetResolver } from "./content-renderer/use-api-asset-resolver";
import { SymbolIcon } from "./ui/symbol-icon";

type AudioButtonSize = "default" | "large";

/**
 * `large` is a filled primary circle, the main control of a screen (the
 * word sheet); `default` an outlined one beside a list row.
 */
const buttonLooks = {
  default: {
    className:
      "size-11 items-center justify-center rounded-full border border-border bg-background active:opacity-60",
    icon: 13,
    filled: false,
  },
  large: {
    className:
      "size-14 items-center justify-center rounded-full bg-primary active:opacity-80",
    icon: 20,
    filled: true,
  },
} as const;

function PlayableButton({
  url,
  entryId,
  speakingId,
  onSpeak,
  size,
}: {
  url: string;
  entryId: string;
  speakingId: string | null;
  onSpeak: (entryId: string | null) => void;
  size: AudioButtonSize;
}) {
  const { colors } = useAppTheme();
  const look = buttonLooks[size];
  const iconColor = look.filled ? colors.primaryForeground : colors.primary;
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
      accessibilityLabel={status.playing ? "Jeda pelafalan" : "Putar pelafalan"}
      accessibilityRole="button"
      className={look.className}
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
      <SymbolIcon
        name={status.playing ? "pause.fill" : "play.fill"}
        size={look.icon}
        tintColor={iconColor}
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
  size = "default",
}: {
  assetId: string;
  entryId: string;
  speakingId: string | null;
  onSpeak: (entryId: string | null) => void;
  size?: AudioButtonSize;
}) {
  const { colors } = useAppTheme();
  const look = buttonLooks[size];
  const iconColor = look.filled ? colors.primaryForeground : colors.primary;
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
        size={size}
      />
    );
  }

  return (
    <Pressable
      accessibilityLabel="Putar pelafalan"
      accessibilityRole="button"
      accessibilityState={{ busy: resolving }}
      className={look.className}
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
        <ActivityIndicator color={iconColor} size="small" />
      ) : (
        <SymbolIcon
          name="play.fill"
          size={look.icon}
          tintColor={iconColor}
          weight="semibold"
        />
      )}
    </Pressable>
  );
}
