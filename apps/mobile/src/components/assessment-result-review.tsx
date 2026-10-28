import { formatScoreOutOf, groupRanges, usesPictureGrid } from "@hakgyo/shared";
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
import {
  AssessmentOption,
  AssessmentOptions,
  AssessmentQuestion,
} from "./assessment-ui";
import { QuestionGroupHeader } from "./question-group-header";
import { Eyebrow } from "./learning-ui";
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
  // Scores arrive as plain numbers; the payload type widens them through the "in" checks.
  const writtenScoreValue =
    typeof writtenScore === "number" ? writtenScore : null;
  const feedback = answer && "feedback" in answer ? answer.feedback : null;
  const group = question.groupId
    ? assessment.groups.find(({ id }) => id === question.groupId)
    : undefined;
  const groupRange = question.groupId
    ? groupRanges(assessment.questions).get(question.groupId)
    : undefined;
  return (
    <View className="gap-4">
      <Text className="text-xl font-black text-foreground">
        Review jawaban kamu
      </Text>
      <AssessmentQuestion
        detail={
          question.type === "WRITTEN"
            ? writtenScoreValue !== null
              ? `${formatScoreOutOf(writtenScoreValue, question.points, " / ")} pt`
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
        {group && groupRange ? (
          <QuestionGroupHeader
            first={groupRange.first}
            instructions={group.instructions}
            last={groupRange.last}
            resolveAssetUrl={resolveAssetUrl}
            stimulus={group.stimulus}
          />
        ) : null}
        <NativeContentRenderer
          content={question.prompt}
          resolveAssetUrl={resolveAssetUrl}
        />
      </AssessmentQuestion>
      {question.type === "WRITTEN" ? (
        <StudyGlass>
          <Eyebrow size="md">Jawaban kamu</Eyebrow>
          <Text className="text-base leading-6 text-foreground">
            {typeof answer?.content === "string" && answer.content.trim()
              ? answer.content
              : "Tidak dijawab"}
          </Text>
        </StudyGlass>
      ) : (
        <AssessmentOptions grid={usesPictureGrid(question.options)}>
          {question.options.map((option, optionIndex) => (
            <AssessmentOption
              key={option.id}
              index={optionIndex}
              selected={selected.has(option.id)}
              correct={option.isCorrect === true}
              multiple={question.type === "MULTIPLE_CHOICE"}
              tile={usesPictureGrid(question.options)}
            >
              <NativeContentRenderer
                content={option.content}
                resolveAssetUrl={resolveAssetUrl}
              />
            </AssessmentOption>
          ))}
        </AssessmentOptions>
      )}
      {feedback ? (
        <StudyGlass>
          <Eyebrow size="md" tone="primary">
            Feedback pengajar
          </Eyebrow>
          <NativeContentRenderer
            content={feedback}
            resolveAssetUrl={resolveAssetUrl}
          />
        </StudyGlass>
      ) : null}
      {question.explanation ? (
        <StudyGlass>
          <Eyebrow size="md">Pembahasan</Eyebrow>
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
            trailingIcon="arrow.right"
          >
            Berikutnya
          </StudyAction>
        </View>
      </View>
    </View>
  );
}
