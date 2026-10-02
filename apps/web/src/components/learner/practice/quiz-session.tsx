"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRightIcon, LoaderCircleIcon, RotateCcwIcon } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  nextUnansweredQuestion,
  type QuestionStatus,
} from "~/lib/learner/question-progress";
import {
  AssessmentFeedback,
  AssessmentOption,
  AssessmentQuestion,
  QuestionNavigator,
  StudyCard,
} from "../assessment/assessment-ui";

export type QuizQuestionItem = {
  id: string;
  type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE";
  prompt: ReactNode;
  options: readonly { id: string; content: ReactNode }[];
  /** Small label above the question, for example the assessment and course. */
  caption?: string;
};

export type QuizGrade = {
  correct: boolean;
  correctOptionIds: readonly string[];
  explanation?: ReactNode;
};

/**
 * Generic multiple-choice quiz with instant feedback.
 *
 * Single-choice questions are graded on tap, multiple-choice ones after the
 * learner presses "Periksa jawaban". Grading is delegated to `grade` so the
 * same component serves on-demand practice, tryouts and vocabulary quizzes.
 * Give it a new `key` to restart from the first question.
 */
export function QuizSession({
  questions,
  grade,
  onFinish,
  onRestart,
  restartLabel = "Ambil set acak lainnya",
  finishNote = "Latihan selesai.",
}: {
  questions: readonly QuizQuestionItem[];
  grade: (
    question: QuizQuestionItem,
    optionIds: string[],
  ) => Promise<QuizGrade>;
  onFinish?: (score: { correct: number; total: number }) => void;
  onRestart?: () => void;
  restartLabel?: string;
  finishNote?: string;
}) {
  const request = useRef(0);
  const [index, setIndex] = useState(0);
  const [selections, setSelections] = useState<Record<number, string[]>>({});
  const [results, setResults] = useState<Record<number, QuizGrade>>({});
  const [finished, setFinished] = useState(false);
  const [navigatorOpen, setNavigatorOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(
    () => () => {
      request.current += 1;
    },
    [],
  );

  const statuses: QuestionStatus[] = questions.map((_, position) => {
    const result = results[position];
    return result ? (result.correct ? "correct" : "incorrect") : "unanswered";
  });
  const answered = statuses.filter((status) => status !== "unanswered").length;
  const score = statuses.filter((status) => status === "correct").length;

  const wasFinished = useRef(false);
  useEffect(() => {
    if (finished && !wasFinished.current) {
      onFinish?.({ correct: score, total: questions.length });
    }
    wasFinished.current = finished;
  }, [finished, onFinish, questions.length, score]);

  const question = questions[index];
  const selected = selections[index] ?? [];
  const result = results[index];

  async function check(optionIds: string[]) {
    if (!question || !optionIds.length || pending || result) return;
    const token = ++request.current;
    const position = index;
    setPending(true);
    setFailed(false);
    try {
      const graded = await grade(question, optionIds);
      if (request.current !== token) return;
      setResults((current) => ({ ...current, [position]: graded }));
    } catch {
      if (request.current === token) setFailed(true);
    } finally {
      if (request.current === token) setPending(false);
    }
  }

  function choose(optionId: string) {
    if (!question || result || pending) return;
    const next =
      question.type === "SINGLE_CHOICE"
        ? [optionId]
        : selected.includes(optionId)
          ? selected.filter((id) => id !== optionId)
          : [...selected, optionId];
    setSelections((current) => ({ ...current, [index]: next }));
    if (question.type === "SINGLE_CHOICE") void check(next);
  }

  function goTo(position: number) {
    if (pending) return;
    setIndex(position);
    setFinished(false);
    setFailed(false);
  }

  function next() {
    const target = nextUnansweredQuestion(statuses, index);
    if (target < 0) setFinished(true);
    else goTo(target);
  }

  if (!questions.length) return null;

  if (!questions.length) return null;

  const navigator = (
    <QuestionNavigator
      open={navigatorOpen}
      onOpenChange={setNavigatorOpen}
      title="Tugas hari ini"
      current={index}
      statuses={statuses}
      onSelect={(position) => {
        if (pending) return false;
        goTo(position);
        return true;
      }}
    />
  );

  if (finished) {
    return (
      <>
        <StudyCard>
          <p className="text-2xl font-black">
            {score} dari {questions.length} benar
          </p>
          <p className="text-muted-foreground text-sm leading-5">
            {finishNote}
          </p>
          <Button variant="secondary" onClick={() => setNavigatorOpen(true)}>
            Tinjau soal
          </Button>
          {onRestart ? (
            <Button onClick={onRestart}>
              <RotateCcwIcon data-icon="inline-start" />
              {restartLabel}
            </Button>
          ) : null}
        </StudyCard>
        {navigator}
      </>
    );
  }

  if (!question) return null;

  return (
    <div className="flex flex-col gap-4">
      {question.caption ? (
        <p className="text-muted-foreground text-xs font-bold tracking-[1.2px] uppercase">
          {question.caption}
        </p>
      ) : null}
      <AssessmentQuestion
        current={index}
        total={questions.length}
        answered={answered}
        onOpen={() => setNavigatorOpen(true)}
        disabled={pending}
      >
        {question.prompt}
      </AssessmentQuestion>

      <p className="text-sm font-bold">
        {question.type === "MULTIPLE_CHOICE"
          ? "Pilih semua jawaban yang benar, lalu periksa"
          : "Ketuk jawaban untuk memeriksanya"}
      </p>

      <div className="flex flex-col gap-3">
        {question.options.map((option, optionIndex) => (
          <AssessmentOption
            key={option.id}
            index={optionIndex}
            selected={selected.includes(option.id)}
            multiple={question.type === "MULTIPLE_CHOICE"}
            disabled={Boolean(result) || pending}
            correct={
              result ? result.correctOptionIds.includes(option.id) : undefined
            }
            onPress={() => choose(option.id)}
          >
            {option.content}
          </AssessmentOption>
        ))}
      </div>

      {result ? (
        <>
          <AssessmentFeedback correct={result.correct}>
            {result.explanation ?? (
              <p className="text-muted-foreground text-sm">
                Jawaban yang benar ditandai di atas.
              </p>
            )}
          </AssessmentFeedback>
          <Button size="lg" onClick={next}>
            {answered === questions.length
              ? "Lihat hasil latihan"
              : "Soal belum dijawab berikutnya"}
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        </>
      ) : null}

      {failed ? (
        <p role="alert" className="text-destructive text-sm">
          Jawaban belum bisa diperiksa. Coba lagi.
        </p>
      ) : null}

      {!result && (question.type === "MULTIPLE_CHOICE" || pending || failed) ? (
        <Button
          size="lg"
          disabled={!selected.length || pending}
          onClick={() => void check(selected)}
        >
          {pending ? (
            <LoaderCircleIcon
              data-icon="inline-start"
              className="animate-spin"
            />
          ) : null}
          {pending
            ? "Memeriksa jawaban kamu…"
            : failed
              ? "Coba periksa lagi"
              : "Periksa jawaban"}
        </Button>
      ) : null}
      {navigator}
    </div>
  );
}
