"use client";

import {
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
  type TransitionEvent,
} from "react";

import { cn } from "~/lib/utils";

/**
 * Space between two question pages: twice the phone gutter, so at rest the
 * next page starts past the screen edge instead of peeking in.
 */
const PAGE_GAP = 32;
const SETTLE_MS = 260;
/** A drag past this share of the page, or a flick, turns the page. */
const TURN_SHARE = 0.2;
const FLICK_PX_PER_MS = 0.4;

type Gesture = {
  pointerId: number;
  startX: number;
  startY: number;
  startedAt: number;
  axis: "x" | "y" | null;
  dx: number;
};

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Questions one at a time, like the app's `QuizPager`: on touch screens the
 * page follows a horizontal swipe and the neighbouring question slides in from
 * the screen edge; buttons and the question list slide one page too. The
 * owner keeps the index (`index`, `onIndexChange`); `swipeEnabled` off leaves
 * only the buttons (sections that move forward only or by themselves). Only
 * the page in view and its neighbours are mounted, the neighbours inert.
 */
export function QuizPager({
  count,
  index,
  onIndexChange,
  swipeEnabled = true,
  renderPage,
}: {
  count: number;
  index: number;
  onIndexChange: (index: number) => void;
  swipeEnabled?: boolean;
  renderPage: (index: number) => ReactNode;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const [animated, setAnimated] = useState(false);
  const [dragging, setDragging] = useState(false);
  const gesture = useRef<Gesture | null>(null);
  // The page a release is sliding to, handed to the owner when it arrives.
  const settlingTo = useRef<number | null>(null);
  // The owner's index changed because of a swipe that already slid the page.
  const swiped = useRef(false);
  // A drag just ended over the page: the click it ends with is not a tap.
  const suppressClick = useRef(false);
  const previousIndex = useRef(index);
  // The committed index, for a slide that has to check what the owner did.
  const latestIndex = useRef(index);
  const canSwipe = swipeEnabled && count > 1;

  const pageStep = () => (track.current?.offsetWidth ?? 0) + PAGE_GAP;

  // A move by one page from a button slides: the track starts where the old
  // page was and eases to the new one. Longer jumps just show the page.
  useLayoutEffect(() => {
    latestIndex.current = index;
    const previous = previousIndex.current;
    previousIndex.current = index;
    if (previous === index) return;
    if (swiped.current) {
      swiped.current = false;
      setAnimated(false);
      setOffset(0);
      return;
    }
    const delta = index - previous;
    setAnimated(false);
    if (Math.abs(delta) !== 1 || prefersReducedMotion()) {
      setOffset(0);
      return;
    }
    setOffset(delta * pageStep());
    // Two frames: the start position is painted before the transition runs.
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        setAnimated(true);
        setOffset(0);
      });
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [index]);

  function handOver(target: number) {
    const from = latestIndex.current;
    swiped.current = true;
    onIndexChange(target);
    // The owner may keep the page (busy, a refused move): slide back.
    requestAnimationFrame(() => {
      if (latestIndex.current !== from) return;
      swiped.current = false;
      setAnimated(true);
      setOffset(0);
    });
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (
      !canSwipe ||
      event.pointerType === "mouse" ||
      settlingTo.current !== null
    )
      return;
    gesture.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startedAt: Date.now(),
      axis: null,
      dx: 0,
    };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const current = gesture.current;
    if (current?.pointerId !== event.pointerId) return;
    const dx = event.clientX - current.startX;
    const dy = event.clientY - current.startY;
    if (!current.axis) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      current.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (current.axis === "y") return;
      // From here the page follows the finger, starting where it is now.
      event.currentTarget.setPointerCapture(event.pointerId);
      current.startX = event.clientX;
      current.startedAt = Date.now();
      setAnimated(false);
      setDragging(true);
    }
    if (current.axis !== "x") return;
    const raw = event.clientX - current.startX;
    current.dx = raw;
    // Past the first or last question the page only gives a little.
    const atEdge = (raw > 0 && index === 0) || (raw < 0 && index === count - 1);
    setOffset(atEdge ? raw / 3 : raw);
  }

  function onPointerEnd(event: PointerEvent<HTMLDivElement>) {
    const current = gesture.current;
    if (current?.pointerId !== event.pointerId) return;
    gesture.current = null;
    if (current.axis !== "x") return;
    // The click a drag ends with (if any) fires before this timer.
    suppressClick.current = true;
    window.setTimeout(() => {
      suppressClick.current = false;
    }, 0);
    setDragging(false);
    const step = pageStep();
    const velocity = current.dx / Math.max(1, Date.now() - current.startedAt);
    const direction =
      current.dx < -step * TURN_SHARE || velocity < -FLICK_PX_PER_MS
        ? 1
        : current.dx > step * TURN_SHARE || velocity > FLICK_PX_PER_MS
          ? -1
          : 0;
    const target = index + direction;
    if (direction === 0 || target < 0 || target >= count) {
      setAnimated(!prefersReducedMotion());
      setOffset(0);
      return;
    }
    if (prefersReducedMotion()) {
      handOver(target);
      return;
    }
    settlingTo.current = target;
    setAnimated(true);
    setOffset(-direction * step);
  }

  function onTransitionEnd(event: TransitionEvent<HTMLDivElement>) {
    if (event.target !== track.current) return;
    const target = settlingTo.current;
    settlingTo.current = null;
    if (target !== null) handOver(target);
    else setAnimated(false);
  }

  const pages = [index - 1, index, index + 1].filter(
    (page) => page >= 0 && page < count,
  );
  const moving = dragging || animated || offset !== 0;

  return (
    <div
      // Edge to edge on phones, so pages slide in from the screen edge.
      className={cn(
        "max-sm:-mx-4 max-sm:px-4",
        moving ? "overflow-clip" : "overflow-x-clip",
      )}
      style={canSwipe ? { touchAction: "pan-y" } : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onClickCapture={(event) => {
        if (!suppressClick.current) return;
        suppressClick.current = false;
        event.stopPropagation();
        event.preventDefault();
      }}
    >
      <div
        ref={track}
        className="relative"
        style={{
          transform: offset ? `translate3d(${offset}px, 0, 0)` : undefined,
          transition: animated
            ? `transform ${SETTLE_MS}ms cubic-bezier(0.2, 0.8, 0.2, 1)`
            : undefined,
        }}
        onTransitionEnd={onTransitionEnd}
      >
        {pages.map((page) =>
          page === index ? (
            <div key={page}>{renderPage(page)}</div>
          ) : (
            <div
              key={page}
              inert
              aria-hidden
              className="absolute top-0 w-full"
              style={
                page < index
                  ? { right: `calc(100% + ${PAGE_GAP}px)` }
                  : { left: `calc(100% + ${PAGE_GAP}px)` }
              }
            >
              {renderPage(page)}
            </div>
          ),
        )}
      </div>
    </div>
  );
}
