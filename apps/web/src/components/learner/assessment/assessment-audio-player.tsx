"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { HeadphonesIcon, LoaderCircleIcon, PlayIcon } from "lucide-react";
import type { AudioPolicy, AudioSource } from "@hakgyo/shared";

import { useAssetUrlLoader } from "~/components/asset-download-url";
import { StudyCard } from "~/components/learner/assessment/assessment-ui";
import { Button } from "~/components/ui/button";

// A tenth of a second of silence: playing it inside a tap unlocks the element for later
// programmatic playback (iOS Safari only allows that on an element a gesture started).
const SILENCE =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

/** The one audio element of an attempt, unlocked by the section intro tap. */
export function useAttemptAudio() {
  // Stable for the attempt: players attach listeners to it.
  const [audio] = useState(() => {
    let element: HTMLAudioElement | null = null;
    const get = () => {
      element ??= new Audio();
      return element;
    };
    return {
      get,
      /** Call inside a tap (the section start) so autoplay can work afterwards. */
      unlock: () => {
        const target = get();
        if (target.src && !target.src.startsWith("data:")) return;
        target.src = SILENCE;
        void target.play().catch(() => undefined);
      },
    };
  });
  return audio;
}

export type AttemptAudio = ReturnType<typeof useAttemptAudio>;

type Phase = "idle" | "loading" | "playing" | "gap" | "blocked" | "failed";

/**
 * A question's audio under a section policy (docs/eps-topik-simulation.md section 5.6): one play
 * is the whole playlist, there is no seek or pause, and a counter shows the plays used. A play
 * counts when playback starts (`onPlayStarted`, logged as AUDIO_PLAYED). Autoplay starts when the
 * question shows and repeats until the limit, with the section's gap between plays. Mount it with
 * a `key` per question. Mirrors the mobile player.
 */
export function AssessmentAudioPlayer({
  audio,
  sources,
  policy,
  playsUsed,
  disabled,
  onPlayStarted,
  onFinished,
}: {
  audio: AttemptAudio;
  sources: readonly AudioSource[];
  policy: AudioPolicy;
  playsUsed: number;
  disabled: boolean;
  onPlayStarted: () => void;
  /**
   * Every allowed play has ended (only with a limit), or the audio failed: a paced section then
   * starts the answer window instead of waiting.
   */
  onFinished: () => void;
}) {
  const loadAssetUrl = useAssetUrlLoader();
  const [phase, setPhase] = useState<Phase>("idle");
  const track = useRef(0);
  // The play now running (or about to) is counted once it starts.
  const counted = useRef(false);
  const gapTimer = useRef<number | null>(null);
  // Bumped by every new track and on unmount, so a load still running for an older track (or a
  // question already left) never takes over the shared element.
  const generation = useRef(0);
  const playsLeft =
    policy.maxPlays === null ? Infinity : policy.maxPlays - playsUsed;
  // Without a limit autoplay plays once; more plays are taps.
  const autoRepeats = policy.autoplay && policy.maxPlays !== null;

  const playTrack = async (index: number) => {
    const source = sources[index];
    if (!source) return;
    const run = ++generation.current;
    track.current = index;
    setPhase("loading");
    try {
      const url =
        "assetId" in source ? await loadAssetUrl(source.assetId) : source.url;
      if (run !== generation.current) return;
      if (!url) throw new Error("Audio tidak tersedia");
      const element = audio.get();
      element.src = url;
      await element.play();
      if (run !== generation.current) return;
      if (!counted.current) {
        counted.current = true;
        onPlayStarted();
      }
      setPhase("playing");
    } catch (error) {
      if (run !== generation.current) return;
      // Blocked autoplay waits for a tap; the play counts only once it starts.
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        setPhase("blocked");
      } else {
        setPhase("failed");
        onFinished();
      }
    }
  };

  const startPlay = () => {
    if (disabled || playsLeft <= 0) return;
    counted.current = false;
    void playTrack(0);
  };

  const onEnded = useEffectEvent(() => {
    if (phase !== "playing") return;
    if (track.current + 1 < sources.length) {
      void playTrack(track.current + 1);
      return;
    }
    // `playsUsed` already includes the play that just ended.
    if (playsLeft <= 0) {
      setPhase("idle");
      onFinished();
      return;
    }
    if (autoRepeats) {
      setPhase("gap");
      gapTimer.current = window.setTimeout(() => {
        gapTimer.current = null;
        startPlay();
      }, policy.repeatGapSeconds * 1000);
    } else {
      setPhase("idle");
    }
  });

  useEffect(() => {
    const element = audio.get();
    const ended = () => onEnded();
    element.addEventListener("ended", ended);
    return () => {
      generation.current += 1;
      element.removeEventListener("ended", ended);
      element.pause();
      if (gapTimer.current !== null) window.clearTimeout(gapTimer.current);
    };
  }, [audio]);

  // Autoplay when the question shows; a question whose plays are used up is finished at once
  // (after a reload), so a paced section moves on.
  const onShown = useEffectEvent(() => {
    if (playsLeft <= 0) onFinished();
    else if (policy.autoplay) startPlay();
  });
  useEffect(() => {
    // After the commit, so a remount (React strict mode) starts one play, not two.
    const timer = window.setTimeout(onShown, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const busy = phase === "loading" || phase === "playing" || phase === "gap";
  const canTap =
    !disabled &&
    playsLeft > 0 &&
    (phase === "blocked" || (!busy && (!autoRepeats || phase === "failed")));

  return (
    <StudyCard className="flex-row items-center gap-3 py-3">
      <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-full">
        {phase === "loading" ? (
          <LoaderCircleIcon className="size-5 animate-spin" />
        ) : (
          <HeadphonesIcon className="size-5" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold" aria-live="polite">
          {phase === "playing"
            ? "Audio diputar…"
            : phase === "gap"
              ? "Audio diputar lagi sebentar lagi"
              : phase === "blocked"
                ? "Ketuk Putar untuk mendengarkan"
                : phase === "failed"
                  ? "Audio gagal diputar"
                  : playsLeft <= 0
                    ? "Audio selesai"
                    : "Audio soal"}
        </p>
        <p className="text-muted-foreground text-xs">
          {policy.maxPlays === null
            ? `Diputar ${playsUsed} kali`
            : `Diputar ${Math.min(playsUsed, policy.maxPlays)} dari ${policy.maxPlays}`}
        </p>
      </div>
      {canTap ? (
        <Button
          size="sm"
          onClick={() =>
            // A blocked or broken play resumes its track; it counts once, when it starts.
            phase === "blocked" || (phase === "failed" && counted.current)
              ? void playTrack(track.current)
              : startPlay()
          }
        >
          <PlayIcon data-icon="inline-start" />
          {phase === "failed" ? "Coba lagi" : "Putar"}
        </Button>
      ) : null}
    </StudyCard>
  );
}
