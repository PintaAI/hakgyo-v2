import type { ReactNode } from "react";

import { Kicker } from "~/components/brand/typography";
import { cn } from "~/lib/utils";

function HeaderText({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
}) {
  return (
    <>
      {eyebrow ? <Kicker>{eyebrow}</Kicker> : null}
      <h1
        className={cn(
          "text-3xl leading-[1.1] font-medium tracking-[-0.04em] sm:text-4xl",
          eyebrow && "mt-3",
        )}
      >
        {title}
      </h1>
      {description ? (
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-6 sm:text-base sm:leading-7">
          {description}
        </p>
      ) : null}
    </>
  );
}

/**
 * A page's eyebrow, title, description, and actions, in the brand style.
 * With `media`, such as a kurikulum cover, the media sits beside the text on
 * large screens and the actions move under the description.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  media,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  media?: ReactNode;
  className?: string;
}) {
  if (media) {
    return (
      <header
        className={cn(
          "grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)] lg:items-center lg:gap-10",
          className,
        )}
      >
        <div className="min-w-0">
          <HeaderText
            eyebrow={eyebrow}
            title={title}
            description={description}
          />
          {actions ? (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {actions}
            </div>
          ) : null}
        </div>
        {/* Decorative beside the title; phones keep the content first. */}
        <div className="hidden sm:block">{media}</div>
      </header>
    );
  }

  return (
    <header
      className={cn(
        "flex flex-col justify-between gap-4 sm:flex-row sm:items-end",
        className,
      )}
    >
      <div className="min-w-0">
        <HeaderText eyebrow={eyebrow} title={title} description={description} />
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
