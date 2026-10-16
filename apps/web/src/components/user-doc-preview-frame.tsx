"use client";

import { useEffect, useRef, useState } from "react";
import { MousePointerClickIcon, RotateCcwIcon } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import {
  docPreviewHref,
  docPreviewMessageType,
  isDocPreviewName,
} from "~/components/user-doc-previews/names";

const desktopWidth = 1100;
/** Phone layouts render at the real column width within this range. */
const phoneWidth = { min: 360, max: 430 } as const;
/** Below this frame width the phone layout reads better than a tiny desktop. */
const phoneBreakpoint = 560;
const defaultHeight = 560;

/**
 * An interactive, scaled-down copy of a real Hakgyo screen with example data.
 * The screen renders in an iframe at its design width, so phone and desktop
 * layouts match the app, and is scaled to fit the guide's column.
 */
export function UserDocPreviewFrame({
  name,
  caption,
  device,
  maxHeight,
}: {
  name: string;
  caption?: string;
  device: "desktop" | "mobile" | "both";
  maxHeight?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const [contentHeight, setContentHeight] = useState(defaultHeight);
  const [loaded, setLoaded] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setContainerWidth(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.source !== iframeRef.current?.contentWindow) return;
      const data = event.data as { type?: string; height?: number } | null;
      if (data?.type !== docPreviewMessageType || !data.height) return;
      setContentHeight(data.height);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  if (!isDocPreviewName(name)) {
    return (
      <p className="text-destructive my-6 text-sm">
        Pratinjau &quot;{name}&quot; tidak ditemukan.
      </p>
    );
  }

  const layout =
    device === "both"
      ? containerWidth !== null && containerWidth < phoneBreakpoint
        ? "mobile"
        : "desktop"
      : device;
  // A phone layout fills a phone's column at 100% and sits centered at phone
  // width in a wider column, instead of stretching the frame around it.
  const width =
    layout === "mobile"
      ? Math.min(
          Math.max(containerWidth ?? phoneWidth.max, phoneWidth.min),
          phoneWidth.max,
        )
      : desktopWidth;
  const scale = containerWidth ? Math.min(1, containerWidth / width) : 1;
  const height = Math.min(contentHeight, maxHeight ?? 900);
  const label = caption ?? "Pratinjau tampilan Hakgyo";

  return (
    // On phones the frame runs edge to edge like the intro video: -mx-4
    // cancels the docs layout's px-4.
    <figure className="my-8 max-sm:-mx-4">
      <div className="mb-2 flex items-center justify-between gap-3 max-sm:px-4">
        <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <MousePointerClickIcon className="size-3.5" />
          Bisa dicoba · data contoh, tidak tersimpan
        </span>
        <Button
          variant="ghost"
          size="xs"
          onClick={() => {
            setLoaded(false);
            setVersion((value) => value + 1);
          }}
        >
          <RotateCcwIcon />
          Ulangi
        </Button>
      </div>
      <div ref={containerRef}>
        <div
          className="bg-background relative mx-auto overflow-hidden rounded-xl border shadow-xs max-sm:rounded-none max-sm:border-x-0 max-sm:shadow-none"
          style={{
            maxWidth: width,
            height: containerWidth ? height * scale : height,
          }}
        >
          {containerWidth ? (
            <iframe
              key={`${layout}-${version}`}
              ref={iframeRef}
              src={docPreviewHref(name, layout)}
              title={label}
              loading="lazy"
              onLoad={() => setLoaded(true)}
              className="absolute top-0 left-0 origin-top-left border-0"
              style={{
                width,
                height,
                transform: `scale(${scale})`,
              }}
            />
          ) : null}
          {loaded ? null : (
            <Skeleton className="absolute inset-0 rounded-none" />
          )}
        </div>
      </div>
      {caption ? (
        <figcaption className="text-muted-foreground mt-2 text-sm max-sm:px-4 max-sm:text-xs">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
