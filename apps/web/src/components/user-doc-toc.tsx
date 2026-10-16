"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ListIcon } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet";
import type { UserDocHeading } from "~/lib/user-doc-headings";
import { cn } from "~/lib/utils";

/** Distance from the top of the viewport that counts as "being read". */
const readingLine = 112;

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function useActiveHeading(headings: UserDocHeading[]) {
  const [activeId, setActiveId] = useState<string | null>(
    headings[0]?.id ?? null,
  );
  const lockedUntil = useRef(0);

  useEffect(() => {
    if (!headings.length) return;
    let frame = 0;

    const update = () => {
      frame = 0;
      if (Date.now() < lockedUntil.current) return;

      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 2;
      if (atBottom) {
        setActiveId(headings.at(-1)?.id ?? null);
        return;
      }

      let current = headings[0]?.id ?? null;
      for (const heading of headings) {
        const element = document.getElementById(heading.id);
        if (!element) continue;
        if (element.getBoundingClientRect().top - readingLine > 0) break;
        current = heading.id;
      }
      setActiveId(current);
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    const unlock = () => {
      lockedUntil.current = 0;
      schedule();
    };

    // A link to a section (`#id`) highlights that section first.
    const hash = decodeURIComponent(window.location.hash.slice(1));
    if (headings.some((heading) => heading.id === hash)) {
      lockedUntil.current = Date.now() + 1000;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        setActiveId(hash);
      });
    } else {
      schedule();
    }

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("scrollend", unlock);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scrollend", unlock);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [headings]);

  const select = useCallback((id: string) => {
    const element = document.getElementById(id);
    if (!element) return;
    // Keep the clicked item highlighted while the smooth scroll passes the
    // headings in between.
    lockedUntil.current = Date.now() + 1000;
    setActiveId(id);
    element.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "start",
    });
    window.history.replaceState(null, "", `#${id}`);
  }, []);

  return { activeId, select };
}

function TocList({
  headings,
  activeId,
  onSelect,
}: {
  headings: UserDocHeading[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    // Keep the active item visible inside the scrollable list without
    // scrolling the page itself (scrollIntoView would move the window too).
    const container = listRef.current?.closest("nav");
    const active = listRef.current?.querySelector<HTMLElement>(
      '[aria-current="location"]',
    );
    if (!container || !active) return;
    const top =
      active.getBoundingClientRect().top -
      container.getBoundingClientRect().top +
      container.scrollTop;
    const bottom = top + active.offsetHeight;
    if (top < container.scrollTop) container.scrollTop = top - 8;
    else if (bottom > container.scrollTop + container.clientHeight) {
      container.scrollTop = bottom - container.clientHeight + 8;
    }
  }, [activeId]);

  return (
    <ol ref={listRef} className="border-border space-y-0.5 border-l text-sm">
      {headings.map((heading) => {
        const active = heading.id === activeId;
        return (
          <li key={heading.id}>
            <a
              href={`#${heading.id}`}
              aria-current={active ? "location" : undefined}
              onClick={(event) => {
                event.preventDefault();
                onSelect(heading.id);
              }}
              className={cn(
                "-ml-px block border-l-2 py-1.5 pr-2 leading-5 transition-colors outline-none focus-visible:underline",
                heading.level === 3 ? "pl-7" : "pl-4",
                active
                  ? "border-primary text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground border-transparent",
              )}
            >
              {heading.text}
            </a>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * "Di halaman ini": a sticky list beside the article on wide screens
 * (`variant="aside"`), or a button that opens the same list in a bottom
 * sheet on smaller screens (`variant="sheet"`).
 */
export function UserDocToc({
  headings,
  variant,
}: {
  headings: UserDocHeading[];
  variant: "aside" | "sheet";
}) {
  const { activeId, select } = useActiveHeading(headings);
  const [open, setOpen] = useState(false);
  if (headings.length < 2) return null;

  if (variant === "aside") {
    return (
      <nav
        aria-label="Di halaman ini"
        className="sticky top-20 max-h-[calc(100svh-6rem)] overflow-y-auto pb-6"
      >
        <p className="mb-3 text-sm font-medium">Di halaman ini</p>
        <TocList headings={headings} activeId={activeId} onSelect={select} />
      </nav>
    );
  }

  return (
    <div className="xl:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger render={<Button variant="outline" size="sm" />}>
          <ListIcon />
          Di halaman ini
        </SheetTrigger>
        <SheetContent side="bottom" className="max-h-[75svh] rounded-t-2xl">
          <SheetHeader className="pb-0">
            <SheetTitle>Di halaman ini</SheetTitle>
          </SheetHeader>
          <nav
            aria-label="Di halaman ini"
            className="overflow-y-auto px-4 pb-8"
          >
            <TocList
              headings={headings}
              activeId={activeId}
              onSelect={(id) => {
                setOpen(false);
                // Wait for the sheet to close and unlock page scrolling.
                window.setTimeout(() => select(id), 200);
              }}
            />
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}
