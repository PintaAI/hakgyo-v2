import type { RouterOutputs } from "@hakgyo/api";
import { useEffect, useRef, useState } from "react";
import { useSharedValue } from "react-native-reanimated";
import { Pressable, Text, View } from "react-native";

import { api } from "../lib/trpc";
import { userErrorMessage } from "../lib/error-message";
import { localSample } from "../lib/local-sample";
import {
  nextUnansweredQuestion,
  type QuestionStatus,
} from "../lib/question-progress";
import { useQuestionNavigator } from "../providers/QuestionNavigatorProvider";
import { NativeContentRenderer, useApiAssetResolver } from "./content-renderer";
import { Action, Card, Empty, PageDots } from "./learning-ui";
import { AssessmentFeedback } from "./assessment-ui";
import { QuizNav } from "./quiz/quiz-nav";
import { QuizPager, type QuizPagerHandle } from "./quiz/quiz-pager";
import { QuizQuestion } from "./quiz/quiz-question";
import { openCourseItem } from "../lib/navigation";
import { useAppTheme } from "../providers/AppThemeProvider";
import { questionTone, questionToneColor } from "../lib/question-colors";
import { SymbolIcon } from "./ui/symbol-icon";

type PracticeQuestion =
  RouterOutputs["practice"]["getAssessmentSample"]["questions"][number];
type GradeResult = RouterOutputs["practice"]["gradeAssessmentAnswer"];
type AssessmentPool = RouterOutputs["practice"]["getAssessmentSample"];
function randomSeed() {
  return Date.now() + ":" + Math.random();
}

/**
 * Home's daily question challenge: a small random set of published questions
 * from the learner's open curricula, one page per question. Swipe between
 * them, or jump from the question list and "Soal belum dijawab berikutnya". Answers
 * are graded on the server but change no score, attempt or XP.
 */
export function TodayAssessmentPractice({
  organizationId,
  pool,
}: {
  organizationId: string;
  pool: AssessmentPool;
}) {
  const { colors } = useAppTheme();
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
  const [finished, setFinished] = useState(false);
  const initializedPool = useRef("");
  const gradingRequest = useRef(0);
  const inFlight = useRef(false);
  const pager = useRef<QuizPagerHandle>(null);
  /** The pager's offset in questions, for the dots above it. */
  const pagePosition = useSharedValue(0);

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
    setFinished(false);
  }, [pool.questions, seed, organizationId]);

  useEffect(
    () => () => {
      gradingRequest.current += 1;
    },
    [],
  );
  const question = questions[index];
  const statuses: QuestionStatus[] = questions.map((_, questionIndex) => {
    const answer = results[questionIndex];
    return answer ? (answer.correct ? "correct" : "incorrect") : "unanswered";
  });
  const answered = statuses.filter((status) => status !== "unanswered").length;
  const score = Object.values(results).filter(
    (answer) => answer.correct,
  ).length;

  /** Shows question `next`: slides the pager there, or opens it there. */
  function goTo(next: number) {
    setFinished(false);
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
    if (next < 0) setFinished(true);
    else goTo(next);
  }
  function newSample() {
    gradingRequest.current += 1;
    inFlight.current = false;
    setPendingIndex(null);
    setFailures({});
    setQuestions([]);
    setResults({});
    setSelections({});
    setFinished(false);
    setSeed(randomSeed());
  }

  return (
    <View className="gap-4">
      {!pool.hasAvailableContent ? (
        <Empty>
          Latihan tugas muncul jika kurikulum yang terbuka memiliki soal pilihan
          yang dipublikasikan.
        </Empty>
      ) : finished ? (
        <Card className="gap-4 p-5">
          <Text className="text-2xl font-black text-foreground">
            {score} dari {questions.length} benar
          </Text>
          <Text className="text-sm leading-5 text-muted-foreground">
            Latihan selesai. Nilai, percobaan, progres kurikulum, dan XP kamu
            tidak berubah.
          </Text>
          <Action variant="secondary" onPress={openQuestions}>
            Tinjau soal
          </Action>
          <Action onPress={newSample}>Ambil set acak lainnya</Action>
        </Card>
      ) : question ? (
        <>
          <Text className="text-center text-lg font-bold tracking-tight text-foreground">
            Soal harian
          </Text>
          {/* Five questions fit as dots, which also say they can be swiped;
              a tap opens the question list. Longer sets (the attempt) rely
              on the question number. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Daftar soal, ${answered} dari ${questions.length} dijawab`}
            accessibilityHint="Buka daftar untuk pindah ke soal mana pun"
            accessibilityState={{ disabled: pendingIndex !== null }}
            disabled={pendingIndex !== null}
            hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
            onPress={openQuestions}
            className="items-center self-center active:opacity-60"
          >
            <PageDots
              count={questions.length}
              position={pagePosition}
              colors={statuses.map((status, questionIndex) =>
                questionToneColor(
                  questionTone(status, seen.has(questionIndex)),
                  colors,
                ),
              )}
            />
          </Pressable>
          <QuizPager
            ref={pager}
            count={questions.length}
            initialIndex={index}
            position={pagePosition}
            onIndexChange={setIndex}
            renderPage={(questionIndex) => {
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
              index < questions.length - 1 ? () => goTo(index + 1) : undefined
            }
            onOpenList={openQuestions}
            disabled={pendingIndex !== null}
          />
        </>
      ) : null}
    </View>
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
  resolveAssetUrl: ReturnType<typeof useApiAssetResolver>;
  onChoose: (optionId: string) => void;
  onCheck: () => void;
  onNext: () => void;
}) {
  const { colors } = useAppTheme();
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
      resolveAssetUrl={resolveAssetUrl}
    >
      {result ? (
        <>
          <AssessmentFeedback correct={result.correct}>
            {result.explanation ? (
              <NativeContentRenderer
                content={result.explanation}
                resolveAssetUrl={resolveAssetUrl}
              />
            ) : (
              <Text className="text-sm text-muted-foreground">
                Jawaban yang benar ditandai di atas.
              </Text>
            )}
          </AssessmentFeedback>
          <Action
            onPress={onNext}
            trailingIcon={allAnswered ? undefined : "arrow.right"}
          >
            {allAnswered
              ? "Lihat hasil latihan"
              : "Soal belum dijawab berikutnya"}
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
      {/* Where the question comes from, as a quiet link to that tugas. */}
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`Soal dari ${question.assessmentTitle}, ${question.courseTitle}`}
        accessibilityHint="Membuka tugas asal soal ini"
        hitSlop={8}
        onPress={() =>
          openCourseItem({
            courseId: question.courseId,
            courseItemId: question.sourceCourseItemId,
          })
        }
        className="flex-row items-center gap-1 self-start active:opacity-60"
      >
        <Text
          className="shrink text-xs text-muted-foreground"
          numberOfLines={1}
        >
          Dari{" "}
          <Text className="font-semibold text-primary">
            {question.assessmentTitle}
          </Text>{" "}
          · {question.courseTitle}
        </Text>
        <SymbolIcon name="chevron.right" size={12} tintColor={colors.primary} />
      </Pressable>
    </QuizQuestion>
  );
}
