"use client";

import { useState, type ReactNode } from "react";
import { ArrowRightIcon, CheckIcon, LayoutGridIcon, XIcon } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  nextUnansweredQuestion,
  type QuestionStatus,
} from "~/lib/learner/question-progress";
import {
  questionTone,
  questionToneTile,
  type QuestionTone,
} from "~/lib/learner/question-colors";
import { cn } from "~/lib/utils";

/** The rounded surface every assessment screen is built from. */
export function StudyCard({
  children,
  tone = "primary",
  emphasized = false,
  className,
}: {
  children: ReactNode;
  tone?: "primary" | "destructive";
  emphasized?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-[20px] p-5 ring-1",
        tone === "destructive"
          ? "bg-destructive/10 ring-destructive/30"
          : emphasized
            ? "bg-primary/10 ring-primary/40"
            : "bg-card ring-foreground/10",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AssessmentQuestion({
  children,
  detail,
  current,
  total,
  answered,
  onOpen,
  disabled = false,
}: {
  children: ReactNode;
  detail?: string;
  current?: number;
  total?: number;
  answered?: number;
  onOpen?: () => void;
  disabled?: boolean;
}) {
  const showHeader =
    current !== undefined &&
    total !== undefined &&
    answered !== undefined &&
    onOpen;
  return (
    <StudyCard>
      {showHeader ? (
        <button
          type="button"
          disabled={disabled}
          onClick={onOpen}
          aria-label={`Soal. ${answered} dari ${total} dijawab. Soal saat ini ${current + 1}. Buka daftar soal untuk berpindah ke soal mana pun`}
          className="border-border/70 hover:bg-muted/40 -mx-2 -mt-2 flex flex-col gap-2 rounded-xl border-b px-2 pt-2 pb-4 text-left transition-colors disabled:opacity-60"
        >
          <span className="flex items-center justify-between gap-3">
            <span className="font-bold">
              Soal {current + 1} dari {total}
            </span>
            <span className="text-primary flex items-center gap-1 text-sm font-bold">
              Soal <LayoutGridIcon className="size-3.5" />
            </span>
          </span>
          <span
            role="progressbar"
            aria-label="Soal dijawab"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={answered}
            className="bg-muted block h-1.5 overflow-hidden rounded-full"
          >
            <span
              className="bg-primary block h-full rounded-full transition-all"
              style={{ width: `${total ? (answered / total) * 100 : 0}%` }}
            />
          </span>
          <span className="text-muted-foreground text-xs">
            {answered} dijawab · {total - answered} tersisa
          </span>
        </button>
      ) : null}
      {detail ? (
        <p className="text-muted-foreground text-[10px] font-black tracking-[2px] uppercase">
          {detail}
        </p>
      ) : null}
      {children}
    </StudyCard>
  );
}

// EPS-TOPIK numbers picture options ①–④.
const circledNumbers = ["①", "②", "③", "④"];

/** Holds a question's options: a list, or the 2×2 grid for picture options. */
export function AssessmentOptions({
  children,
  grid,
  multiple,
}: {
  children: ReactNode;
  grid: boolean;
  multiple: boolean;
}) {
  return (
    <div
      role={multiple ? "group" : "radiogroup"}
      className={grid ? "grid grid-cols-2 gap-3" : "flex flex-col gap-3"}
    >
      {children}
    </div>
  );
}

export function AssessmentOption({
  children,
  index,
  selected,
  multiple = false,
  disabled = false,
  correct,
  tile = false,
  onPress,
}: {
  children: ReactNode;
  index: number;
  selected: boolean;
  multiple?: boolean;
  disabled?: boolean;
  /** A picture option in the 2×2 grid (`usesPictureGrid`): badge on top, numbered ①–④. */
  tile?: boolean;
  /** Set once answers are revealed: marks the right options and the learner's wrong pick. */
  correct?: boolean;
  onPress?: () => void;
}) {
  const wrong = correct === false && selected;
  const label =
    correct === true
      ? selected
        ? "Jawaban kamu · Benar"
        : "Jawaban benar"
      : wrong
        ? "Jawaban kamu · Salah"
        : undefined;
  const emphasized = selected || correct === true;
  // Like the app: a bordered card, washed and outlined in the tone once chosen or marked.
  const content = (
    <span
      className={cn(
        "flex rounded-2xl border",
        tile ? "h-full flex-col gap-2 p-3" : "flex-row items-center gap-4 p-5",
        wrong
          ? "border-destructive bg-destructive/8"
          : emphasized
            ? "border-primary bg-primary/8"
            : "border-border bg-card",
      )}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-xl border text-sm font-black",
          wrong
            ? "border-destructive bg-destructive text-white"
            : emphasized
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-muted text-muted-foreground",
        )}
      >
        {correct === true ? (
          <CheckIcon className="size-4" strokeWidth={3} />
        ) : wrong ? (
          <XIcon className="size-4" strokeWidth={3} />
        ) : tile ? (
          (circledNumbers[index] ?? index + 1)
        ) : (
          String.fromCharCode(65 + index)
        )}
      </span>
      <span
        className={cn(
          "flex min-w-0 flex-col gap-2",
          tile ? "w-full" : "flex-1",
        )}
      >
        {label ? (
          <span
            className={cn(
              "text-xs font-bold",
              wrong ? "text-destructive" : "text-primary",
            )}
          >
            {label}
          </span>
        ) : null}
        <span className="min-w-0 text-sm">{children}</span>
      </span>
    </span>
  );
  if (!onPress) return <div>{content}</div>;
  return (
    <button
      type="button"
      role={multiple ? "checkbox" : "radio"}
      aria-checked={selected}
      disabled={disabled}
      onClick={onPress}
      className={cn(
        "w-full rounded-2xl text-left transition-opacity enabled:hover:opacity-90 enabled:active:opacity-75 disabled:cursor-default",
        tile && "h-full",
        correct === false && !selected && "opacity-60",
      )}
    >
      {content}
    </button>
  );
}

