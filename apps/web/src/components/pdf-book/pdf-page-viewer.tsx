"use client";

import { useState, type KeyboardEvent } from "react";
import { formatPdfPageLabel, type PdfBookPageResource } from "@hakgyo/shared";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  LoaderCircleIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "lucide-react";

import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "~/components/ui/dialog";

import { usePageImageUrl } from "./use-page-image-url";

const zoomLevels = [1, 1.5, 2, 3] as const;

export function PdfPageViewer({
  bookTitle,
  pageOffset,
  pages,
  index,
  onIndexChange,
  onClose,
}: {
  bookTitle: string;
  pageOffset: number;
  pages: PdfBookPageResource[];
  index: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const [zoom, setZoom] = useState(0);
  const page = index === null ? null : pages[index];
  const image = usePageImageUrl(page?.assetId ?? "", Boolean(page));
  // Warm the next page so paging feels instant.
  usePageImageUrl(
    index === null ? "" : (pages[index + 1]?.assetId ?? ""),
    index !== null,
  );

  const label = page ? formatPdfPageLabel(page.pageNumber, pageOffset) : "";

  // Bound on the dialog: the BlockNote editor swallows window-level keys.
  function onKeyDown(event: KeyboardEvent) {
    if (index === null) return;
    if (event.key === "ArrowRight" && index < pages.length - 1) {
      event.preventDefault();
      onIndexChange(index + 1);
    } else if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      onIndexChange(index - 1);
    }
  }

  return (
    <Dialog
      open={page !== null && page !== undefined}
      onOpenChange={(open) => {
        if (!open) {
          setZoom(0);
          onClose();
        }
      }}
    >
      <DialogContent
        onKeyDown={onKeyDown}
        className="flex h-[calc(100svh-1rem)] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[calc(100vw-2rem)]"
      >
        <div className="flex items-center justify-between gap-3 border-b px-4 py-2.5 pr-12">
          <div className="min-w-0">
            <DialogTitle className="truncate text-sm font-medium">
              {bookTitle}
            </DialogTitle>
            <p className="text-muted-foreground text-xs" aria-live="polite">
              Hal. {label} · {(index ?? 0) + 1} dari {pages.length}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              aria-label="Perkecil"
              size="icon-sm"
              variant="ghost"
              disabled={zoom === 0}
              onClick={() => setZoom((value) => Math.max(0, value - 1))}
            >
              <ZoomOutIcon />
            </Button>
            <span className="text-muted-foreground w-12 text-center text-xs tabular-nums">
              {Math.round(zoomLevels[zoom]! * 100)}%
            </span>
            <Button
              aria-label="Perbesar"
              size="icon-sm"
              variant="ghost"
              disabled={zoom === zoomLevels.length - 1}
              onClick={() =>
                setZoom((value) => Math.min(zoomLevels.length - 1, value + 1))
              }
            >
              <ZoomInIcon />
            </Button>
          </div>
        </div>
        <div className="bg-muted/40 relative min-h-0 flex-1 overflow-auto">
          {page ? (
            <div
              className="mx-auto p-4"
              style={{
                width: `${zoomLevels[zoom]! * 100}%`,
                maxWidth:
                  zoom === 0
                    ? `min(100%, calc((100svh - 9rem) * ${page.width / page.height}))`
                    : undefined,
              }}
            >
              <div
                className="relative w-full overflow-hidden rounded-md bg-white shadow-sm"
                style={{ aspectRatio: `${page.width} / ${page.height}` }}
              >
                {image.url ? (
                  // Signed storage URLs change per request, so next/image caching doesn't apply.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt={`Halaman ${label} dari ${bookTitle}`}
                    className="size-full object-contain"
                    src={image.url}
                  />
                ) : (
                  <div className="text-muted-foreground absolute inset-0 flex items-center justify-center gap-2 text-sm">
                    {image.failed ? (
                      "Halaman gagal dimuat."
                    ) : (
                      <>
                        <LoaderCircleIcon className="size-4 animate-spin" />
                        Memuat halaman
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
        <div className="flex items-center justify-between gap-3 border-t px-4 py-2.5">
          <Button
            variant="outline"
            disabled={!index}
            onClick={() => index && onIndexChange(index - 1)}
          >
            <ChevronLeftIcon data-icon="inline-start" />
            Sebelumnya
          </Button>
          <Button
            variant="outline"
            disabled={index === null || index >= pages.length - 1}
            onClick={() => index !== null && onIndexChange(index + 1)}
          >
            Berikutnya
            <ChevronRightIcon data-icon="inline-end" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
