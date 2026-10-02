"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  EyeIcon,
  LoaderCircleIcon,
  RotateCcwIcon,
  SkipForwardIcon,
  XCircleIcon,
} from "lucide-react";

import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import { cn } from "~/lib/utils";

export type FlipCardResult = "CORRECT" | "INCORRECT" | "REVEALED";

export type FlipCardItem = {
  id: string;
  /** Shown first: the prompt the learner answers. */
  front: ReactNode;
  /** Shown after the card flips. */
  back: ReactNode;
  /** Small label above the card, for example the set and course. */
  caption?: string;
};

export type FlipCardDeckLabels = {
  answerPlaceholder?: string;
  answerLabel?: string;
  idleHint?: string;
};

/**
 * Generic flip-card practice deck.
 *
 * - `typed`: the learner types the answer, which `isCorrect` checks. They can
 *   also reveal the answer (a study-only result) or skip the card.
 * - `self`: the learner flips the card and rates their own recall.
 *
 * Results are handed to `onResult`, which must resolve before the learner can
 * move on, so callers can persist each outcome (vocabulary progress, assessment
 * events). The deck keeps no domain knowledge. Give it a new `key` to restart
 * from the first card.
 */
export function FlipCardDeck({
  cards,
  mode,
  isCorrect,
  onResult,
  onFinish,
  onRestart,
  restartLabel = "Campuran berikutnya",
  labels,
  summary = true,
}: {
  cards: readonly FlipCardItem[];
  mode: "typed" | "self";
  isCorrect?: (card: FlipCardItem, answer: string) => boolean;
  onResult?: (
    card: FlipCardItem,
    result: FlipCardResult,
    index: number,
  ) => Promise<void> | void;
  onFinish?: (stats: Record<FlipCardResult, number>) => void;
  onRestart?: () => void;
  restartLabel?: string;
  labels?: FlipCardDeckLabels;
  /** Show the built-in result card when the deck ends; hosts with their own finish screen turn it off. */
  summary?: boolean;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const finished = useRef(false);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [answer, setAnswer] = useState("");
  const [outcome, setOutcome] = useState<FlipCardResult | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [stats, setStats] = useState<Record<FlipCardResult, number>>({
    CORRECT: 0,
    INCORRECT: 0,
    REVEALED: 0,
  });

  const card = cards[index];
  const done = cards.length > 0 && index >= cards.length;

  useEffect(() => {
    if (!done || finished.current) return;
    finished.current = true;
    onFinish?.(stats);
  }, [done, onFinish, stats]);

  useEffect(() => {
    // Keep the keyboard on the input so Enter checks, then advances.
    if (mode === "typed" && card) inputRef.current?.focus();
  }, [card, mode, outcome]);

  async function record(result: FlipCardResult) {
    if (!card || saving) return;
    setOutcome(result);
    setFlipped(true);
    setSaveError(false);
    setSaving(true);
    try {
      await onResult?.(card, result, index);
      setSaved(true);
      setStats((current) => ({ ...current, [result]: current[result] + 1 }));
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }

  function advance() {
    setIndex((value) => value + 1);
    setFlipped(false);
    setAnswer("");
    setOutcome(null);
    setSaved(false);
    setSaveError(false);
  }

  function check(event?: FormEvent) {
    event?.preventDefault();
    if (!card || saving) return;
    if (outcome) {
      if (saved) advance();
      else void record(outcome);
      return;
    }
    if (!answer.trim()) return;
    void record(isCorrect?.(card, answer) ? "CORRECT" : "INCORRECT");
  }

  if (!cards.length) return null;

  if (done && !summary) return null;

  if (done) {
    const total = stats.CORRECT + stats.INCORRECT + stats.REVEALED;
    return (
      <div className="bg-card ring-foreground/10 flex flex-col items-center gap-3 rounded-2xl p-8 text-center ring-1">
        <p className="font-heading text-3xl font-medium tabular-nums">
          {stats.CORRECT} dari {Math.max(total, cards.length)} benar
        </p>
        <p className="text-muted-foreground max-w-sm text-sm">
          {stats.REVEALED > 0
            ? `${stats.REVEALED} kartu hanya dilihat, jadi XP dan streak tidak berubah untuk kartu itu.`
            : "Putaran selesai. Progres kosakata kamu sudah tersimpan."}
        </p>
        {onRestart ? (
          <Button onClick={onRestart} className="mt-2">
            <RotateCcwIcon data-icon="inline-start" />
            {restartLabel}
          </Button>
        ) : null}
      </div>
    );
  }

  if (!card) return null;

  const tint =
    outcome === "CORRECT"
      ? "ring-emerald-500/60 bg-emerald-500/5"
      : outcome === "INCORRECT"
        ? "ring-destructive/50 bg-destructive/5"
        : "ring-foreground/10 bg-card";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {card.caption ? (
          <p className="text-muted-foreground text-center text-xs font-bold tracking-[0.12em] uppercase">
            {card.caption}
          </p>
        ) : null}
        <Progress value={(index / cards.length) * 100} aria-label="Progres">
          <span className="sr-only">
            Kartu {index + 1} dari {cards.length}
          </span>
        </Progress>
        <p className="text-muted-foreground text-center text-xs tabular-nums">
          {index + 1} / {cards.length}
        </p>
      </div>

      <div className="mx-auto w-full max-w-md perspective-distant">
        <div
          className={cn(
            "relative grid min-h-64 transition-transform duration-500 transform-3d motion-reduce:transition-none",
            flipped && "rotate-y-180",
          )}
        >
          <CardFace
            className={tint}
            hidden={flipped}
            onClick={
              mode === "self" && !flipped ? () => setFlipped(true) : undefined
            }
          >
            {card.front}
          </CardFace>
          <CardFace className={cn(tint, "rotate-y-180")} hidden={!flipped}>
            {card.back}
          </CardFace>
        </div>
      </div>

      <div aria-live="polite" className="min-h-5 text-center text-sm">
        {outcome === "CORRECT" ? (
          <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2Icon className="size-4" /> Benar!
          </span>
        ) : outcome === "INCORRECT" ? (
          <span className="text-destructive inline-flex items-center gap-1.5 font-semibold">
            <XCircleIcon className="size-4" /> Belum tepat
          </span>
        ) : outcome === "REVEALED" ? (
          <span className="text-muted-foreground">
            Hanya belajar · XP dan streak tidak berubah.
          </span>
        ) : (
          <span className="text-muted-foreground">
            {labels?.idleHint ??
              (mode === "typed"
                ? "Ketik jawabannya, atau lihat jawaban untuk belajar."
                : "Ketuk kartu untuk melihat jawaban.")}
          </span>
        )}
      </div>

      {saveError ? (
        <p role="alert" className="text-destructive text-center text-sm">
          Jawaban kamu tidak dapat disimpan. Coba lagi.
        </p>
      ) : null}

      {mode === "typed" ? (
        <form
          onSubmit={check}
          className="mx-auto flex w-full max-w-md flex-col gap-3"
        >
          <label htmlFor={inputId} className="sr-only">
            {labels?.answerLabel ?? "Jawaban kamu"}
          </label>
          <input
            ref={inputRef}
            id={inputId}
            value={answer}
            onChange={(event) => {
              if (!outcome) setAnswer(event.target.value);
            }}
            readOnly={outcome !== null}
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder={
              outcome
                ? "Siap untuk kata berikutnya?"
                : (labels?.answerPlaceholder ?? "Ketik jawabannya")
            }
            className="bg-background border-input focus-visible:border-ring focus-visible:ring-ring/50 h-11 w-full rounded-full border px-5 text-center text-base outline-none focus-visible:ring-3"
          />
          <div className="flex flex-wrap justify-center gap-2">
            {outcome ? (
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <LoaderCircleIcon
                    data-icon="inline-start"
                    className="animate-spin"
                  />
                ) : null}
                {saveError ? "Coba simpan lagi" : "Lanjut"}
                {!saving && !saveError ? (
                  <ArrowRightIcon data-icon="inline-end" />
                ) : null}
              </Button>
            ) : (
              <>
                <Button type="submit" disabled={!answer.trim() || saving}>
                  Periksa
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving}
                  onClick={() => void record("REVEALED")}
                >
                  <EyeIcon data-icon="inline-start" />
                  Lihat jawaban
                </Button>
                <Button type="button" variant="ghost" onClick={advance}>
                  <SkipForwardIcon data-icon="inline-start" />
                  Lewati
                </Button>
              </>
            )}
          </div>
        </form>
      ) : (
        <div className="mx-auto flex w-full max-w-md flex-wrap justify-center gap-2">
          {!flipped ? (
            <Button onClick={() => setFlipped(true)}>Balik kartu</Button>
          ) : outcome ? (
            <Button disabled={saving} onClick={() => check()}>
              {saving ? (
                <LoaderCircleIcon
                  data-icon="inline-start"
                  className="animate-spin"
                />
              ) : null}
              {saveError ? "Coba simpan lagi" : "Lanjut"}
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => void record("INCORRECT")}
              >
                Belum ingat
              </Button>
              <Button onClick={() => void record("CORRECT")}>Ingat</Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function CardFace({
  children,
  className,
  hidden,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  hidden: boolean;
  onClick?: () => void;
}) {
  const interactive = Boolean(onClick);
  return (
    <div
      aria-hidden={hidden}
      inert={hidden}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === " " || event.key === "Enter") {
                event.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={cn(
        "col-start-1 row-start-1 flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl p-6 text-center ring-1 transition-colors backface-hidden",
        interactive && "cursor-pointer",
        className,
      )}
    >
      {children}
    </div>
  );
}