export function AssessmentFeedback({
  correct,
  children,
}: {
  correct: boolean;
  children: ReactNode;
}) {
  return (
    <StudyCard tone={correct ? "primary" : "destructive"}>
      <p
        aria-live="polite"
        className={cn(
          "text-2xl font-black",
          correct ? "text-primary" : "text-destructive",
        )}
      >
        {correct ? "Tepat sekali." : "Hampir."}
      </p>
      {children}
    </StudyCard>
  );
}

const statusLabels: Record<QuestionStatus, string> = {
  unanswered: "Belum dijawab",
  answered: "Sudah dijawab",
  correct: "Benar",
  incorrect: "Salah",
};

const toneLabels: Record<QuestionTone, string> = {
  done: "Sudah dijawab",
  wrong: "Salah",
  seen: "Dibuka, belum dijawab",
  unseen: "Belum dibuka",
};

/** Number tiles per row, like an exam answer sheet. */
const COLUMNS = 5;

/**
 * "Daftar soal": every question as a numbered tile in its status colour, the
 * current one ringed, like the app's question list. `onSelect` may refuse the
 * move (for example when the current answer could not be saved) by resolving
 * false; the dialog then stays open.
 */
export function QuestionNavigator({
  open,
  onOpenChange,
  title,
  current,
  statuses,
  seen,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  current: number;
  statuses: readonly QuestionStatus[];
  /** Questions the learner has opened; left out where it does not matter. */
  seen?: readonly boolean[];
  onSelect: (index: number) => boolean | Promise<boolean>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const answered = statuses.filter((status) => status !== "unanswered").length;
  const next = nextUnansweredQuestion(statuses, current);
  // A review grades questions; an attempt only knows answered or not.
  const graded = statuses.some(
    (status) => status === "correct" || status === "incorrect",
  );
  const legend: QuestionTone[] = graded
    ? ["done", "wrong", "unseen"]
    : seen
      ? ["done", "seen", "unseen"]
      : ["done", "unseen"];

  async function select(index: number) {
    if (busy) return;
    setBusy(true);
    setError(undefined);
    try {
      if (await onSelect(index)) onOpenChange(false);
      else
        setError(
          "Jawaban kamu belum tersimpan. Coba lagi sebelum pindah soal.",
        );
    } catch {
      setError("Soal tidak dapat dibuka. Silakan coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !busy && onOpenChange(value)}>
      <DialogContent className="max-h-[85svh] gap-5 overflow-y-auto sm:max-w-md">
        <DialogHeader className="flex-row items-start gap-3 pr-8 text-left">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <DialogTitle className="text-xl font-black">
              Daftar soal
            </DialogTitle>
            <DialogDescription className="truncate">{title}</DialogDescription>
          </div>
          <p aria-live="polite" className="pt-1 text-sm font-bold tabular-nums">
            {answered}/{statuses.length} dijawab
          </p>
        </DialogHeader>
        <ul className="flex flex-wrap gap-x-4 gap-y-2">
          {legend.map((tone) => (
            <li key={tone} className="flex items-center gap-1.5">
              <span
                className={cn(
                  "size-3 rounded-[4px] border",
                  questionToneTile[tone],
                )}
              />
              <span className="text-muted-foreground text-xs">
                {/* In a review green means right and grey not answered. */}
                {graded && tone === "done"
                  ? "Benar"
                  : graded && tone === "unseen"
                    ? "Tidak dijawab"
                    : toneLabels[tone]}
              </span>
            </li>
          ))}
        </ul>
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${COLUMNS}, minmax(0, 1fr))` }}
        >
          {statuses.map((status, index) => {
            const isCurrent = index === current;
            const tone = questionTone(status, seen?.[index] ?? false);
            return (
              <button
                key={index}
                type="button"
                disabled={busy}
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`Soal ${index + 1}, ${statusLabels[status]}${isCurrent ? ", soal saat ini" : ""}`}
                onClick={() => void select(index)}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-2xl border text-lg font-black tabular-nums transition-opacity hover:opacity-80 active:opacity-70 disabled:opacity-50",
                  questionToneTile[tone],
                  // A ring outside the tile marks where you are.
                  isCurrent &&
                    "outline-foreground outline-2 outline-offset-2 outline-solid",
                )}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}
        {next >= 0 ? (
          <Button size="lg" disabled={busy} onClick={() => void select(next)}>
            Soal belum dijawab berikutnya
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        ) : (
          <p className="text-primary text-center text-sm font-semibold">
            Semua soal sudah dijawab. Kamu masih bisa meninjaunya.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
