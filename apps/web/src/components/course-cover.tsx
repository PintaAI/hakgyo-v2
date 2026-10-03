import Image from "next/image";

import { cn } from "~/lib/utils";

const glyphs = ["가", "나", "다", "라", "마", "바", "사", "아", "자", "하"];

/** A stable pick for a course, so its cover never changes between pages. */
function coverSeed(title: string) {
  let hash = 0;
  for (const character of title) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return hash;
}

/**
 * A course's cover: its thumbnail, or a branded stand-in drawn from the
 * title in the organization's theme colours. Size it with `className`
 * (for example `aspect-video w-full` or `size-10 rounded-md`); the stand-in
 * scales its letter to fit and drops its decoration when small.
 */
export function CourseCover({
  title,
  thumbnailUrl,
  sizes = "(min-width: 1024px) 33vw, 100vw",
  priority = false,
  className,
}: {
  title: string;
  thumbnailUrl: string | null | undefined;
  /** The `sizes` of the thumbnail image. */
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  const seed = coverSeed(title);
  const alternate = seed % 2 === 1;
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative shrink-0 overflow-hidden [container-type:size]",
        thumbnailUrl
          ? "bg-muted"
          : alternate
            ? "bg-secondary text-secondary-foreground"
            : "bg-accent text-accent-foreground",
        className,
      )}
    >
      {thumbnailUrl ? (
        <Image
          src={thumbnailUrl}
          alt=""
          fill
          unoptimized
          priority={priority}
          sizes={sizes}
          className="object-cover"
        />
      ) : (
        <>
          <span
            className={cn(
              "absolute -top-[30cqh] -right-[12cqw] size-[90cqh] border border-current opacity-15 @max-[8rem]:hidden",
              alternate ? "rotate-[35deg]" : "rounded-full",
            )}
          />
          <span
            className={cn(
              "absolute -top-[55cqh] -right-[30cqw] size-[140cqh] border border-current opacity-15 @max-[8rem]:hidden",
              alternate ? "rotate-[35deg]" : "rounded-full",
            )}
          />
          <span
            className="absolute inset-0 grid place-items-center font-serif text-[min(30cqw,52cqh)] leading-none opacity-80"
            lang="ko"
          >
            {glyphs[seed % glyphs.length]}
          </span>
          <span className="absolute right-[5cqw] bottom-[6cqh] font-mono text-[10px] tracking-[0.2em] uppercase opacity-70 @max-[12rem]:hidden">
            hakgyo
          </span>
        </>
      )}
    </div>
  );
}
