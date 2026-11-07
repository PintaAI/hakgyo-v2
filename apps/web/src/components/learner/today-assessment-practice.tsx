"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  ArrowRightIcon,
  ChevronRightIcon,
  DicesIcon,
  LoaderCircleIcon,
} from "lucide-react";

import Link from "~/components/link";
import { Button } from "~/components/ui/button";
import { Switch } from "~/components/ui/switch";
import {
  randomSeed,
  TODAY_ASSESSMENT_QUESTION_COUNT,
} from "~/lib/learner/practice";
import {
  nextUnansweredQuestion,
  type QuestionStatus,
} from "~/lib/learner/question-progress";
import { api, type RouterOutputs } from "~/trpc/react";
import {
  AssessmentFeedback,
  QuestionNavigator,
  StudyCard,
} from "./assessment/assessment-ui";
import { Eyebrow } from "./eyebrow";
import { RichContent } from "./practice/rich-content";
import { QuizNav } from "./quiz/quiz-nav";
import { QuizPager } from "./quiz/quiz-pager";
import { QuizQuestion } from "./quiz/quiz-question";
import { QuizStatusDots } from "./quiz/quiz-status-dots";
import { QuestionSkeleton } from "./skeletons";
import { useRoundSeed } from "./use-round-seed";

type PracticeQuestion =
  RouterOutputs["practice"]["getAssessmentSample"]["questions"][number];
type GradeResult = RouterOutputs["practice"]["gradeAssessmentAnswer"];

const EXPLANATIONS_HIDDEN_KEY = "hakgyo.explanations.hidden";

const explanationListeners = new Set<() => void>();

