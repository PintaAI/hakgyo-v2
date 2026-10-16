"use client";

import { useState } from "react";
import Image from "next/image";
import { PlayIcon, XIcon } from "lucide-react";

import { buttonVariants } from "~/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { cn } from "~/lib/utils";

const media = "https://pub-3fd0ad0a99684361b69ca3270ed168c8.r2.dev/marketing";
const teaser = {
  src: `${media}/hakgyo-teaser-v2.mp4`,
  /** The 9:16 cut, for phones in portrait. */
  verticalSrc: `${media}/hakgyo-teaser-v2-vertical.mp4`,
  poster: `${media}/hakgyo-teaser-v2.jpg`,
  durationLabel: "0:52",
};

/**
 * The product teaser beside the hero text on large screens. Only the poster
 * loads with the page; the video loads and plays with sound once the visitor
 * presses play.
 */
export function TeaserVideo({ className }: { className?: string }) {
  const [playing, setPlaying] = useState(false);

  return (
    <div
      className={cn(
        "border-border bg-muted relative aspect-video overflow-hidden rounded-2xl border shadow-sm",
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
            sizes="32rem"
            className="object-cover"
          />
          <span className="absolute inset-0 bg-black/10 transition-colors group-hover:bg-black/20" />
          <span className="bg-background/95 text-foreground absolute bottom-5 left-5 flex items-center gap-3 rounded-full py-2 pr-5 pl-2 text-sm font-medium shadow-lg transition-transform group-hover:scale-[1.03]">
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

/**
 * The teaser as a hero button on smaller screens, where an inline video would
 * push the hero past one screen. It opens the video full screen; phones in
 * portrait get the vertical cut.
 */
export function TeaserVideoButton({ className }: { className?: string }) {
  return (
    <Dialog>
      <DialogTrigger
        className={cn(
          buttonVariants({ variant: "outline" }),
          "gap-2.5 pr-5 pl-2",
          className,
        )}
      >
        <span className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-full sm:size-8">
          <PlayIcon className="size-3.5 translate-x-px fill-current" />
        </span>
        Tonton video
        <span className="text-muted-foreground font-normal max-sm:hidden">
          {teaser.durationLabel}
        </span>
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="h-dvh max-w-none gap-0 rounded-none bg-black p-0 ring-0 sm:h-auto sm:max-w-[min(64rem,calc(100%-4rem))] sm:overflow-hidden sm:rounded-2xl"
      >
        <DialogTitle className="sr-only">Video Hakgyo</DialogTitle>
        <video
          autoPlay
          controls
          playsInline
          className="size-full object-contain sm:aspect-video"
        >
          <source
            src={teaser.verticalSrc}
            type="video/mp4"
            media="(max-width: 639px) and (orientation: portrait)"
          />
          <source src={teaser.src} type="video/mp4" />
        </video>
        <DialogClose
          className="absolute top-[max(0.75rem,env(safe-area-inset-top))] right-3 flex size-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-colors hover:bg-black/80"
          aria-label="Tutup video"
        >
          <XIcon className="size-5" />
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
