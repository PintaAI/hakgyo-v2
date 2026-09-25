"use client";

import { useState, type MouseEvent } from "react";
import { formatPdfPageLabel } from "@hakgyo/shared";

import { cn } from "~/lib/utils";

export type PdfGridPage = {
  pageNumber: number;
  width: number;
  height: number;
  thumbnailUrl: string;
};

export type PdfPageSelection = { startPage: number; endPage: number };

export type PdfPageMark = { label: string; color: string };

// Fixed, clearly distinct hues: organization themes may set chart colors to
// near-identical shades, which would make chapters indistinguishable.
export const pdfMarkColors = [
  "#2563eb",
  "#16a34a",
  "#d97706",
  "#db2777",
  "#7c3aed",
  "#0891b2",
] as const;

/** True while the author has picked a first page and should pick the last. */
export function isWaitingForEndPage(
  selection: PdfPageSelection | null,
  anchor: number | null,
) {
  return (
    anchor !== null &&
    selection?.startPage === anchor &&
    selection.endPage === anchor
  );
}

/**
 * Thumbnail grid with two-click selection that works on touch screens:
 * the first click picks the first page, the next click the last page.
 * Shift-click still extends a range for people used to file managers.
 */
export function PdfPageGrid({
  pageCount,
  pages,
  pageOffset,
  selection,
  marks,
  onSelect,
  onAnchorChange,
}: {
  onAnchorChange?: (anchor: number | null) => void;
  pageCount: number;
  pages: PdfGridPage[];
  pageOffset: number;
  selection: PdfPageSelection | null;
  marks?: ReadonlyMap<number, PdfPageMark>;
  onSelect: (selection: PdfPageSelection) => void;
}) {
  const [anchor, setAnchorState] = useState<number | null>(null);
  const setAnchor = (value: number | null) => {
    setAnchorState(value);
    onAnchorChange?.(value);
  };
  const waiting = isWaitingForEndPage(selection, anchor);
  const byNumber = new Map(pages.map((page) => [page.pageNumber, page]));
  const fallbackRatio = pages[0] ? pages[0].width / pages[0].height : 0.707;

  function choose(pageNumber: number, event: MouseEvent) {
    if (anchor !== null && (waiting || event.shiftKey)) {
      onSelect({
        startPage: Math.min(anchor, pageNumber),
        endPage: Math.max(anchor, pageNumber),
      });
      if (!event.shiftKey) setAnchor(null);
      return;
    }
    setAnchor(pageNumber);
    onSelect({ startPage: pageNumber, endPage: pageNumber });
  }

  return (
    <ol
      aria-label="Halaman PDF"
      className="grid grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] gap-3"
    >
      {Array.from({ length: pageCount }, (_, index) => {
        const pageNumber = index + 1;
        const page = byNumber.get(pageNumber);
        const selected =
          selection !== null &&
          pageNumber >= selection.startPage &&
          pageNumber <= selection.endPage;
        const mark = marks?.get(pageNumber);
        const label = formatPdfPageLabel(pageNumber, pageOffset);
        return (
          <li key={pageNumber}>
            <button
              type="button"
              aria-pressed={selected}
              aria-label={`Halaman ${label}${mark ? `, ${mark.label}` : ""}`}
              onClick={(event) => choose(pageNumber, event)}
              className={cn(
                "group focus-visible:ring-ring block w-full rounded-md text-left outline-none focus-visible:ring-2",
              )}
            >
              <span
                className={cn(
                  "relative block overflow-hidden rounded-md border bg-white transition",
                  selected
                    ? "border-primary ring-primary ring-2"
                    : "group-hover:border-foreground/40",
                )}
                style={{
                  aspectRatio: page
                    ? `${page.width} / ${page.height}`
                    : String(fallbackRatio),
                }}
              >
                {page ? (
                  // Signed thumbnails expire, so they bypass next/image.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt=""
                    className="size-full object-contain"
                    decoding="async"
                    loading="lazy"
                    src={page.thumbnailUrl}
                  />
                ) : (
                  <span className="bg-muted text-muted-foreground absolute inset-0 flex animate-pulse items-center justify-center text-[10px]">
                    Memproses…
                  </span>
                )}
                {waiting && pageNumber === anchor ? (
                  <span className="bg-primary text-primary-foreground absolute inset-x-0 top-0 px-1.5 py-0.5 text-center text-[10px] font-semibold">
                    Awal
                  </span>
                ) : null}
                {mark ? (
                  <span
                    className="absolute inset-x-0 bottom-0 truncate px-1.5 py-0.5 text-[10px] font-semibold text-white"
                    style={{ backgroundColor: mark.color }}
                  >
                    {mark.label}
                  </span>
                ) : null}
              </span>
              <span
                className={cn(
                  "mt-1 block text-center text-[11px] tabular-nums",
                  selected
                    ? "text-primary font-semibold"
                    : "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
