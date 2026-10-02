"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircleIcon, PauseIcon, PlayIcon } from "lucide-react";

import { loadAssetDownloadUrl } from "~/components/asset-download-url";
import { api } from "~/trpc/react";

// One pronunciation at a time across the page.
let activeAudio: HTMLAudioElement | null = null;

export function VocabularyAudioButton({ assetId }: { assetId: string }) {
  const utils = api.useUtils();
  const audio = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "playing">("idle");
  const [failed, setFailed] = useState(false);

  useEffect(
    () => () => {
      audio.current?.pause();
      if (activeAudio === audio.current) activeAudio = null;
    },
    [],
  );

  if (failed) return null;

  async function toggle() {
    if (state === "playing") {
      audio.current?.pause();
      return;
    }
    try {
      if (!audio.current) {
        setState("loading");
        const url = await loadAssetDownloadUrl(utils.client, assetId);
        const element = new Audio(url);
        element.addEventListener("play", () => setState("playing"));
        element.addEventListener("pause", () => setState("idle"));
        element.addEventListener("ended", () => setState("idle"));
        audio.current = element;
      }
      if (activeAudio && activeAudio !== audio.current) activeAudio.pause();
      activeAudio = audio.current;
      audio.current.currentTime = 0;
      await audio.current.play();
    } catch {
      setFailed(true);
    }
  }

  return (
    <button
      type="button"
      aria-label={state === "playing" ? "Jeda pelafalan" : "Putar pelafalan"}
      aria-busy={state === "loading"}
      disabled={state === "loading"}
      onClick={() => void toggle()}
      className="border-border bg-background text-primary hover:bg-muted flex size-11 shrink-0 items-center justify-center rounded-full border transition-colors"
    >
      {state === "loading" ? (
        <LoaderCircleIcon className="size-4 animate-spin" />
      ) : state === "playing" ? (
        <PauseIcon className="size-4 fill-current" />
      ) : (
        <PlayIcon className="size-4 fill-current" />
      )}
    </button>
  );
}