function subscribeToExplanations(listener: () => void) {
  explanationListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    explanationListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function explanationsVisible() {
  try {
    return window.localStorage.getItem(EXPLANATIONS_HIDDEN_KEY) !== "1";
  } catch {
    return true;
  }
}

/**
 * Whether answer explanations show after an answer, kept in the browser like
 * the app keeps it on the device. Shown until the learner hides them.
 */
function useExplanationVisibility() {
  const visible = useSyncExternalStore(
    subscribeToExplanations,
    explanationsVisible,
    () => true,
  );
  function setVisible(next: boolean) {
    try {
      if (next) window.localStorage.removeItem(EXPLANATIONS_HIDDEN_KEY);
      else window.localStorage.setItem(EXPLANATIONS_HIDDEN_KEY, "1");
    } catch {
      // The display preference is optional.
    }
    explanationListeners.forEach((listener) => listener());
  }
  return [visible, setVisible] as const;
}

/** `initialSeed` lets the page prefetch the first sample on the server. */
export function TodayAssessmentPractice({
  initialSeed,
}: {
  initialSeed: string;
}) {
  const [seed, setSeed] = useRoundSeed(initialSeed);
  // The sample must not swap while the learner is answering it.
  const pool = api.practice.getAssessmentSample.useQuery(
    { seed, limit: TODAY_ASSESSMENT_QUESTION_COUNT },
    { staleTime: Infinity, refetchOnWindowFocus: false },
  );

  return (
    <section aria-labelledby="today-assessment" className="flex flex-col gap-4">
      <h2
        id="today-assessment"
        className="text-center text-lg font-bold tracking-tight"
      >
        Soal harian
      </h2>
      {pool.isPending ? (
        <QuestionSkeleton />
      ) : pool.isError ? (
        <p role="alert" className="text-destructive text-sm">
          Latihan tugas belum bisa dimuat.{" "}
          <button
            type="button"
            className="underline"
            onClick={() => void pool.refetch()}
          >
            Coba lagi
          </button>
        </p>
      ) : !pool.data.hasAvailableContent || !pool.data.questions.length ? (
        <p className="text-muted-foreground bg-muted/50 rounded-xl p-4 text-sm">
          Latihan tugas muncul jika kurikulum yang terbuka memiliki soal pilihan
          yang dipublikasikan.
        </p>
      ) : (
        <DailyQuestions
          key={seed}
          questions={pool.data.questions}
          onRetry={() => setSeed(randomSeed())}
        />
      )}
    </section>
  );
}

/**
 * Home's daily questions, like the app's: one page per question and a summary
 * page with the retry action at the end. Swipe between them (or use the
 * buttons), or jump from the question list and "Soal belum dijawab
 * berikutnya". Answers are graded on the server but change no score, attempt
 * or XP.
 */
function DailyQuestions({
  questions,
  onRetry,
}: {
  questions: readonly PracticeQuestion[];
  onRetry: () => void;
}) {
  const grade = api.practice.gradeAssessmentAnswer.useMutation();
  const [index, setIndex] = useState(0);
  // Questions the learner has had in view, for the dots.
  const [seen, setSeen] = useState<ReadonlySet<number>>(() => new Set([0]));
  useEffect(() => {
    setSeen((current) =>
      current.has(index) ? current : new Set(current).add(index),
    );
  }, [index]);
  const [selections, setSelections] = useState<Record<number, string[]>>({});
  const [results, setResults] = useState<Record<number, GradeResult>>({});
  // Several pages are mounted at once, so grading state is per question.
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);
  const [failures, setFailures] = useState<Record<number, unknown>>({});
  const [navigatorOpen, setNavigatorOpen] = useState(false);
  const inFlight = useRef(false);
  const [showExplanation, setShowExplanation] = useExplanationVisibility();

  const statuses: QuestionStatus[] = questions.map((_, questionIndex) => {
    const answer = results[questionIndex];
    return answer ? (answer.correct ? "correct" : "incorrect") : "unanswered";
  });
  const answered = statuses.filter((status) => status !== "unanswered").length;
  const score = Object.values(results).filter(
    (answer) => answer.correct,
  ).length;
  const seenList = questions.map((_, questionIndex) => seen.has(questionIndex));

  async function checkAnswer(questionIndex: number, optionIds: string[]) {
    const target = questions[questionIndex];
    if (
      !target ||
      !optionIds.length ||
      inFlight.current ||
      results[questionIndex]
    ) {
      return;
    }
    inFlight.current = true;
    setPendingIndex(questionIndex);
    setFailures(({ [questionIndex]: _, ...rest }) => rest);
    try {
      const next = await grade.mutateAsync({
        questionId: target.questionId,
        sourceCourseItemId: target.sourceCourseItemId,
        optionIds,
      });
      setResults((current) => ({ ...current, [questionIndex]: next }));
    } catch (error) {
      // Keep the selection visible and offer an explicit retry.
      setFailures((current) => ({ ...current, [questionIndex]: error }));
    } finally {
      inFlight.current = false;
      setPendingIndex(null);
    }
  }
  function chooseOption(questionIndex: number, optionId: string) {
    const target = questions[questionIndex];
    if (!target || results[questionIndex] || inFlight.current) return;
    const selected = selections[questionIndex] ?? [];
    const next =
      target.type === "SINGLE_CHOICE"
        ? [optionId]
        : selected.includes(optionId)
          ? selected.filter((id) => id !== optionId)
          : [...selected, optionId];
    setSelections((current) => ({ ...current, [questionIndex]: next }));
    if (target.type === "SINGLE_CHOICE") void checkAnswer(questionIndex, next);
  }
  function nextQuestion(questionIndex: number) {
    const next = nextUnansweredQuestion(statuses, questionIndex);
    setIndex(next < 0 ? questions.length : next);
  }

  return (
    <>
      <QuizStatusDots
        statuses={statuses}
        seen={seenList}
        current={index}
        onOpenList={() => setNavigatorOpen(true)}
        disabled={pendingIndex !== null}
      />
      <QuizPager
        count={questions.length + 1}
        index={index}
        onIndexChange={setIndex}
        renderPage={(questionIndex) => {
          if (questionIndex === questions.length) {
            return (
              <SummaryPage
                answered={answered}
                correct={score}
                total={questions.length}
                onRetry={onRetry}
              />
            );
          }
          const page = questions[questionIndex];
          if (!page) return null;
          return (
            <QuestionPage
              question={page}
              index={questionIndex}
              total={questions.length}
              selected={selections[questionIndex] ?? []}
              result={results[questionIndex]}
              pending={pendingIndex === questionIndex}
              busy={pendingIndex !== null}
              failure={failures[questionIndex]}
              allAnswered={answered === questions.length}
              showExplanation={showExplanation}
              onShowExplanationChange={setShowExplanation}
              onChoose={(optionId) => chooseOption(questionIndex, optionId)}
              onCheck={() =>
                void checkAnswer(questionIndex, selections[questionIndex] ?? [])
              }
              onNext={() => nextQuestion(questionIndex)}
            />
          );
        }}
      />
      <QuizNav
        answered={answered}
        total={questions.length}
        onPrevious={index > 0 ? () => setIndex(index - 1) : undefined}
        onNext={
          index < questions.length ? () => setIndex(index + 1) : undefined
        }
        onOpenList={() => setNavigatorOpen(true)}
        disabled={pendingIndex !== null}
      />
      <QuestionNavigator
        open={navigatorOpen}
        onOpenChange={setNavigatorOpen}
        title="Soal harian"
        current={Math.min(index, questions.length - 1)}
        statuses={statuses}
        seen={seenList}
        onSelect={(next) => {
          if (inFlight.current) return false;
          setIndex(next);
          return true;
        }}
      />
    </>
  );
}

