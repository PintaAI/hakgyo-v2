import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "~/lib/utils";

/**
 * Dashed placeholder for lists without content. `size="sm"` fits inside
 * cards and tabs; the default size fills a page section. Give `action` its
 * own top margin (usually `mt-4`).
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  size = "default",
  className,
}: {
  icon: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  size?: "default" | "sm";
  className?: string;
}) {
  const small = size === "sm";
  const Heading = small ? "h3" : "h2";
  return (
    <div
      className={cn(
        "bg-muted/20 flex flex-col items-center justify-center rounded-xl border border-dashed text-center",
        small ? "px-5 py-10" : "min-h-72 px-6 py-12",
        className,
      )}
    >
      <div
        className={cn(
          "bg-background mb-4 flex items-center justify-center rounded-xl border shadow-sm",
          small ? "size-10" : "size-12",
        )}
      >
        <Icon className={small ? "size-4" : "size-5"} />
      </div>
      <Heading
        className={cn("font-heading font-semibold", small ? "text-sm" : null)}
      >
        {title}
      </Heading>
      {description ? (
        <p
          className={cn(
            "text-muted-foreground mt-1 max-w-sm",
            small ? "text-xs leading-relaxed" : "text-sm",
          )}
        >
          {description}
        </p>
      ) : null}
      {action}
    </div>
  );
}
