"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { ScrollArea } from "~/components/ui/scroll-area";
import { cn } from "~/lib/utils";

import { landingGutter, wideScreenQuery } from "./layout";
import { usePrefersReducedMotion } from "./motion";

/** Scroll offset that brings a track's child to the start of the track. */
function panelLeft(track: HTMLElement, panel: HTMLElement) {
  // Measured from the first panel so the track's side padding cancels out.
  return panel.offsetLeft - (track.firstElementChild as HTMLElement).offsetLeft;
}

/**
 * Whether a panel is a snap stop. On large screens a panel that shares a
 * page with the one before it is not.
 */
function isSnapStop(panel: Element) {
  return !getComputedStyle(panel).scrollSnapAlign.startsWith("none");
}

function snapStops(track: HTMLElement) {
  return (Array.from(track.children) as HTMLElement[]).filter(isSnapStop);
}

/**
 * Tracks which snap stop of a horizontal track is in view and scrolls to a
 * stop on request. Attach `trackRef` to the scrolling element, which must be
 * positioned so it is its children's offset parent.
 */
function usePanelTrack() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const onScroll = () => {
      const stops = snapStops(track);
      const nearest = stops.reduce(
        (best, stop, index) =>
          Math.abs(panelLeft(track, stop) - track.scrollLeft) <
          Math.abs(panelLeft(track, stops[best]!) - track.scrollLeft)
            ? index
            : best,
        0,
      );
      setActive(nearest);
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => track.removeEventListener("scroll", onScroll);
  }, []);

  function show(index: number) {
    const track = trackRef.current;
    const stop = track ? snapStops(track)[index] : undefined;
    if (!track || !stop) return;
    track.scrollTo({
      left: panelLeft(track, stop),
      behavior: reducedMotion ? "auto" : "smooth",
    });
  }

  return { trackRef, active, show };
}

const arrow =
  "border-border bg-background focus-visible:ring-ring flex h-10 items-center rounded-full border transition-[opacity,color,background-color] focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-0";

/**
 * Previous arrow, position dots, and a next button named after the panel it
 * opens. `labels` names every panel; the first is only used for the back
 * button's accessible name.
 */
function PanelNav({
  labels,
  active,
  onShow,
  className,
}: {
  labels: readonly string[];
  active: number;
  onShow: (index: number) => void;
  className?: string;
}) {
  const previous = labels[active - 1];
  const next = labels[active + 1];
  return (
    <div
      className={cn(
        "grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-4",
        className,
      )}
    >
      <button
        type="button"
        className={cn(
          arrow,
          "text-muted-foreground hover:text-foreground w-10 justify-center justify-self-end",
        )}
        onClick={() => onShow(active - 1)}
        disabled={previous === undefined}
        aria-label={previous ? `Kembali ke ${previous}` : "Panel sebelumnya"}
      >
        <ChevronLeftIcon className="size-4" />
      </button>
      <div className="flex gap-2" aria-hidden="true">
        {labels.map((label, index) => (
          <span
            key={label}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              index === active
                ? "bg-primary w-6"
                : "bg-muted-foreground/30 w-1.5",
            )}
          />
        ))}
      </div>
      <button
        type="button"
        className={cn(
          arrow,
          "hover:bg-muted gap-1 justify-self-start pr-2.5 pl-4 text-sm font-medium whitespace-nowrap",
        )}
        onClick={() => onShow(active + 1)}
        disabled={next === undefined}
        aria-label={next ? `Lanjut ke ${next}` : "Panel berikutnya"}
      >
        {next}
        <ChevronRightIcon className="size-4" />
      </button>
    </div>
  );
}

/**
 * The content of a slide, split into panels so every slide stays one screen
 * tall. Phones show one full-width panel at a time and swipe between them;
 * pass one `Panel` per entry in `labels`.
 *
 * Large screens have two layouts:
 * - Without `pages`, the panels sit side by side in a grid. Pass the grid
 *   classes (`lg:grid-cols-*`, `lg:gap-*`, `lg:items-*`) as `className`.
 * - With `pages`, the slide moves horizontally through screen-wide pages, one
 *   per label, like a presentation: each page replays its reveal animation
 *   when it opens, and the presenter's next and previous step through the
 *   pages before moving to the next slide. Panels fill the pages in order;
 *   set `Panel`'s `page` to put several panels on one page.
 */
