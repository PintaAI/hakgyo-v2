import type { ReactNode } from "react";

import { cardSurface } from "~/components/ui/card";
import { cn } from "~/lib/utils";

import { BrandLink } from "./brand-link";

/** Container width of standalone flows. */
export const flowContainer = "mx-auto w-full max-w-6xl px-5 sm:px-10";

/** The card surface, for cards built without the `Card` component. */
export const surfaceCard = cardSurface;

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
    <main className="bg-background text-foreground selection:bg-primary selection:text-primary-foreground relative min-h-dvh overflow-x-clip pb-[max(2rem,env(safe-area-inset-bottom))] sm:pb-12">
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
