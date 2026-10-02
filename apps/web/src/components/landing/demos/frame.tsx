import type { ReactNode } from "react";

import { cn } from "~/lib/utils";

export const demoShadow =
  "shadow-[0_24px_80px_-32px_color-mix(in_oklch,var(--foreground)_28%,transparent)]";

/** Browser-style window around a product demo. */
export function DemoWindow({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "border-border bg-card overflow-hidden rounded-2xl border",
        demoShadow,
        className,
      )}
    >
      <div
        className="bg-muted/60 border-border flex items-center gap-2 border-b px-4 py-2.5"
        aria-hidden="true"
      >
        {[0, 1, 2].map((dot) => (
          <span
            key={dot}
            className="border-muted-foreground/40 size-2 rounded-full border"
          />
        ))}
        <span className="text-muted-foreground mx-auto pr-8 font-mono text-[10px] tracking-[0.12em]">
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

/** Shows an element with a fade and lift once `shown` becomes true. */
export function Appear({
  shown,
  className,
  children,
}: {
  shown: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "transition-[opacity,translate,scale] duration-500 ease-out motion-reduce:transition-none",
        shown ? "opacity-100" : "translate-y-2 scale-[0.98] opacity-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Animates a row open from zero height. */
export function Expand({
  shown,
  children,
}: {
  shown: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid transition-[grid-template-rows,opacity] duration-500 ease-out motion-reduce:transition-none",
        shown ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
      )}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}
