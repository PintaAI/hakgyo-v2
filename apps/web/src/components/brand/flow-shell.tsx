import type { ReactNode } from "react";

import { cn } from "~/lib/utils";

import { BrandLink } from "./brand-link";

/** Container width of standalone flows. */
export const flowContainer = "mx-auto w-full max-w-6xl px-5 sm:px-10";

/** A bordered card on the page background, as on the landing page. */
export const surfaceCard =
  "border-border bg-card rounded-2xl border shadow-[0_1px_2px_rgb(0_0_0/0.04)]";

/**
 * Page chrome for standalone flows outside the workspace, such as onboarding
 * and invitations: the logo, an optional action, and the landing page's
 * drifting light.
 */
export function FlowShell({
  action,
  className,
  children,
}: {
  /** Shown opposite the logo, such as a skip link. */
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <main className="bg-background text-foreground selection:bg-primary selection:text-primary-foreground relative min-h-dvh overflow-x-clip pb-[max(3rem,env(safe-area-inset-bottom))]">
      <div
        className="bg-primary/10 animate-landing-drift pointer-events-none absolute -top-40 -right-40 size-[36rem] rounded-full blur-3xl"
        aria-hidden="true"
      />
      <header
        className={cn(
          flowContainer,
          "relative flex h-16 items-center justify-between gap-4 sm:h-20",
        )}
      >
        <BrandLink />
        {action}
      </header>
      <div className={cn(flowContainer, "relative", className)}>{children}</div>
    </main>
  );
}
