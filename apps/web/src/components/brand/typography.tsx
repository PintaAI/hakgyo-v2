import type { ComponentProps, ReactNode } from "react";

import { cn } from "~/lib/utils";

/** Type scale of a page or slide's main heading. */
export const headlineText =
  "text-[2rem] leading-[1.08] font-medium tracking-[-0.045em] sm:text-5xl sm:leading-[1.06] sm:tracking-[-0.05em] xl:text-6xl";

/** Body copy under a headline. */
export const leadText =
  "text-muted-foreground max-w-xl text-[15px] leading-6 sm:text-base sm:leading-7 lg:text-lg lg:leading-8";

/** The small monospace line, led by a rule, that sits above a headline. */
export function Kicker({
  inverted = false,
  className,
  children,
  ...props
}: ComponentProps<"p"> & {
  /** For text on the primary colour. */
  inverted?: boolean;
}) {
  return (
    <p
      {...props}
      className={cn(
        "flex items-center gap-2.5 font-mono text-[10px] tracking-[0.18em] uppercase sm:gap-3 sm:text-xs",
        inverted ? "opacity-70" : "text-muted-foreground",
        className,
      )}
    >
      <span
        className={cn(
          "h-px w-6 shrink-0 sm:w-8",
          inverted ? "bg-primary-foreground" : "bg-primary",
        )}
      />
      {children}
    </p>
  );
}

/**
 * A two-tone heading: the title, then a muted second line. Takes
 * `headlineText` unless `className` sets another scale.
 */
export function Headline({
  as: Heading = "h2",
  title,
  muted,
  className,
  ...props
}: Omit<ComponentProps<"h2">, "title"> & {
  as?: "h1" | "h2" | "h3";
  title: ReactNode;
  muted?: ReactNode;
}) {
  return (
    <Heading {...props} className={cn(headlineText, className)}>
      {title}
      {muted ? (
        <>
          <br />
          <span className="text-muted-foreground">{muted}</span>
        </>
      ) : null}
    </Heading>
  );
}
