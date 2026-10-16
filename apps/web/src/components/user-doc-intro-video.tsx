import { PlayIcon } from "lucide-react";

import type { UserDocVideo } from "~/lib/user-doc-videos";

export function UserDocIntroVideo({
  title,
  video,
}: {
  title: string;
  video: UserDocVideo | null;
}) {
  if (video) {
    return (
      <figure className="mb-8">
        <video
          controls
          playsInline
          preload="none"
          poster={video.poster}
          className="bg-muted aspect-video w-full rounded-xl border"
        >
          <source src={video.src} type="video/mp4" />
        </video>
        <figcaption className="text-muted-foreground mt-2 text-sm">
          Video pengantar: {title}
          {video.durationLabel ? ` (${video.durationLabel})` : null}
        </figcaption>
      </figure>
    );
  }

  return (
    <div
      role="img"
      aria-label={`Video pengantar ${title} segera hadir`}
      className="bg-muted/60 text-muted-foreground mb-8 flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 text-center"
    >
      <span className="bg-background text-foreground flex size-12 items-center justify-center rounded-full border shadow-xs">
        <PlayIcon className="size-5 translate-x-px" />
      </span>
      <span className="text-sm font-medium">Video pengantar segera hadir</span>
      <span className="max-w-sm text-xs leading-5">
        Sambil menunggu, ikuti langkah tertulis di bawah ini.
      </span>
    </div>
  );
}
