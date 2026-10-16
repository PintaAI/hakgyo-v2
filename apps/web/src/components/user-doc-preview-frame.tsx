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

const designWidth = { desktop: 1100, mobile: 390 } as const;
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
  const width = designWidth[layout];
  const scale = containerWidth ? Math.min(1, containerWidth / width) : 1;
  const height = Math.min(contentHeight, maxHeight ?? 900);
  const label = caption ?? "Pratinjau tampilan Hakgyo";

  return (
    <figure className="my-8">
      <div className="mb-2 flex items-center justify-between gap-3">
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
      <div
        ref={containerRef}
        className="bg-background relative overflow-hidden rounded-xl border shadow-xs"
        style={{ height: containerWidth ? height * scale : height }}
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
        {loaded ? null : <Skeleton className="absolute inset-0 rounded-none" />}
      </div>
      {caption ? (
        <figcaption className="text-muted-foreground mt-2 text-sm">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
