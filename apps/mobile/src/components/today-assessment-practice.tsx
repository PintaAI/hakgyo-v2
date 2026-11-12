import type { RouterOutputs } from "@hakgyo/api";
import { useEffect, useRef, useState } from "react";
import { useSharedValue } from "react-native-reanimated";
import { AccessibilityInfo, Pressable, Text, View } from "react-native";

import { api } from "../lib/trpc";
import { userErrorMessage } from "../lib/error-message";
import { localSample } from "../lib/local-sample";
import {
  nextUnansweredQuestion,
  type QuestionStatus,
} from "../lib/question-progress";
import { useQuestionNavigator } from "../providers/QuestionNavigatorProvider";
import { NativeContentRenderer, useApiAssetResolver } from "./content-renderer";
import { Action, Card, Empty, Eyebrow } from "./learning-ui";
import { QuizNav } from "./quiz/quiz-nav";
import { QuizPager, type QuizPagerHandle } from "./quiz/quiz-pager";
import { QuizQuestion } from "./quiz/quiz-question";
import { QuizStatusDots } from "./quiz/quiz-status-dots";
import { SourceLink } from "./source-link";
import { openCourseItem } from "../lib/navigation";
import { useExplanationVisibility } from "../lib/use-explanation-visibility";
import { SymbolIcon } from "./ui/symbol-icon";
import { useAppTheme } from "../providers/AppThemeProvider";

type PracticeQuestion =
  RouterOutputs["practice"]["getAssessmentSample"]["questions"][number];
type GradeResult = RouterOutputs["practice"]["gradeAssessmentAnswer"];
type AssessmentPool = RouterOutputs["practice"]["getAssessmentSample"];
function randomSeed() {
  return Date.now() + ":" + Math.random();
}

/**
 * Home's daily question challenge: a small random set of published questions
 * from the learner's open curricula, one page per question and a summary page
 * with the retry action at the end. Swipe between them, or jump from the
 * question list and "Lanjut" (the next unanswered question). Answers are graded on the
 * server but change no score, attempt or XP.
 */
export function TodayAssessmentPractice({
  organizationId,
  pool,
}: {
  organizationId: string;
  pool: AssessmentPool;
}) {
  const [seed, setSeed] = useState(randomSeed);
  const grade = api.practice.gradeAssessmentAnswer.useMutation();
  const resolveAssetUrl = useApiAssetResolver();
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
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
  const initializedPool = useRef("");
  const gradingRequest = useRef(0);
  const inFlight = useRef(false);
  const pager = useRef<QuizPagerHandle>(null);
  /** The pager's offset in questions, for the dots above it. */
  const pagePosition = useSharedValue(0);
  const [showExplanation, setShowExplanation] = useExplanationVisibility();

  useEffect(() => {
    const questions = localSample(pool.questions, seed, 5);
    const signature = JSON.stringify([organizationId, seed, questions]);
    if (initializedPool.current === signature) return;
    initializedPool.current = signature;
    gradingRequest.current += 1;
    inFlight.current = false;
    setQuestions(questions);
    setIndex(0);
    setSeen(new Set([0]));
    setSelections({});
    setResults({});
    setFailures({});
    setPendingIndex(null);
  }, [pool.questions, seed, organizationId]);

  useEffect(
    () => () => {
      gradingRequest.current += 1;
    },
    [],
  );
  const statuses: QuestionStatus[] = questions.map((_, questionIndex) => {
    const answer = results[questionIndex];
    return answer ? (answer.correct ? "correct" : "incorrect") : "unanswered";
  });
  const answered = statuses.filter((status) => status !== "unanswered").length;
  const score = Object.values(results).filter(
    (answer) => answer.correct,
  ).length;

  /** Shows page `next` (a question, or the summary after the last one). */
  function goTo(next: number) {
    setIndex(next);
    pager.current?.scrollTo(next);
  }

  const openQuestions = useQuestionNavigator({
    title: "Soal harian",
    current: index,
    statuses,
    seen: questions.map((_, questionIndex) => seen.has(questionIndex)),
    onSelect: (next) => {
      if (inFlight.current) return false;
      goTo(next);
      return true;
    },
  });

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
    const request = ++gradingRequest.current;
    setPendingIndex(questionIndex);
    setFailures(({ [questionIndex]: _, ...rest }) => rest);
    try {
      const next = await grade.mutateAsync({
        questionId: target.questionId,
        sourceCourseItemId: target.sourceCourseItemId,
        optionIds,
      });
      if (gradingRequest.current !== request) return;
      setResults((current) => ({ ...current, [questionIndex]: next }));
    } catch (error) {
      // Keep the selection visible and offer an explicit retry.
      if (gradingRequest.current === request) {
        setFailures((current) => ({ ...current, [questionIndex]: error }));
      }
    } finally {
      if (gradingRequest.current === request) {
        inFlight.current = false;
        setPendingIndex(null);
      }
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
    goTo(next < 0 ? questions.length : next);
  }
  function newSample() {
    gradingRequest.current += 1;
    inFlight.current = false;
    setPendingIndex(null);
    setFailures({});
    setQuestions([]);
    setResults({});
    setSelections({});
    setSeed(randomSeed());
  }

  return (
    <View className="gap-4">
      {!pool.hasAvailableContent ? (
        <Empty>
          Latihan tugas muncul jika kurikulum yang terbuka memiliki soal pilihan
          yang dipublikasikan.
        </Empty>
      ) : questions.length > 0 ? (
        <>
          {/* No title or counter: the dots show where the learner is. */}
          <QuizStatusDots
            statuses={statuses}
            seen={questions.map((_, questionIndex) => seen.has(questionIndex))}
            current={index}
            position={pagePosition}
            onOpenList={openQuestions}
            disabled={pendingIndex !== null}
          />
          <QuizPager
            ref={pager}
            count={questions.length + 1}
            initialIndex={index}
            position={pagePosition}
            onIndexChange={setIndex}
            renderPage={(questionIndex) => {
              if (questionIndex === questions.length) {
                return (
                  <SummaryPage
                    answered={answered}
                    correct={score}
                    total={questions.length}
                    onRetry={newSample}
                  />
                );
              }
              const page = questions[questionIndex];
              if (!page) return null;
              const result = results[questionIndex];
              return (
                <QuestionPage
                  question={page}
                  index={questionIndex}
                  total={questions.length}
                  selected={selections[questionIndex] ?? []}
                  result={result}
                  pending={pendingIndex === questionIndex}
                  busy={pendingIndex !== null}
                  failure={failures[questionIndex]}
                  allAnswered={answered === questions.length}
                  showExplanation={showExplanation}
                  onShowExplanationChange={setShowExplanation}
                  resolveAssetUrl={resolveAssetUrl}
                  onChoose={(optionId) => chooseOption(questionIndex, optionId)}
                  onCheck={() =>
                    void checkAnswer(
                      questionIndex,
                      selections[questionIndex] ?? [],
                    )
                  }
                  onNext={() => nextQuestion(questionIndex)}
                />
              );
            }}
          />
          <QuizNav
            answered={answered}
            total={questions.length}
            onPrevious={index > 0 ? () => goTo(index - 1) : undefined}
            onNext={
              index < questions.length ? () => goTo(index + 1) : undefined
            }
            onOpenList={openQuestions}
            disabled={pendingIndex !== null}
          />
        </>
      ) : null}
    </View>
  );
}

