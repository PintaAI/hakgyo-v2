import type { RouterOutputs } from "@hakgyo/api";
import { useState } from "react";
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
import { AssessmentOption, AssessmentQuestion } from "./assessment-ui";
import { StudyAction, StudyGlass } from "./study-glass";

type Assessment = RouterOutputs["assessment"]["getForCourseItem"];
type Attempt = RouterOutputs["assessment"]["getMyAttempt"];

export function AssessmentResultReview({
  assessment,
  attempt,
  resolveAssetUrl,
  onQuestionChange,
}: {
  assessment: Assessment;
  attempt: Attempt;
  resolveAssetUrl: AssetUrlResolver;
  onQuestionChange?: () => void;
}) {
  const [index, setIndex] = useState(0);
  function goToQuestion(next: number) {
    setIndex(next);
    onQuestionChange?.();
  }
  const policy = assessmentResultPolicy(assessment.event?.type);
  const available =
    attempt.status === "GRADED" &&
    policy.showAnswerReview &&
    assessment.answersRevealed;
  const statuses: QuestionStatus[] = available
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
  const openQuestions = useQuestionNavigator({
    title: "Review · " + assessment.title,
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
      <StudyGlass>
        <Text className="font-bold text-foreground">Score-only tryout</Text>
        <Text className="text-sm leading-5 text-muted-foreground">
          Tryout results include your final score and leaderboard. Correct
          answers and explanations are not published.
        </Text>
      </StudyGlass>
    );
  if (!assessment.answersRevealed)
    return (
      <StudyGlass>
        <Text className="font-bold text-foreground">
          Answer review is not available yet
        </Text>
        <Text className="text-sm leading-5 text-muted-foreground">
          Correct answers and explanations become available after this on-demand
          assessment closes.
        </Text>
      </StudyGlass>
    );

  const question = assessment.questions[index];
  if (!question) return null;
  const answer = attempt.answers.find(
    (candidate) => candidate.questionId === question.id,
  );
  const selected = new Set(
    answer?.selectedOptions.map((selection) => selection.optionId) ?? [],
  );
  const writtenScore =
    answer && "manualScore" in answer
      ? (answer.manualScore ??
        ("autoScore" in answer ? answer.autoScore : null))
      : null;
  const feedback = answer && "feedback" in answer ? answer.feedback : null;
  return (
    <View className="gap-4">
      <Text className="text-xl font-black text-foreground">
        Review your answers
      </Text>
      <AssessmentQuestion
        detail={
          question.type === "WRITTEN"
            ? writtenScore !== null
              ? writtenScore + " / " + question.points + " pt"
              : "Reviewed"
            : statuses[index] === "correct"
              ? "Correct"
              : statuses[index] === "unanswered"
                ? "Not answered"
                : "Incorrect"
        }
        current={index}
        total={assessment.questions.length}
        answered={statuses.filter((status) => status !== "unanswered").length}
        onOpen={openQuestions}
      >
        <NativeContentRenderer
          content={question.prompt}
          resolveAssetUrl={resolveAssetUrl}
        />
      </AssessmentQuestion>
      {question.type === "WRITTEN" ? (
        <StudyGlass>
          <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Your answer
          </Text>
          <Text className="text-base leading-6 text-foreground">
            {typeof answer?.content === "string" && answer.content.trim()
              ? answer.content
              : "Not answered"}
          </Text>
        </StudyGlass>
      ) : (
        question.options.map((option, optionIndex) => (
          <AssessmentOption
            key={option.id}
            index={optionIndex}
            selected={selected.has(option.id)}
            correct={option.isCorrect === true}
            multiple={question.type === "MULTIPLE_CHOICE"}
          >
            <NativeContentRenderer
              content={option.content}
              resolveAssetUrl={resolveAssetUrl}
            />
          </AssessmentOption>
        ))
      )}
      {feedback ? (
        <StudyGlass>
          <Text className="text-xs font-bold uppercase tracking-wider text-primary">
            Teacher feedback
          </Text>
          <NativeContentRenderer
            content={feedback}
            resolveAssetUrl={resolveAssetUrl}
          />
        </StudyGlass>
      ) : null}
      {question.explanation ? (
        <StudyGlass>
          <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Explanation
          </Text>
          <NativeContentRenderer
            content={question.explanation}
            resolveAssetUrl={resolveAssetUrl}
          />
        </StudyGlass>
      ) : null}
      <View className="flex-row gap-3">
        <View className="flex-1">
          <StudyAction
            secondary
            disabled={index === 0}
            onPress={() => goToQuestion(index - 1)}
          >
            Previous
          </StudyAction>
        </View>
        <View className="flex-1">
          <StudyAction
            disabled={index === assessment.questions.length - 1}
            onPress={() => goToQuestion(index + 1)}
          >
            Next →
          </StudyAction>
        </View>
      </View>
    </View>
  );
}
