"use client";

import type { ReactNode } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  LayoutGridIcon,
} from "lucide-react";

import { cn } from "~/lib/utils";

function StepButton({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={!onPress}
      onClick={onPress}
      // Kept in place when unavailable, so the row never shifts.
      className="bg-muted flex size-11 shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-80 active:opacity-70 disabled:opacity-35"
    >
      {children}
    </button>
  );
}

/**
 * Moving between questions, like the app's `QuizNav`: the previous question,
 * the question list with the answered count, and the next question. Leave
 * `onPrevious` or `onNext` out where there is no such question.
 */
export function QuizNav({
  answered,
  total,
  onPrevious,
  onNext,
  onOpenList,
  disabled = false,
  nextLabel = "Soal berikutnya",
  className,
}: {
  answered: number;
  total: number;
  onPrevious?: () => void;
  onNext?: () => void;
  onOpenList: () => void;
  disabled?: boolean;
  /** The next button's accessible name ("Soal belum dijawab berikutnya" at a section's end). */
  nextLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <StepButton
        label="Soal sebelumnya"
        onPress={disabled ? undefined : onPrevious}
      >
        <ChevronLeftIcon className="size-5" strokeWidth={2.5} />
      </StepButton>
      <button
        type="button"
        aria-label={`Daftar soal, ${answered} dari ${total} dijawab`}
        title="Buka daftar untuk pindah ke soal mana pun"
        disabled={disabled}
        onClick={onOpenList}
        className="bg-muted flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-full px-4 transition-opacity hover:opacity-80 active:opacity-70 disabled:opacity-50"
      >
        <LayoutGridIcon className="size-3.5 shrink-0" strokeWidth={2.5} />
        <span className="truncate text-sm font-semibold">
          Daftar soal · {answered}/{total}
        </span>
      </button>
      <StepButton label={nextLabel} onPress={disabled ? undefined : onNext}>
        <ChevronRightIcon className="size-5" strokeWidth={2.5} />
      </StepButton>
    </div>
  );
}