/**
 * The last page: how the set went and the way to a new one. Reached by the
 * last question's "Lihat hasil", or by swiping on early, when it says
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
    <Card className="gap-4 p-5">
      <View className="gap-1">
        <Eyebrow size="xs">Ringkasan</Eyebrow>
        <Text className="text-2xl font-black text-foreground">
          {done
            ? `${correct} dari ${total} benar`
            : `${answered} dari ${total} dijawab`}
        </Text>
      </View>
      <Text className="text-sm leading-5 text-muted-foreground">
        {done
          ? "Latihan selesai. Nilai, percobaan, progres kurikulum, dan XP kamu tidak berubah."
          : `${correct} benar sejauh ini. Selesaikan sisa soalnya, atau coba set soal yang baru.`}
      </Text>
      <Action leadingIcon="dice.fill" onPress={onRetry}>
        Coba lagi
      </Action>
    </Card>
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
  resolveAssetUrl,
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
  resolveAssetUrl: ReturnType<typeof useApiAssetResolver>;
  onChoose: (optionId: string) => void;
  onCheck: () => void;
  onNext: () => void;
}) {
  const failed = failure !== undefined;
  // The colours of the answers say right or wrong; screen readers hear it.
  const graded = result?.correct;
  useEffect(() => {
    if (graded === undefined) return;
    AccessibilityInfo.announceForAccessibility(graded ? "Benar" : "Salah");
  }, [graded]);
  return (
    <QuizQuestion
      question={question}
      index={index}
      total={total}
      hideCounter
      selectedOptionIds={selected}
      correctOptionIds={result?.correctOptionIds}
      onChooseOption={onChoose}
      answersDisabled={!!result}
      disabled={busy}
      resolveAssetUrl={resolveAssetUrl}
    >
      {result ? (
        <>
          {result.explanation ? (
            <View className="gap-3">
              <ExplanationToggle
                open={showExplanation}
                onToggle={() => onShowExplanationChange(!showExplanation)}
              />
              {showExplanation ? (
                <NativeContentRenderer
                  content={result.explanation}
                  resolveAssetUrl={resolveAssetUrl}
                />
              ) : null}
            </View>
          ) : null}
          <Action
            onPress={onNext}
            trailingIcon={allAnswered ? undefined : "arrow.right"}
          >
            {allAnswered ? "Lihat hasil" : "Lanjut"}
          </Action>
        </>
      ) : null}
      {failed ? (
        <Text accessibilityRole="alert" className="text-sm text-destructive">
          {userErrorMessage(failure, "Jawaban tidak dapat diperiksa.")}
        </Text>
      ) : null}
      {!result && (question.type === "MULTIPLE_CHOICE" || pending || failed) ? (
        <Action
          loading={pending}
          disabled={!selected.length || (busy && !pending)}
          onPress={onCheck}
        >
          {pending
            ? "Memeriksa jawaban kamu…"
            : failed
              ? "Coba periksa lagi"
              : "Periksa jawaban"}
        </Action>
      ) : null}
      {/* Where the question comes from, as a quiet link to that tugas: last,
          after the actions, so it never reads as part of the question. */}
      <SourceLink
        title={question.assessmentTitle}
        courseTitle={question.courseTitle}
        hint="Membuka tugas asal soal ini"
        onPress={() =>
          openCourseItem({
            courseId: question.courseId,
            courseItemId: question.sourceCourseItemId,
          })
        }
      />
    </QuizQuestion>
  );
}

/**
 * "Lihat penjelasan" under a graded question: opens the explanation in
 * place. The choice is remembered, so the next questions open the same way.
 */
function ExplanationToggle({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      className="flex-row items-center gap-1.5 self-start py-1 active:opacity-60"
      hitSlop={8}
      onPress={onToggle}
    >
      <Text className="text-sm font-semibold text-primary">
        {open ? "Sembunyikan penjelasan" : "Lihat penjelasan"}
      </Text>
      <SymbolIcon
        name={open ? "chevron.up" : "chevron.down"}
        size={12}
        tintColor={colors.primary}
        weight="semibold"
      />
    </Pressable>
  );
}
