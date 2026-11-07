import type { ReactNode } from "react";

import { cn } from "~/lib/utils";

const tones = {
  muted: "text-muted-foreground",
  primary: "text-primary",
  foreground: "text-foreground",
  destructive: "text-destructive",
} as const;

const sizes = {
  xs: "text-[10px]",
  sm: "text-[11px]",
  md: "text-xs",
} as const;

/** A small uppercase label above a title or inside a section, like the app's `Eyebrow`. */
export function Eyebrow({
  children,
  tone = "muted",
  size = "sm",
  className,
}: {
  children: ReactNode;
  tone?: keyof typeof tones;
  size?: keyof typeof sizes;
  /** Layout only (alignment, flex); type styles come from `tone` and `size`. */
  className?: string;
}) {
  return (
    <p
      className={cn(
        "font-bold tracking-[1.5px] uppercase",
        sizes[size],
        tones[tone],
        className,
      )}
    >
      {children}
    </p>
  );
}
