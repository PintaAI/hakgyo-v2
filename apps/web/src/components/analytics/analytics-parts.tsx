import type { ReactNode } from "react";
import {
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  ChevronRightIcon,
  MinusIcon,
} from "lucide-react";

import Link from "~/components/link";
import type { Change } from "~/lib/analytics/format";
import { cn } from "~/lib/utils";

/** "+12% dari 30 hari sebelumnya", colored by direction. */
export function ChangeLine({
  change,
  comparison,
}: {
  change: Change | null;
  comparison: string;
}) {
  if (!change) {
    return <span>Belum ada pembanding</span>;
  }
  const Icon =
    change.direction === "up"
      ? ArrowUpRightIcon
      : change.direction === "down"
        ? ArrowDownRightIcon
        : MinusIcon;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1">
      <span
        className={cn(
          "inline-flex items-center gap-0.5 font-medium tabular-nums",
          change.direction === "up" && "text-emerald-700 dark:text-emerald-400",
          change.direction === "down" && "text-amber-700 dark:text-amber-400",
        )}
      >
        <Icon className="size-3.5" aria-hidden />
        {change.text}
      </span>
      <span>dari {comparison}</span>
    </span>
  );
}

/**
 * A titled block of the analytics page. Sections run edge to edge on phones,
 * separated by hairlines, and sit on card surfaces from `sm` up.
 */
export function AnalyticsSection({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "bg-card text-card-foreground border-border min-w-0 rounded-2xl border p-5 shadow-sm sm:p-6",
        "max-sm:rounded-none max-sm:border-x-0 max-sm:border-t-0 max-sm:bg-transparent max-sm:px-0 max-sm:pt-0 max-sm:shadow-none",
        className,
      )}
    >
      <header className="mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <h2 className="text-base font-medium tracking-[-0.01em]">{title}</h2>
          {description ? (
            <p className="text-muted-foreground mt-0.5 text-sm">
              {description}
            </p>
          ) : null}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export type RankedRow = {
  key: string;
  title: ReactNode;
  subtitle?: ReactNode;
  value: ReactNode;
  /** Secondary figure under the value. */
  detail?: ReactNode;
  /** 0–1 share drawn as a bar under the title. */
  share?: number | null;
  /** Marks a weak result (low score, inactive learner). */
  warn?: boolean;
  /** Colors the share bar as weak; defaults to `warn`. */
  warnShare?: boolean;
  href?: string;
  leading?: ReactNode;
};

/** Rows with a figure on the right, optionally with a share bar. */
export function RankedRows({
  rows,
  label,
  empty,
}: {
  rows: readonly RankedRow[];
  label: string;
  empty: ReactNode;
}) {
  if (!rows.length) {
    return (
      <p className="text-muted-foreground border-border rounded-xl border border-dashed px-4 py-8 text-center text-sm">
        {empty}
      </p>
    );
  }
  return (
    <ul aria-label={label} className="divide-border -my-3 divide-y">
      {rows.map((row) => {
        const content = (
          <>
            {row.leading}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">
                {row.title}
              </span>
              {row.subtitle ? (
                <span className="text-muted-foreground block truncate text-xs">
                  {row.subtitle}
                </span>
              ) : null}
              {row.share !== undefined && row.share !== null ? (
                <span className="bg-muted mt-2 block h-1.5 overflow-hidden rounded-full">
                  <span
                    className={cn(
                      "block h-full rounded-full",
                      (row.warnShare ?? row.warn)
                        ? "bg-amber-500"
                        : "bg-primary",
                    )}
                    style={{
                      width: `${Math.round(Math.min(Math.max(row.share, 0), 1) * 100)}%`,
                    }}
                  />
                </span>
              ) : null}
            </span>
            <span className="shrink-0 text-right">
              <span
                className={cn(
                  "block text-sm font-medium tabular-nums",
                  row.warn && "text-amber-700 dark:text-amber-400",
                )}
              >
                {row.value}
              </span>
              {row.detail ? (
                <span className="text-muted-foreground block text-xs tabular-nums">
                  {row.detail}
                </span>
              ) : null}
            </span>
            {row.href ? (
              <ChevronRightIcon
                aria-hidden
                className="text-muted-foreground size-4 shrink-0"
              />
            ) : null}
          </>
        );
        return (
          <li key={row.key}>
            {row.href ? (
              <Link
                href={row.href}
                className="hover:bg-muted/50 -mx-2 flex items-center gap-3 rounded-lg px-2 py-3 transition-colors"
              >
                {content}
              </Link>
            ) : (
              <div className="flex items-center gap-3 py-3">{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
