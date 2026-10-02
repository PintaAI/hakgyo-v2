import Link from "next/link";
import {
  CheckIcon,
  ChevronRightIcon,
  FileTextIcon,
  LanguagesIcon,
  LockIcon,
  type LucideIcon,
  SquareCheckBigIcon,
} from "lucide-react";

import {
  getLearningItemTypeMeta,
  type LearningItemType,
} from "~/lib/learner/learning-item-type";
import { cn } from "~/lib/utils";

const typeIcons: Record<LearningItemType, LucideIcon> = {
  MATERIAL: FileTextIcon,
  VOCABULARY_SET: LanguagesIcon,
  ASSESSMENT: SquareCheckBigIcon,
};

/**
 * Learning-item row: icon circle, connecting rail, title and detail with the
 * per-type colors. Used by the course outline and the milestone timeline.
 */
export function LearningItemRow({
  title,
  type,
  typeLabel,
  statusText,
  completed,
  locked = false,
  highlighted = false,
  isLast,
  showChevron = true,
  href,
  onNavigate,
}: {
  title: string;
  type: LearningItemType;
  typeLabel?: string;
  statusText: string;
  completed: boolean;
  locked?: boolean;
  highlighted?: boolean;
  isLast: boolean;
  showChevron?: boolean;
  href?: string;
  onNavigate?: () => void;
}) {
  const meta = getLearningItemTypeMeta(type);
  const Icon = typeIcons[type];
  const body = (
    <div className="flex min-w-0 flex-1 items-start gap-3 pl-3">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span
          className={cn(
            "text-[15px] leading-5 font-semibold",
            highlighted ? "text-primary" : "text-foreground",
          )}
        >
          {title}
        </span>
        <span className="text-muted-foreground text-xs leading-4">
          <span className={cn("font-semibold", meta.textClass)}>
            {typeLabel ?? meta.label}
          </span>
          {" · "}
          {statusText}
        </span>
      </div>
      {showChevron ? (
        <ChevronRightIcon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
      ) : null}
    </div>
  );

  return (
    <li className={cn("relative", isLast ? "pb-1" : "pb-6")}>
      {!isLast ? (
        <span
          aria-hidden
          className="bg-border absolute top-8 bottom-0 left-5 w-0.5"
        />
      ) : null}
      <div
        className={cn(
          "flex",
          highlighted && "bg-primary/10 -mx-1 -my-2 rounded-xl px-1 py-2",
        )}
      >
        <div className="flex w-10 justify-center">
          <span
            className={cn(
              "flex size-8 items-center justify-center rounded-full border",
              completed
                ? "border-primary bg-primary text-primary-foreground"
                : locked
                  ? "border-border bg-background text-muted-foreground"
                  : cn(meta.borderClass, meta.softClass, "text-primary"),
            )}
          >
            {completed ? (
              <CheckIcon className="size-3.5" />
            ) : locked ? (
              <LockIcon className="size-3.5" />
            ) : (
              <Icon className="size-3.5" />
            )}
          </span>
        </div>
        {href && !locked ? (
          <Link
            href={href}
            onClick={onNavigate}
            className="hover:bg-muted/40 flex min-w-0 flex-1 rounded-lg transition-colors"
          >
            {body}
          </Link>
        ) : (
          <div
            aria-disabled={locked || undefined}
            className="flex min-w-0 flex-1"
          >
            {body}
          </div>
        )}
      </div>
    </li>
  );
}