/**
 * The last page: how the set went and the way to a new one. Reached by the
 * last question's "Lihat hasil latihan", or by moving on early, when it says
 * how many questions are left.
 */
function SummaryPage({
  answered,
  correct,
  total,
  onRetry,
}: {
  answered: number;
  correct: number;
  total: number;
  onRetry: () => void;
}) {
  const done = answered === total;
  return (
    <StudyCard className="rounded-2xl">
      <div className="flex flex-col gap-1">
        <Eyebrow size="xs">Ringkasan</Eyebrow>
        <p className="text-2xl font-black">
          {done
            ? `${correct} dari ${total} benar`
            : `${answered} dari ${total} dijawab`}
        </p>
      </div>
      <p className="text-muted-foreground text-sm leading-5">
        {done
          ? "Latihan selesai. Nilai, percobaan, progres kurikulum, dan XP kamu tidak berubah."
          : `${correct} benar sejauh ini. Selesaikan sisa soalnya, atau coba set soal yang baru.`}
      </p>
      <Button size="lg" onClick={onRetry}>
        <DicesIcon data-icon="inline-start" />
        Coba lagi
      </Button>
    </StudyCard>
  );
}

function QuestionPage({
  question,
  index,
  total,
  selected,
  result,
  pending,
  busy,
  failure,
  allAnswered,
  showExplanation,
  onShowExplanationChange,
  onChoose,
  onCheck,
  onNext,
}: {
  question: PracticeQuestion;
  index: number;
  total: number;
  selected: string[];
  result: GradeResult | undefined;
  /** This question is being graded. */
  pending: boolean;
  /** Some question is being graded; answers wait until it is done. */
  busy: boolean;
  failure: unknown;
  allAnswered: boolean;
  /** The saved preference: explanations show after an answer. */
  showExplanation: boolean;
  onShowExplanationChange: (show: boolean) => void;
  onChoose: (optionId: string) => void;
  onCheck: () => void;
  onNext: () => void;
}) {
  const failed = failure !== undefined;
  return (
    <QuizQuestion
      question={question}
      index={index}
      total={total}
      selectedOptionIds={selected}
      correctOptionIds={result?.correctOptionIds}
      onChooseOption={onChoose}
      answersDisabled={!!result}
      disabled={busy}
    >
      {result ? (
        <>
          <AssessmentFeedback correct={result.correct}>
            {result.explanation ? (
              <>
                <label className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold">
                    Tampilkan penjelasan
                  </span>
                  <Switch
                    checked={showExplanation}
                    onCheckedChange={onShowExplanationChange}
                  />
                </label>
                {showExplanation ? (
                  <RichContent content={result.explanation} />
                ) : null}
              </>
            ) : (
              <p className="text-muted-foreground text-sm">
                Jawaban yang benar ditandai di atas.
              </p>
            )}
          </AssessmentFeedback>
          <Button size="lg" onClick={onNext}>
            {allAnswered
              ? "Lihat hasil latihan"
              : "Soal belum dijawab berikutnya"}
            {allAnswered ? null : <ArrowRightIcon data-icon="inline-end" />}
          </Button>
        </>
      ) : null}
      {failed ? (
        <p role="alert" className="text-destructive text-sm">
          {failure instanceof Error && failure.message
            ? failure.message
            : "Jawaban tidak dapat diperiksa."}
        </p>
      ) : null}
      {!result && (question.type === "MULTIPLE_CHOICE" || pending || failed) ? (
        <Button
          size="lg"
          disabled={!selected.length || (busy && !pending) || pending}
          onClick={onCheck}
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
      {/* Where the question comes from, as a quiet link to that tugas. */}
      <Link
        href={`/learn/${question.courseId}/items/${question.sourceCourseItemId}`}
        aria-label={`Dari ${question.assessmentTitle}, ${question.courseTitle}. Membuka tugas asal soal ini`}
        className="text-muted-foreground flex max-w-full items-center gap-1 self-start text-xs hover:opacity-80"
      >
        <span className="truncate">
          Dari{" "}
          <span className="text-primary font-semibold">
            {question.assessmentTitle}
          </span>{" "}
          · {question.courseTitle}
        </span>
        <ChevronRightIcon className="text-primary size-3 shrink-0" />
      </Link>
    </QuizQuestion>
  );
}
