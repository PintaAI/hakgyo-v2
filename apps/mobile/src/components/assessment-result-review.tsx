import { formatScoreOutOf, groupRanges } from "@hakgyo/shared";
import type { RouterOutputs } from "@hakgyo/api";
import { useRef, useState } from "react";
import { Text, View } from "react-native";
import {
  NativeContentRenderer,
  type AssetUrlResolver,
} from "./content-renderer";
import { assessmentResultPolicy } from "../lib/assessment-state";
import {
  isQuestionAnswered,
  type QuestionStatus,
} from "../lib/question-progress";
import { useQuestionNavigator } from "../providers/QuestionNavigatorProvider";
import { Card, Eyebrow } from "./learning-ui";
import { QuizNav } from "./quiz/quiz-nav";
import { QuizPager, type QuizPagerHandle } from "./quiz/quiz-pager";
import { QuizQuestion } from "./quiz/quiz-question";
import { QuizStatusDots } from "./quiz/quiz-status-dots";
import { useSharedValue } from "react-native-reanimated";

type Assessment = RouterOutputs["assessment"]["getForCourseItem"];
type Attempt = RouterOutputs["assessment"]["getMyAttempt"];

export function AssessmentResultReview({
  assessment,
  attempt,
  resolveAssetUrl,
  onQuestionChange,
  initialIndex = 0,
}: {
  assessment: Assessment;
  attempt: Attempt;
  resolveAssetUrl: AssetUrlResolver;
  onQuestionChange?: () => void;
  /** The question to open at (from a preview of it). */
  initialIndex?: number;
}) {
  const [index, setIndex] = useState(() =>
    Math.min(Math.max(0, initialIndex), assessment.questions.length - 1),
  );
  const pager = useRef<QuizPagerHandle>(null);
  /** The pager's offset in questions, for the status dots. */
  const pagePosition = useSharedValue(index);
  /** A swipe already moved the pager; buttons and the list move it here. */
  function goToQuestion(next: number, swiped = false) {
    setIndex(next);
    if (!swiped) pager.current?.scrollTo(next);
    onQuestionChange?.();
  }
  const policy = assessmentResultPolicy(assessment.event?.type);
  const statuses = reviewStatuses(assessment, attempt);
  const openQuestions = useQuestionNavigator({
    title: "Pembahasan · " + assessment.title,
    current: index,
    statuses,
    onSelect: (next) => {
      goToQuestion(next);
      return true;
    },
  });
  if (attempt.status !== "GRADED") return null;
  if (!policy.showAnswerReview)
    return (
      <Card className="gap-4 p-5">
        <Text className="font-bold text-foreground">Tryout hanya skor</Text>
        <Text className="text-sm leading-5 text-muted-foreground">
          Hasil tryout berisi skor akhir dan leaderboard. Kunci jawaban dan
          pembahasan tidak dipublikasikan.
        </Text>
      </Card>
    );
  if (!assessment.answersRevealed)
    return (
      <Card className="gap-4 p-5">
        <Text className="font-bold text-foreground">
          Review jawaban belum tersedia
        </Text>
        <Text className="text-sm leading-5 text-muted-foreground">
          Kunci jawaban dan pembahasan tersedia setelah latihan ini ditutup.
        </Text>
      </Card>
    );

  function renderPage(position: number) {
    return (
      <ReviewQuestion
        assessment={assessment}
        attempt={attempt}
        position={position}
        statuses={statuses}
        resolveAssetUrl={resolveAssetUrl}
      />
    );
  }

  return (
    <View className="gap-4">
      <Text className="text-xl font-black text-foreground">
        Review jawaban kamu
      </Text>
      <QuizStatusDots
        statuses={statuses}
        current={index}
        position={pagePosition}
        onOpenList={openQuestions}
      />
      <QuizPager
        ref={pager}
        position={pagePosition}
        count={assessment.questions.length}
        initialIndex={index}
        onIndexChange={(next) => goToQuestion(next, true)}
        renderPage={renderPage}
      />
      <QuizNav
        answered={statuses.filter((status) => status !== "unanswered").length}
        total={assessment.questions.length}
        onPrevious={index > 0 ? () => goToQuestion(index - 1) : undefined}
        onNext={
          index < assessment.questions.length - 1
            ? () => goToQuestion(index + 1)
            : undefined
        }
        onOpenList={openQuestions}
      />
    </View>
  );
}

