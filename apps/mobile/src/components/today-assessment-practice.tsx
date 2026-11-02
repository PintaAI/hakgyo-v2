import type { RouterOutputs } from "@hakgyo/api";
import {
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { type LayoutChangeEvent, Text, View } from "react-native";
import Animated, {
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { api } from "../lib/trpc";
import { userErrorMessage } from "../lib/error-message";
import { localSample } from "../lib/local-sample";
import {
  nextUnansweredQuestion,
  type QuestionStatus,
} from "../lib/question-progress";
import { useQuestionNavigator } from "../providers/QuestionNavigatorProvider";
import { NativeContentRenderer, useApiAssetResolver } from "./content-renderer";
import { Empty, Eyebrow, PageDots } from "./learning-ui";
import {
  AssessmentFeedback,
  AssessmentOption,
  AssessmentQuestion,
} from "./assessment-ui";
import { StudyAction, StudyGlass } from "./study-glass";
import { MarqueeText } from "./ui/marquee-text";

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
 * them, or jump from "Soal ▦" and "Soal belum dijawab berikutnya". Answers
 * are graded on the server but change no score, attempt or XP.
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
  const [selections, setSelections] = useState<Record<number, string[]>>({});
  const [results, setResults] = useState<Record<number, GradeResult>>({});
  // Several pages are mounted at once, so grading state is per question.
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);
  const [failures, setFailures] = useState<Record<number, unknown>>({});
  const [finished, setFinished] = useState(false);
  const initializedPool = useRef("");
  const gradingRequest = useRef(0);
  const inFlight = useRef(false);
  const pager = useRef<QuestionPagerHandle>(null);

  useEffect(() => {
    const questions = localSample(pool.questions, seed, 5);
    const signature = JSON.stringify([organizationId, seed, questions]);
    if (initializedPool.current === signature) return;
    initializedPool.current = signature;
    gradingRequest.current += 1;
    inFlight.current = false;
    setQuestions(questions);
    setIndex(0);
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
    title: "Tantangan Soal hari ini",
    current: index,
    statuses,
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
        <StudyGlass>
          <Text className="text-2xl font-black text-foreground">
            {score} dari {questions.length} benar
          </Text>
          <Text className="text-sm leading-5 text-muted-foreground">
            Latihan selesai. Nilai, percobaan, progres kurikulum, dan XP kamu
            tidak berubah.
          </Text>
          <StudyAction secondary onPress={openQuestions}>
            Tinjau soal
          </StudyAction>
          <StudyAction onPress={newSample}>Ambil set acak lainnya</StudyAction>
        </StudyGlass>
      ) : question ? (
        <>
          <Text className="text-center text-lg font-bold tracking-tight text-foreground">
            Tantangan Soal hari ini
          </Text>
          {/* Long assessment and curriculum names slide instead of wrapping,
              like the vocabulary deck's. */}
          <MarqueeText align="center">
            <Eyebrow size="md">
              {question.assessmentTitle} · {question.courseTitle}
            </Eyebrow>
          </MarqueeText>
          <QuestionPager
            ref={pager}
            count={questions.length}
            initialIndex={index}
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
                  answered={answered}
                  selected={selections[questionIndex] ?? []}
                  result={result}
                  pending={pendingIndex === questionIndex}
                  busy={pendingIndex !== null}
                  failure={failures[questionIndex]}
                  allAnswered={answered === questions.length}
                  resolveAssetUrl={resolveAssetUrl}
                  onOpen={openQuestions}
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
        </>
      ) : null}
    </View>
  );
}

type QuestionPagerHandle = { scrollTo: (index: number) => void };

/** Space between two question pages. */
const PAGE_GAP = 12;
/** The screen gutter the pager reaches out over, to run edge to edge. */
const PAGE_BLEED = 20;

/**
 * A horizontal pager of question pages. Pages differ in height, so the pager
 * takes the height of the page in view and blends between neighbours while
 * it is dragged, instead of reserving the tallest page's height.
 */
