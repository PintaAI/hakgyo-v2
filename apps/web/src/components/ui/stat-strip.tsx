import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRightIcon } from "lucide-react";

import { cn } from "~/lib/utils";

export type StatItem = {
  label: string;
  value: ReactNode;
  /** Makes the figure a link to where it comes from. */
  href?: string;
  /** Marks a figure that needs action, such as answers waiting for review. */
  attention?: boolean;
};

const columns = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-4",
} as const;

/** A row of headline figures, divided by hairlines, as on the landing page. */
export function StatStrip({
  items,
  label,
  className,
}: {
  items: readonly StatItem[];
  /** Accessible name of the summary. */
  label: string;
  className?: string;
}) {
  return (
    <section
      aria-label={label}
      className={cn(
        "border-border grid grid-cols-2 gap-x-4 gap-y-5 border-y py-5",
        columns[Math.min(Math.max(items.length, 2), 4) as keyof typeof columns],
        className,
      )}
    >
      {items.map(({ label: itemLabel, value, href, attention }) => {
        const content = (
          <>
            <span className="text-muted-foreground flex items-center gap-2 font-mono text-[10px] tracking-[0.18em] uppercase sm:text-xs">
              <span className="truncate">{itemLabel}</span>
              {href ? (
                <ArrowUpRightIcon className="ml-auto size-3.5 shrink-0 transition-transform group-hover/stat:translate-x-0.5 group-hover/stat:-translate-y-0.5" />
              ) : null}
            </span>
            <span className="mt-1.5 flex items-center gap-2 text-2xl font-medium tracking-[-0.03em] tabular-nums sm:text-3xl">
              {value}
              {attention ? (
                <span className="bg-primary size-2 rounded-full" />
              ) : null}
            </span>
          </>
        );
        // Hairlines only where the figures share one row.
        const cell =
          "border-border flex min-w-0 flex-col pr-2 sm:border-l sm:pl-6 sm:first:border-l-0 sm:first:pl-0";
        return href ? (
          <Link
            key={itemLabel}
            href={href}
            className={cn(cell, "group/stat hover:text-foreground")}
          >
            {content}
          </Link>
        ) : (
          <div key={itemLabel} className={cell}>
            {content}
          </div>
        );
      })}
    </section>
  );
}
