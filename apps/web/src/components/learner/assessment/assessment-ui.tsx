"use client";

import { useState, type ReactNode } from "react";
import { LayoutGridIcon } from "lucide-react";

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

export function AssessmentOption({
  children,
  index,
  selected,
  multiple = false,
  disabled = false,
  correct,
  onPress,
}: {
  children: ReactNode;
  index: number;
  selected: boolean;
  multiple?: boolean;
  disabled?: boolean;
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
  const content = (
    <StudyCard
      tone={wrong ? "destructive" : "primary"}
      emphasized={selected || correct === true}
      className="flex-row items-center gap-4 p-4"
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-xl border text-sm font-black",
          wrong
            ? "border-destructive bg-destructive text-white"
            : selected || correct === true
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-muted text-muted-foreground",
        )}
      >
        {correct === true ? "✓" : wrong ? "×" : String.fromCharCode(65 + index)}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-2">
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
    </StudyCard>
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
        "w-full rounded-[20px] text-left transition-opacity enabled:hover:opacity-90 disabled:cursor-default",
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

/**
 * "Soal" overview: every question with its status. `onSelect` may refuse the
 * move (for example when the current answer could not be saved) by resolving
 * false; the dialog then stays open.
 */
export function QuestionNavigator({
  open,
  onOpenChange,
  title,
  current,
  statuses,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  current: number;
  statuses: readonly QuestionStatus[];
  onSelect: (index: number) => boolean | Promise<boolean>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const answered = statuses.filter((status) => status !== "unanswered").length;
  const next = nextUnansweredQuestion(statuses, current);

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
      <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black">Soal</DialogTitle>
          <DialogDescription>{title}</DialogDescription>
        </DialogHeader>
        <p aria-live="polite" className="text-muted-foreground text-sm">
          {answered} dari {statuses.length} dijawab · Klik soal untuk membukanya
        </p>
        {next >= 0 ? (
          <Button disabled={busy} onClick={() => void select(next)}>
            Soal belum dijawab berikutnya →
          </Button>
        ) : (
          <p className="text-primary font-bold">
            Semua soal sudah dijawab. Kamu masih bisa meninjaunya.
          </p>
        )}
        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}
        <div className="grid grid-cols-3 gap-3">
          {statuses.map((status, index) => (
            <button
              key={index}
              type="button"
              disabled={busy}
              aria-current={index === current ? "step" : undefined}
              aria-label={`Soal ${index + 1}, ${statusLabels[status]}${index === current ? ", soal saat ini" : ""}`}
              onClick={() => void select(index)}
              className={cn(
                "flex min-h-24 flex-col items-center justify-center gap-1 rounded-2xl border p-3 transition-opacity hover:opacity-80 disabled:opacity-50",
                index === current
                  ? "border-primary bg-primary/20"
                  : status === "incorrect"
                    ? "border-destructive/50 bg-destructive/10"
                    : status !== "unanswered"
                      ? "border-primary/40 bg-primary/10"
                      : "border-border bg-card",
              )}
            >
              <span className="text-xl font-black">
                {index + 1}
                {status === "correct" || status === "answered"
                  ? " ✓"
                  : status === "incorrect"
                    ? " ×"
                    : ""}
              </span>
              <span className="text-muted-foreground text-xs">
                {statusLabels[status]}
              </span>
              {index === current ? (
                <span className="text-primary text-xs font-bold">Saat ini</span>
              ) : null}
            </button>
          ))}
        </div>
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => onOpenChange(false)}
        >
          Selesai
        </Button>
      </DialogContent>
    </Dialog>
  );
}
