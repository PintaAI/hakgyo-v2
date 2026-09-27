import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "~/lib/utils";

export function PageHeader({
  icon: Icon,
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  icon?: LucideIcon;
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-col justify-between gap-4 sm:flex-row sm:items-end",
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        {eyebrow ? (
          <div className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
            {Icon ? <Icon className="size-4" /> : null}
            {eyebrow}
          </div>
        ) : null}
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {title}
        </h1>
        {description ? (
          <p className="text-muted-foreground max-w-2xl text-sm">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
