"use client";

import { questionTone, questionToneFill } from "~/lib/learner/question-colors";
import type { QuestionStatus } from "~/lib/learner/question-progress";
import { cn } from "~/lib/utils";

/** Up to this many questions show as dots (an EPS-TOPIK section has 20). */
const MAX_DOTS = 20;

/**
 * Every question's state above the questions, in the question list's colours
 * (`question-colors.ts`): answered or right, wrong, opened, not opened. The
 * current dot stretches into a bar; longer sets show one segment per question
 * instead, the current one raised. A click opens the question list. Mirrors
 * the app's `QuizStatusDots`.
 */
export function QuizStatusDots({
  statuses,
  seen,
  current,
  onOpenList,
  disabled = false,
}: {
  statuses: readonly QuestionStatus[];
  /** Questions the learner has opened; left out where it does not matter. */
  seen?: readonly boolean[];
  /** The question in view. */
  current: number;
  onOpenList: () => void;
  disabled?: boolean;
}) {
  const tones = statuses.map((status, index) =>
    questionTone(status, seen?.[index] ?? false),
  );
  const answered = statuses.filter((status) => status !== "unanswered").length;
  const segments = statuses.length > MAX_DOTS;

  return (
    <button
      type="button"
      aria-label={`Daftar soal, ${answered} dari ${statuses.length} dijawab`}
      title="Buka daftar untuk pindah ke soal mana pun"
      disabled={disabled}
      onClick={onOpenList}
      className={cn(
        "-my-3 flex items-center py-3 transition-opacity hover:opacity-80 active:opacity-60 disabled:opacity-100",
        segments ? "self-stretch" : "self-center px-4",
      )}
    >
      {segments ? (
        <span className="flex h-2.5 w-full items-center gap-0.5">
          {tones.map((tone, index) => (
            <span
              key={index}
              className={cn(
                "flex-1 rounded-full",
                index === current ? "h-2.5" : "h-1.5",
                questionToneFill[tone],
              )}
            />
          ))}
        </span>
      ) : (
        <span className="flex items-center gap-2">
          {tones.map((tone, index) => (
            <span
              key={index}
              className={cn(
                "h-1.5 rounded-full transition-[width] duration-200 motion-reduce:transition-none",
                index === current ? "w-7" : "w-2",
                questionToneFill[tone],
              )}
            />
          ))}
        </span>
      )}
    </button>
  );
}