function QuestionPager({
  ref,
  count,
  initialIndex,
  onIndexChange,
  renderPage,
}: {
  ref: Ref<QuestionPagerHandle>;
  count: number;
  initialIndex: number;
  onIndexChange: (index: number) => void;
  renderPage: (index: number) => ReactNode;
}) {
  const [pageWidth, setPageWidth] = useState(0);
  // Pages sit a gap apart; one swipe moves a page and its gap.
  const interval = pageWidth + PAGE_GAP;
  const intervalValue = useSharedValue(interval);
  useEffect(() => {
    intervalValue.value = interval;
  }, [interval, intervalValue]);
  const list = useAnimatedRef<Animated.FlatList<number>>();
  /** Scroll offset in pages, for the dots and the height blend. */
  const position = useSharedValue(initialIndex);
  /** Measured page heights by index; 0 until a page has laid out. */
  const heights = useSharedValue<number[]>([]);
  const pages = useMemo(
    () => Array.from({ length: count }, (_, page) => page),
    [count],
  );

  useImperativeHandle(
    ref,
    () => ({
      scrollTo: (index) => {
        if (pageWidth <= 0) return;
        list.current?.scrollToOffset({
          offset: interval * index,
          animated: true,
        });
      },
    }),
    [interval, list, pageWidth],
  );

  const measureWidth = (event: LayoutChangeEvent) => {
    const nextWidth = Math.round(event.nativeEvent.layout.width);
    if (nextWidth > 0 && nextWidth !== pageWidth) setPageWidth(nextWidth);
  };

  const measurePage = useCallback(
    (index: number, height: number) => {
      heights.modify((current) => {
        "worklet";
        if (current[index] === height) return current;
        const next = current.slice();
        next[index] = height;
        return next;
      });
    },
    [heights],
  );

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      if (intervalValue.value > PAGE_GAP) {
        position.value = event.contentOffset.x / intervalValue.value;
      }
    },
  });

  // The page in view drives the title, the navigator and the next button.
  useAnimatedReaction(
    () => Math.round(position.value),
    (current, previous) => {
      if (previous !== null && current !== previous) {
        scheduleOnRN(onIndexChange, current);
      }
    },
  );

  const heightStyle = useAnimatedStyle(() => {
    const list = heights.value;
    const from = Math.max(0, Math.min(count - 1, Math.floor(position.value)));
    const to = Math.min(count - 1, from + 1);
    const progress = Math.max(0, Math.min(1, position.value - from));
    const fromHeight = list[from] || list[to] || 0;
    const toHeight = list[to] || fromHeight;
    const height = fromHeight + (toHeight - fromHeight) * progress;
    // Unmeasured: let the list size itself for the first layout.
    return height > 0 ? { height } : {};
  });

  return (
    <View className="gap-4" onLayout={measureWidth}>
      {count > 1 ? (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          className="items-center"
        >
          <PageDots count={count} position={position} />
        </View>
      ) : null}
      {pageWidth > 0 ? (
        // Edge to edge: a page slides in from the screen's edge rather than
        // being cut off at the gutter, and nothing clips its content.
        <Animated.View style={[{ marginHorizontal: -PAGE_BLEED }, heightStyle]}>
          <Animated.FlatList
            style={{ overflow: "visible" }}
            ref={list}
            data={pages}
            // Answers live in the parent: re-render the pages when it does.
            extraData={renderPage}
            horizontal
            decelerationRate="fast"
            disableIntervalMomentum
            snapToInterval={interval}
            snapToAlignment="start"
            showsHorizontalScrollIndicator={false}
            // Pages keep their own height; the gutter pads the first and last.
            contentContainerStyle={{
              alignItems: "flex-start",
              paddingHorizontal: PAGE_BLEED,
            }}
            getItemLayout={(_, index) => ({
              index,
              length: interval,
              offset: interval * index,
            })}
            initialScrollIndex={initialIndex > 0 ? initialIndex : undefined}
            // A page renders rich content and up to four option cards: keep
            // only the page in view and its neighbours mounted.
            initialNumToRender={1}
            maxToRenderPerBatch={1}
            windowSize={3}
            keyExtractor={(page) => String(page)}
            onScroll={onScroll}
            scrollEventThrottle={16}
            scrollEnabled={count > 1}
            renderItem={({ item: page }) => (
              <View
                style={{
                  width: pageWidth,
                  marginRight: page < count - 1 ? PAGE_GAP : 0,
                }}
                onLayout={(event) =>
                  measurePage(page, event.nativeEvent.layout.height)
                }
              >
                {renderPage(page)}
              </View>
            )}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

function QuestionPage({
  question,
  index,
  total,
  answered,
  selected,
  result,
  pending,
  busy,
  failure,
  allAnswered,
  resolveAssetUrl,
  onOpen,
  onChoose,
  onCheck,
  onNext,
}: {
  question: PracticeQuestion;
  index: number;
  total: number;
  answered: number;
  selected: string[];
  result: GradeResult | undefined;
  /** This question is being graded. */
  pending: boolean;
  /** Some question is being graded; answers wait until it is done. */
  busy: boolean;
  failure: unknown;
  allAnswered: boolean;
  resolveAssetUrl: ReturnType<typeof useApiAssetResolver>;
  onOpen: () => void;
  onChoose: (optionId: string) => void;
  onCheck: () => void;
  onNext: () => void;
}) {
  const multiple = question.type === "MULTIPLE_CHOICE";
  const failed = failure !== undefined;
  return (
    <View className="gap-4">
      <AssessmentQuestion
        surface="card"
        current={index}
        total={total}
        answered={answered}
        onOpen={onOpen}
        disabled={busy}
      >
        <NativeContentRenderer
          content={question.prompt}
          resolveAssetUrl={resolveAssetUrl}
        />
      </AssessmentQuestion>
      {/* Single choice checks on tap; only several answers need saying. */}
      {multiple ? (
        <Text className="text-sm font-bold text-foreground">
          Pilih semua jawaban yang benar, lalu periksa
        </Text>
      ) : null}
      <View className="gap-3">
        {question.options.map((option, optionIndex) => (
          <AssessmentOption
            surface="card"
            key={option.id}
            index={optionIndex}
            selected={selected.includes(option.id)}
            multiple={multiple}
            disabled={!!result || busy}
            correct={
              result ? result.correctOptionIds.includes(option.id) : undefined
            }
            onPress={() => onChoose(option.id)}
          >
            <NativeContentRenderer
              content={option.content}
              resolveAssetUrl={resolveAssetUrl}
            />
          </AssessmentOption>
        ))}
      </View>
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
          <StudyAction
            onPress={onNext}
            trailingIcon={allAnswered ? undefined : "arrow.right"}
          >
            {allAnswered
              ? "Lihat hasil latihan"
              : "Soal belum dijawab berikutnya"}
          </StudyAction>
        </>
      ) : null}
      {failed ? (
        <Text accessibilityRole="alert" className="text-sm text-destructive">
          {userErrorMessage(failure, "Jawaban tidak dapat diperiksa.")}
        </Text>
      ) : null}
      {!result && (multiple || pending || failed) ? (
        <StudyAction
          loading={pending}
          disabled={!selected.length || (busy && !pending)}
          onPress={onCheck}
        >
          {pending
            ? "Memeriksa jawaban kamu…"
            : failed
              ? "Coba periksa lagi"
              : "Periksa jawaban"}
        </StudyAction>
      ) : null}
    </View>
  );
}
