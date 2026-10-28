import type { AudioPolicy, AudioSource } from "@hakgyo/shared";
import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import type { AssetUrlResolver } from "./content-renderer";
import { Action } from "./learning-ui";
import { SymbolIcon } from "./ui/symbol-icon";
import { useAppTheme } from "../providers/AppThemeProvider";

type Phase = "idle" | "loading" | "playing" | "gap" | "failed";

/**
 * A question's audio under a section policy (docs/eps-topik-simulation.md section 5.6): one play
 * is the whole playlist, there is no seek or pause, and a counter shows the plays used. A play
 * counts when playback starts (`onPlayStarted`, logged as AUDIO_PLAYED). Autoplay starts when the
 * question shows and repeats until the limit, with the section's gap between plays. Mount it with
 * a `key` per question. Mirrors the web player.
 */
export function AssessmentAudioPlayer({
  sources,
  policy,
  playsUsed,
  disabled,
  resolveAssetUrl,
  onPlayStarted,
  onFinished,
}: {
  sources: readonly AudioSource[];
  policy: AudioPolicy;
  playsUsed: number;
  disabled: boolean;
  resolveAssetUrl: AssetUrlResolver;
  onPlayStarted: () => void;
  /** Every allowed play has ended (only with a limit). */
  onFinished: () => void;
}) {
  const { colors } = useAppTheme();
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [phase, setPhase] = useState<Phase>("idle");
  const track = useRef(0);
  // The play now running (or about to) is counted once it starts.
  const counted = useRef(false);
  const gapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playsLeft =
    policy.maxPlays === null ? Infinity : policy.maxPlays - playsUsed;
  // Status effects read the latest props without restarting.
  const latest = useRef({ onPlayStarted, onFinished, playsLeft, disabled });
  latest.current = { onPlayStarted, onFinished, playsLeft, disabled };

  async function playTrack(index: number) {
    const source = sources[index];
    if (!source) return;
    track.current = index;
    setPhase("loading");
    try {
      const uri =
        "assetId" in source
          ? await resolveAssetUrl(source.assetId)
          : source.url;
      if (!uri) throw new Error("Audio tidak tersedia");
      player.replace({ uri });
      player.play();
      setPhase("playing");
    } catch {
      setPhase("failed");
    }
  }

  function startPlay() {
    if (latest.current.disabled || latest.current.playsLeft <= 0) return;
    counted.current = false;
    void playTrack(0);
  }

  // Count the play once sound actually starts.
  useEffect(() => {
    if (phase === "playing" && status.playing && !counted.current) {
      counted.current = true;
      latest.current.onPlayStarted();
    }
  }, [phase, status.playing]);

  // A track ended: the next one, another play after the gap, or done.
  useEffect(() => {
    if (phase !== "playing" || !status.didJustFinish || !counted.current) {
      return;
    }
    if (track.current + 1 < sources.length) {
      void playTrack(track.current + 1);
      return;
    }
    // `playsUsed` already includes the play that just ended.
    if (latest.current.playsLeft <= 0) {
      setPhase("idle");
      latest.current.onFinished();
    } else if (policy.autoplay) {
      setPhase("gap");
      gapTimer.current = setTimeout(() => {
        gapTimer.current = null;
        startPlay();
      }, policy.repeatGapSeconds * 1000);
    } else {
      setPhase("idle");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reacts to the end of a track only
  }, [status.didJustFinish]);

  // Autoplay when the question shows; a question whose plays are used up is finished at once
  // (after a restart), so a paced section moves on.
  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
    if (latest.current.playsLeft <= 0) latest.current.onFinished();
    else if (policy.autoplay) startPlay();
    return () => {
      if (gapTimer.current !== null) clearTimeout(gapTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per question
  }, []);

  const busy = phase === "loading" || phase === "playing" || phase === "gap";
  const canTap =
    !disabled &&
    playsLeft > 0 &&
    !busy &&
    (!policy.autoplay || phase === "failed");

  return (
    <View className="flex-row items-center gap-3 rounded-2xl border border-border bg-muted/40 p-4">
      <View className="size-10 items-center justify-center rounded-full bg-primary/10">
        {phase === "loading" ? (
          <ActivityIndicator color={colors.primary} size="small" />
        ) : (
          <SymbolIcon
            name="speaker.fill"
            size={18}
            tintColor={colors.primary}
          />
        )}
      </View>
      <View className="min-w-0 flex-1">
        <Text
          accessibilityLiveRegion="polite"
          className="text-sm font-bold text-foreground"
        >
          {phase === "playing"
            ? "Audio diputar…"
            : phase === "gap"
              ? "Audio diputar lagi sebentar lagi"
              : phase === "failed"
                ? "Audio gagal diputar"
                : playsLeft <= 0
                  ? "Audio selesai"
                  : "Audio soal"}
        </Text>
        <Text className="text-xs text-muted-foreground">
          {policy.maxPlays === null
            ? `Diputar ${playsUsed} kali`
            : `Diputar ${Math.min(playsUsed, policy.maxPlays)} dari ${policy.maxPlays}`}
        </Text>
      </View>
      {canTap ? (
        <Action
          leadingIcon="play.fill"
          align="start"
          onPress={() =>
            // A broken play resumes its track; it counts once, when it starts.
            phase === "failed" && counted.current
              ? void playTrack(track.current)
              : startPlay()
          }
          size="sm"
        >
          {phase === "failed" ? "Coba lagi" : "Putar"}
        </Action>
      ) : null}
    </View>
  );
}
