import type { ReactNode } from "react";

import { cn } from "~/lib/utils";

/**
 * The top of a learning screen in Hakgyo's look, like the app's `HakgyoHero`:
 * the doodles and a wash of the brand colour, both fading into the page at the
 * bottom so the hero has no edge. Edge to edge on phones, pulled up under the
 * header; a rounded panel from `sm` up. Place it first in the page column.
 */
export function HakgyoHero({
  children,
  back,
  className,
}: {
  children: ReactNode;
  /** A way back at the top left, like the app's transparent header over the hero. */
  back?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative isolate -mx-4 -mt-4 overflow-hidden px-4 pt-8 pb-6 sm:mx-0 sm:mt-0 sm:rounded-t-[28px] sm:px-8 sm:pt-10",
        className,
      )}
    >
      <div
        aria-hidden
        className="from-primary/12 dark:from-primary/22 pointer-events-none absolute inset-0 -z-10 bg-linear-to-b to-transparent"
      />
      {/* The doodle tile carries its strokes in the alpha channel (about 7%),
          so masking the brand colour with it tints the strokes only. */}
      <div
        aria-hidden
        className="bg-primary pointer-events-none absolute inset-0 -z-10 mask-[url(/images/doodle.webp)] mask-size-[160px] mask-repeat"
      />
      <div
        aria-hidden
        className="to-background pointer-events-none absolute inset-0 -z-10 bg-linear-to-b from-transparent from-40%"
      />
      {back ? (
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3">{back}</div>
      ) : null}
      <div className="flex flex-col gap-6">{children}</div>
    </div>
  );
}

/** A hero title: tight leading next to the 28px size, like the app's `HERO_TITLE`. */
export const heroTitleClass =
  "text-center text-[28px] leading-[34px] font-black tracking-tight line-clamp-2";

/** Back to front: the last card lies on top, straight. */
const POSES = [
  "-translate-x-[26px] translate-y-1.5 -rotate-7",
  "translate-x-6 translate-y-1 rotate-6",
  "",
];

/**
 * Up to three small cards fanned like the practice deck, `faces[0]` on top: a
 * preview of what a set or a task holds. Decorative; hidden from screen
 * readers.
 */
export function CardFan({ faces }: { faces: ReactNode[] }) {
  const shown = faces.slice(0, 3);
  if (!shown.length) return null;
  const poses = POSES.slice(3 - shown.length);
  return (
    <div aria-hidden className="relative flex h-28 items-center justify-center">
      {[...shown].reverse().map((face, layer) => {
        const top = layer === shown.length - 1;
        return (
          <div
            key={layer}
            className={cn(
              "bg-card absolute flex h-24 w-40 items-center justify-center rounded-[20px] border px-3",
              poses[layer],
              top
                ? "border-primary/35 shadow-[0_4px_10px_rgb(0_0_0/0.12)]"
                : "border-border opacity-92 shadow-[0_4px_10px_rgb(0_0_0/0.06)]",
            )}
          >
            {face}
          </div>
        );
      })}
    </div>
  );
}