export function SlidePanels({
  labels,
  pages,
  className,
  children,
}: {
  labels: readonly string[];
  pages?: readonly string[];
  className?: string;
  children: ReactNode;
}) {
  const { trackRef, active, show } = usePanelTrack();
  const paged = pages !== undefined;

  // Marks every panel on the open page, which replays its reveal animation
  // (see globals.css).
  useEffect(() => {
    const track = trackRef.current;
    if (!track || !paged) return;
    let page = -1;
    for (const panel of Array.from(track.children)) {
      if (isSnapStop(panel)) page++;
      panel.setAttribute("data-panel", "");
      panel.toggleAttribute("data-panel-active", page === active);
    }
  }, [active, paged, trackRef]);

  // The slide navigator asks the active slide to take a step first.
  useEffect(() => {
    const slide = trackRef.current?.closest("[data-slide]");
    if (!slide || !pages) return;
    const onStep = (event: Event) => {
      if (!window.matchMedia(wideScreenQuery).matches) return;
      const next = active + (event as CustomEvent<number>).detail;
      if (next < 0 || next >= pages.length) return;
      event.preventDefault();
      show(next);
    };
    slide.addEventListener("landing:step", onStep);
    return () => slide.removeEventListener("landing:step", onStep);
  });

  return (
    <>
      <ScrollArea
        viewportRef={trackRef}
        scrollbars={false}
        // The track bleeds past the container and gets vertical room so
        // floating chips and shadows around the demos are not clipped. Pages
        // span the whole screen, and neighbouring pages sit a full gutter
        // away so only the open page is visible.
        className={cn(
          "-mx-5 -my-6 sm:-mx-10",
          paged
            ? cn(landingGutter, "lg:mx-[calc(var(--gutter)*-1)]")
            : "lg:m-0",
        )}
        viewportClassName={cn(
          // Only ever scrolls sideways: revealing content slides in from
          // below and must not make the track scroll vertically.
          "relative flex snap-x snap-mandatory scroll-px-5 gap-10 overflow-y-hidden! overscroll-x-contain px-5 py-6 sm:scroll-px-10 sm:px-10 lg:grid",
          paged
            ? "lg:auto-cols-[100%] lg:grid-flow-col lg:scroll-px-[var(--gutter)] lg:gap-x-[calc(var(--gutter)*2)] lg:px-[var(--gutter)]"
            : "lg:overflow-visible! lg:p-0",
          className,
        )}
      >
        {children}
      </ScrollArea>
      <PanelNav
        labels={labels}
        active={active}
        onShow={show}
        className="mt-6 lg:hidden"
      />
      {pages ? (
        // Pinned to the bottom of the slide, which is positioned.
        <PanelNav
          labels={pages}
          active={active}
          onShow={show}
          className="absolute inset-x-0 bottom-6 hidden lg:grid"
        />
      ) : null}
    </>
  );
}

const pageColumns = {
  1: "lg:col-start-1",
  2: "lg:col-start-2",
  3: "lg:col-start-3",
  4: "lg:col-start-4",
} as const;

/** One panel of `SlidePanels`. */
export function Panel({
  page,
  sharesPage = false,
  className,
  children,
}: {
  /** Large-screen page of a paged `SlidePanels`, counting from 1. */
  page?: keyof typeof pageColumns;
  /** Whether an earlier panel already opens this page. */
  sharesPage?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex w-full min-w-0 shrink-0 snap-start flex-col justify-center lg:block lg:w-auto",
        page && [pageColumns[page], "lg:row-start-1"],
        sharesPage && "lg:snap-align-none",
        className,
      )}
    >
      {children}
    </div>
  );
}
