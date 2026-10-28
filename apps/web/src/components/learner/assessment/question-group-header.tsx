"use client";

import { RichContent } from "~/components/learner/practice/rich-content";
import { cn } from "~/lib/utils";

/**
 * A group's shared part above each of its questions (docs/eps-topik-simulation.md section 4.5):
 * which questions it covers, its instructions and its stimulus (a passage, picture or audio).
 * Mirrors the mobile `QuestionGroupHeader`.
 */
export function QuestionGroupHeader({
  instructions,
  stimulus,
  first,
  last,
  contentClassName,
}: {
  instructions: unknown;
  stimulus: unknown;
  /** Display indexes of the group's first and last question. */
  first: number;
  last: number;
  /** Applied around the rich content (hides inline audio under a controlled player). */
  contentClassName?: string;
}) {
  return (
    <div className="border-border grid gap-2 border-b pb-4">
      <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        {first === last ? `Soal ${first + 1}` : `Soal ${first + 1}–${last + 1}`}
      </p>
      {instructions ? (
        <div className={cn("font-semibold", contentClassName)}>
          <RichContent content={instructions} />
        </div>
      ) : null}
      {stimulus ? (
        <div className={contentClassName}>
          <RichContent content={stimulus} />
        </div>
      ) : null}
    </div>
  );
}