/** Whether the answer review is open for this attempt. */
export function reviewAvailable(assessment: Assessment, attempt: Attempt) {
  return (
    attempt.status === "GRADED" &&
    assessmentResultPolicy(assessment.event?.type).showAnswerReview &&
    assessment.answersRevealed
  );
}

/**
 * Each question's outcome in a graded attempt; empty while the review is
 * closed.
 */
export function reviewStatuses(
  assessment: Assessment,
  attempt: Attempt,
): QuestionStatus[] {
  const available = reviewAvailable(assessment, attempt);
  return available
    ? assessment.questions.map((question) => {
        const answer = attempt.answers.find(
          (candidate) => candidate.questionId === question.id,
        );
        const optionIds =
          answer?.selectedOptions.map((selection) => selection.optionId) ?? [];
        if (
          !isQuestionAnswered({
            content:
              typeof answer?.content === "string" ? answer.content : undefined,
            optionIds,
          })
        )
          return "unanswered";
        if (question.type === "WRITTEN") return "answered";
        const correct = question.options.filter((option) => option.isCorrect);
        return optionIds.length === correct.length &&
          correct.every((option) => optionIds.includes(option.id))
          ? "correct"
          : "incorrect";
      })
    : [];
}

/**
 * One question of a graded attempt as the learner answered it, marked right
 * or wrong, with the teacher's feedback and the explanation unless `brief`.
 */
export function ReviewQuestion({
  assessment,
  attempt,
  position,
  statuses,
  resolveAssetUrl,
  brief = false,
}: {
  assessment: Assessment;
  attempt: Attempt;
  position: number;
  statuses: QuestionStatus[];
  resolveAssetUrl: AssetUrlResolver;
  /** Only the question and the answers (a preview). */
  brief?: boolean;
}) {
  const ranges = groupRanges(assessment.questions);
  const question = assessment.questions[position];
  if (!question) return null;
  const answer = attempt.answers.find(
    (candidate) => candidate.questionId === question.id,
  );
  const writtenScore =
    answer && "manualScore" in answer
      ? (answer.manualScore ??
        ("autoScore" in answer ? answer.autoScore : null))
      : null;
  // Scores arrive as plain numbers; the payload type widens them through the "in" checks.
  const writtenScoreValue =
    typeof writtenScore === "number" ? writtenScore : null;
  const feedback = answer && "feedback" in answer ? answer.feedback : null;
  const group = question.groupId
    ? assessment.groups.find(({ id }) => id === question.groupId)
    : undefined;
  const range = question.groupId ? ranges.get(question.groupId) : undefined;
  return (
    <QuizQuestion
      question={question}
      index={position}
      total={assessment.questions.length}
      detail={
        question.type === "WRITTEN"
          ? writtenScoreValue !== null
            ? `${formatScoreOutOf(writtenScoreValue, question.points, " / ")} pt`
            : "Sudah direview"
          : statuses[position] === "correct"
            ? "Benar"
            : statuses[position] === "unanswered"
              ? "Tidak dijawab"
              : "Salah"
      }
      group={
        group && range
          ? {
              instructions: group.instructions,
              stimulus: group.stimulus,
              first: range.first,
              last: range.last,
            }
          : null
      }
      selectedOptionIds={
        answer?.selectedOptions.map((selection) => selection.optionId) ?? []
      }
      correctOptionIds={question.options
        .filter((option) => option.isCorrect === true)
        .map((option) => option.id)}
      writtenAnswer={
        typeof answer?.content === "string" ? answer.content : undefined
      }
      resolveAssetUrl={resolveAssetUrl}
    >
      {!brief && feedback ? (
        <Card className="gap-4 p-5">
          <Eyebrow size="md" tone="primary">
            Feedback pengajar
          </Eyebrow>
          <NativeContentRenderer
            content={feedback}
            resolveAssetUrl={resolveAssetUrl}
          />
        </Card>
      ) : null}
      {!brief && question.explanation ? (
        <Card className="gap-4 p-5">
          <Eyebrow size="md">Pembahasan</Eyebrow>
          <NativeContentRenderer
            content={question.explanation}
            resolveAssetUrl={resolveAssetUrl}
          />
        </Card>
      ) : null}
    </QuizQuestion>
  );
}
