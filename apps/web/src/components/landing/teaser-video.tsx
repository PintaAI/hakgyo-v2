"use client";

import { useState } from "react";
import Image from "next/image";
import { PlayIcon } from "lucide-react";

import { cn } from "~/lib/utils";

const teaser = {
  src: "https://pub-3fd0ad0a99684361b69ca3270ed168c8.r2.dev/marketing/hakgyo-teaser-v2.mp4",
  poster:
    "https://pub-3fd0ad0a99684361b69ca3270ed168c8.r2.dev/marketing/hakgyo-teaser-v2.jpg",
  durationLabel: "0:52",
};

/**
 * The product teaser in the hero. Only the poster loads with the page; the
 * video loads and plays with sound once the visitor presses play.
 */
export function TeaserVideo({ className }: { className?: string }) {
  const [playing, setPlaying] = useState(false);

  return (
    <div
      className={cn(
        "border-border bg-muted relative aspect-video overflow-hidden rounded-2xl border shadow-sm max-sm:-mx-5 max-sm:rounded-none max-sm:border-x-0",
        className,
      )}
    >
      {playing ? (
        <video
          src={teaser.src}
          poster={teaser.poster}
          autoPlay
          controls
          playsInline
          className="size-full bg-black object-contain"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="group absolute inset-0 size-full cursor-pointer"
          aria-label={`Putar video Hakgyo (${teaser.durationLabel})`}
        >
          <Image
            src={teaser.poster}
            alt=""
            fill
            sizes="(min-width: 64rem) 32rem, 100vw"
            className="object-cover"
          />
          <span className="absolute inset-0 bg-black/10 transition-colors group-hover:bg-black/20" />
          <span className="bg-background/95 text-foreground absolute bottom-4 left-4 flex items-center gap-3 rounded-full py-2 pr-5 pl-2 text-sm font-medium shadow-lg transition-transform group-hover:scale-[1.03] sm:bottom-5 sm:left-5">
            <span className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-full">
              <PlayIcon className="size-4 translate-x-px fill-current" />
            </span>
            Tonton video
            <span className="text-muted-foreground font-normal">
              {teaser.durationLabel}
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
