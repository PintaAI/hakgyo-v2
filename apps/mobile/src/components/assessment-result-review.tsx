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
      <StudyGlass>
        <Text className="font-bold text-foreground">Tryout hanya skor</Text>
        <Text className="text-sm leading-5 text-muted-foreground">
          Hasil tryout berisi skor akhir dan leaderboard. Kunci jawaban dan
          pembahasan tidak dipublikasikan.
        </Text>
      </StudyGlass>
    );
  if (!assessment.answersRevealed)
    return (
      <StudyGlass>
        <Text className="font-bold text-foreground">
          Review jawaban belum tersedia
        </Text>
        <Text className="text-sm leading-5 text-muted-foreground">
          Kunci jawaban dan pembahasan tersedia setelah latihan ini ditutup.
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
        Review jawaban kamu
      </Text>
      <AssessmentQuestion
        detail={
          question.type === "WRITTEN"
            ? writtenScore !== null
              ? writtenScore + " / " + question.points + " pt"
              : "Sudah direview"
            : statuses[index] === "correct"
              ? "Benar"
              : statuses[index] === "unanswered"
                ? "Tidak dijawab"
                : "Salah"
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
            Jawaban kamu
          </Text>
          <Text className="text-base leading-6 text-foreground">
            {typeof answer?.content === "string" && answer.content.trim()
              ? answer.content
              : "Tidak dijawab"}
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
            Feedback pengajar
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
            Pembahasan
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
            Sebelumnya
          </StudyAction>
        </View>
        <View className="flex-1">
          <StudyAction
            disabled={index === assessment.questions.length - 1}
            onPress={() => goToQuestion(index + 1)}
          >
            Berikutnya →
          </StudyAction>
        </View>
      </View>
    </View>
  );
}
