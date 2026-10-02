"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MaximizeIcon,
  MinimizeIcon,
} from "lucide-react";

import { cn } from "~/lib/utils";

import { presentingQuery } from "./layout";

type SlideLink = { id: string; label: string };

/** Shortest time between two wheel steps, while the slide scrolls in. */
const wheelStepMs = 650;
/** Wheel silence that ends one gesture, including trackpad momentum. */
const wheelGestureEndMs = 180;

/** Whether an element under the pointer can still scroll this way itself. */
function scrollsInside(target: EventTarget | null, deltaY: number) {
  for (
    let element = target instanceof Element ? target : null;
    element && element !== document.documentElement;
    element = element.parentElement
  ) {
    const { overflowY } = getComputedStyle(element);
    if (overflowY !== "auto" && overflowY !== "scroll") continue;
    if (element.scrollHeight <= element.clientHeight + 1) continue;
    const atEnd =
      element.scrollTop + element.clientHeight >= element.scrollHeight - 1;
    if (deltaY > 0 ? !atEnd : element.scrollTop > 0) return true;
  }
  return false;
}

function isEditableTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

/**
 * Presenter controls for the landing page: marks the slide under the middle
 * of the viewport as active and moves between slides with the buttons,
 * ← / →, and on large screens one step per scroll gesture or ↑ / ↓.
 */
export function SlideNavigator({ slides }: { slides: readonly SlideLink[] }) {
  const [active, setActive] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const elements = slides.map(({ id }) => document.getElementById(id));
    let frame = 0;
    // Measured rather than observed: layout shifts while demos load, and the
    // slide covering the middle of the viewport is the only reliable answer.
    function update() {
      frame = 0;
      const middle = window.innerHeight / 2;
      const current = Math.max(
        0,
        elements.findIndex((element) => {
          const rect = element?.getBoundingClientRect();
          return rect && rect.top <= middle && rect.bottom > middle;
        }),
      );
      elements.forEach((element, index) =>
        // Drives the slide's reveal animation (see globals.css).
        element?.toggleAttribute("data-active", index === current),
      );
      setActive(current);
    }
    function schedule() {
      frame ||= requestAnimationFrame(update);
    }
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [slides]);

  const goTo = useCallback(
    (index: number) => {
      const slide = slides[Math.min(Math.max(index, 0), slides.length - 1)];
      document.getElementById(slide!.id)?.scrollIntoView({ block: "start" });
    },
    [slides],
  );

  // A slide with its own steps (such as horizontal panels) handles the move
  // first by cancelling the "landing:step" event it receives.
  const step = useCallback(
    (direction: 1 | -1) => {
      const slide = document.getElementById(slides[active]!.id);
      const event = new CustomEvent("landing:step", {
        cancelable: true,
        detail: direction,
      });
      if (slide && !slide.dispatchEvent(event)) return;
      goTo(active + direction);
    },
    [active, goTo, slides],
  );

  // Wheel and keyboard handlers below always call the latest `step`.
  const stepRef = useRef(step);
  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  // On large screens one scroll gesture moves exactly one step, the same as
  // the next and previous buttons, including steps inside a slide.
  useEffect(() => {
    const deck = window.matchMedia(presentingQuery);
    let locked = false;
    let steppedAt = 0;
    let gestureEnd = 0;
    function release() {
      const wait = steppedAt + wheelStepMs - performance.now();
      if (wait > 0) gestureEnd = window.setTimeout(release, wait);
      else locked = false;
    }
    function onWheel(event: WheelEvent) {
      if (
        !deck.matches ||
        event.ctrlKey ||
        Math.abs(event.deltaX) > Math.abs(event.deltaY) ||
        scrollsInside(event.target, event.deltaY)
      )
        return;
      event.preventDefault();
      window.clearTimeout(gestureEnd);
      gestureEnd = window.setTimeout(release, wheelGestureEndMs);
      if (locked || Math.abs(event.deltaY) < 4) return;
      locked = true;
      steppedAt = performance.now();
      stepRef.current(event.deltaY > 0 ? 1 : -1);
    }
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      window.clearTimeout(gestureEnd);
      window.removeEventListener("wheel", onWheel);
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        isEditableTarget(event.target)
      )
        return;
      const paging = window.matchMedia(presentingQuery).matches;
      if (
        event.key === "ArrowRight" ||
        (paging && (event.key === "ArrowDown" || event.key === "PageDown"))
      )
        step(1);
      else if (
        event.key === "ArrowLeft" ||
        (paging && (event.key === "ArrowUp" || event.key === "PageUp"))
      )
        step(-1);
      else return;
      event.preventDefault();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [step]);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement !== null);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  function toggleFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen().catch(() => null);
  }

  const current = slides[active]!;
  const control =
    "text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring grid size-9 place-items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-35";

  return (
    <>
      <nav
        aria-label="Daftar slide"
        className="fixed top-1/2 right-4 z-40 hidden -translate-y-1/2 flex-col gap-2.5 lg:flex"
      >
        {slides.map(({ id, label }, index) => (
          <a
            key={id}
            href={`#${id}`}
            aria-label={`${index + 1}. ${label}`}
            aria-current={index === active ? "step" : undefined}
            title={label}
            className="group grid size-4 place-items-center"
          >
            <span
              className={cn(
                "bg-muted-foreground/35 group-hover:bg-foreground size-1.5 rounded-full transition-all",
                index === active && "bg-primary ring-background h-4 ring-1",
              )}
            />
          </a>
        ))}
      </nav>
      <div className="bg-background/85 border-border fixed right-6 bottom-6 z-40 hidden items-center gap-1 rounded-full border p-1 shadow-sm backdrop-blur lg:flex">
        <button
          type="button"
          className={control}
          onClick={() => step(-1)}
          disabled={active === 0}
          aria-label="Slide sebelumnya"
        >
          <ChevronLeftIcon className="size-4" />
        </button>
        <p className="min-w-40 px-2 text-center text-xs" aria-live="polite">
          <span className="font-mono">
            {String(active + 1).padStart(2, "0")} /{" "}
            {String(slides.length).padStart(2, "0")}
          </span>
          <span className="text-muted-foreground"> · {current.label}</span>
        </p>
        <button
          type="button"
          className={control}
          onClick={() => step(1)}
          disabled={active === slides.length - 1}
          aria-label="Slide berikutnya"
        >
          <ChevronRightIcon className="size-4" />
        </button>
        <span className="bg-border mx-1 h-5 w-px" aria-hidden="true" />
        <button
          type="button"
          className={control}
          onClick={toggleFullscreen}
          aria-label={fullscreen ? "Keluar dari layar penuh" : "Layar penuh"}
          title={fullscreen ? "Keluar dari layar penuh" : "Layar penuh"}
        >
          {fullscreen ? (
            <MinimizeIcon className="size-4" />
          ) : (
            <MaximizeIcon className="size-4" />
          )}
        </button>
      </div>
    </>
  );
}
