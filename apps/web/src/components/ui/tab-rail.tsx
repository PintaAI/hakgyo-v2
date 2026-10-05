"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { cn } from "~/lib/utils";

/** Horizontally scrolling rail for a tab list. On narrow screens it keeps the
 * selected tab in view, so deep links such as `?view=staff` show their tab. */
export function TabRail({
  activeKey,
  className,
  children,
}: {
  activeKey: string;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const rail = ref.current;
    const active = rail?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!rail || !active || rail.scrollWidth <= rail.clientWidth) return;
    const left =
      active.offsetLeft - (rail.clientWidth - active.offsetWidth) / 2;
    rail.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [activeKey]);

  return (
    <div
      ref={ref}
      className={cn(
        "relative max-w-full overflow-x-auto border-b [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}
