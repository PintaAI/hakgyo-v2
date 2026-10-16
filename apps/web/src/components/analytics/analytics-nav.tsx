"use client";

import { usePathname, useSearchParams } from "next/navigation";

import Link from "~/components/link";
import {
  analyticsPeriodLabels,
  analyticsPeriods,
  defaultAnalyticsPeriod,
  parseAnalyticsPeriod,
} from "~/lib/analytics/period";
import { cn } from "~/lib/utils";

function withPeriod(href: string, period: string) {
  return period === defaultAnalyticsPeriod ? href : `${href}?periode=${period}`;
}

/**
 * Tabs for the analytics sections. Like `Subnav`, but switching tabs keeps
 * the selected period.
 */
export function AnalyticsTabs({
  tabs,
}: {
  tabs: ReadonlyArray<{ href: string; label: string }>;
}) {
  const pathname = usePathname();
  const period = parseAnalyticsPeriod(useSearchParams().get("periode"));

  return (
    <div className="max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <nav
        aria-label="Bagian analitik"
        className="border-border flex min-w-max items-center gap-6 border-b"
      >
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={withPeriod(tab.href, period)}
            aria-current={
              pathname === tab.href || pathname.startsWith(`${tab.href}/`)
                ? "page"
                : undefined
            }
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring aria-[current=page]:border-primary aria-[current=page]:text-foreground relative -mb-px border-b-2 border-transparent py-3 text-sm font-medium whitespace-nowrap transition-colors focus-visible:rounded-sm focus-visible:ring-2 focus-visible:outline-none"
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

/** Period choice, kept in the `periode` search parameter. */
export function AnalyticsPeriodPicker({ className }: { className?: string }) {
  const pathname = usePathname();
  const period = parseAnalyticsPeriod(useSearchParams().get("periode"));

  return (
    <nav
      aria-label="Periode"
      className={cn(
        "bg-muted inline-flex max-w-full overflow-x-auto rounded-full p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {analyticsPeriods.map((option) => (
        <Link
          key={option}
          href={withPeriod(pathname, option)}
          scroll={false}
          aria-current={option === period ? "true" : undefined}
          className="text-muted-foreground hover:text-foreground aria-[current=true]:bg-background aria-[current=true]:text-foreground focus-visible:ring-ring/50 shrink-0 rounded-full px-3 py-1 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3 aria-[current=true]:shadow-sm"
        >
          {analyticsPeriodLabels[option]}
        </Link>
      ))}
    </nav>
  );
}
