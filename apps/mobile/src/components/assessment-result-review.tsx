import type { RouterOutputs } from "@hakgyo/api";
import { Text, View } from "react-native";

import {
  NativeContentRenderer,
  type AssetUrlResolver,
} from "./content-renderer";
import { assessmentResultPolicy } from "../lib/assessment-state";

type Assessment = RouterOutputs["assessment"]["getForCourseItem"];
type Attempt = RouterOutputs["assessment"]["getMyAttempt"];

export function AssessmentResultReview({
  assessment,
  attempt,
  resolveAssetUrl,
}: {
  assessment: Assessment;
  attempt: Attempt;
  resolveAssetUrl: AssetUrlResolver;
}) {
  const policy = assessmentResultPolicy(assessment.event?.type);

  if (attempt.status !== "GRADED") return null;

  if (!policy.showAnswerReview) {
    return (
      <View className="rounded-xl border border-border bg-card p-5">
        <Text className="font-bold text-foreground">Score-only tryout</Text>
        <Text className="mt-2 text-sm leading-5 text-muted-foreground">
          Tryout results include your final score and leaderboard. Correct
          answers and explanations are not published.
        </Text>
      </View>
    );
  }

  if (!assessment.answersRevealed) {
    return (
      <View className="rounded-xl border border-border bg-card p-5">
        <Text className="font-bold text-foreground">
          Answer review is not available yet
        </Text>
        <Text className="mt-2 text-sm leading-5 text-muted-foreground">
          Correct answers and explanations become available after this on-demand
          assessment closes.
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-4">
      <View className="gap-1">
        <Text className="text-xl font-black text-foreground">
          Review your answers
        </Text>
        <Text className="text-sm leading-5 text-muted-foreground">
          Compare your response with the correct answer and explanation.
        </Text>
      </View>

      {assessment.questions.map((question, index) => {
        const answer = attempt.answers.find(
          (candidate) => candidate.questionId === question.id,
        );
        const selected = new Set(
          answer?.selectedOptions.map(({ optionId }) => optionId) ?? [],
        );
        const correct = question.options.filter((option) => option.isCorrect);
        const choiceCorrect =
          question.type !== "WRITTEN" &&
          selected.size === correct.length &&
          correct.every((option) => selected.has(option.id));
        const writtenScore =
          answer && "manualScore" in answer
            ? (answer.manualScore ?? answer.autoScore)
            : null;
        const feedback =
          answer && "feedback" in answer ? answer.feedback : null;

        return (
          <View
            className="gap-4 rounded-xl border border-border bg-card p-5"
            key={question.id}
          >
            <View className="flex-row items-center justify-between gap-3">
              <Text className="text-xs font-black uppercase tracking-[1.5px] text-muted-foreground">
                Question {index + 1}
              </Text>
              <Text
                className={`text-xs font-black ${
                  question.type === "WRITTEN" || choiceCorrect
                    ? "text-primary"
                    : "text-destructive"
                }`}
              >
                {question.type === "WRITTEN"
                  ? writtenScore !== null
                    ? `${writtenScore} / ${question.points} pt`
                    : "Reviewed"
                  : choiceCorrect
                    ? "Correct"
                    : "Incorrect"}
              </Text>
            </View>

            <NativeContentRenderer
              content={question.prompt}
              resolveAssetUrl={resolveAssetUrl}
            />

            {question.type === "WRITTEN" ? (
              <View className="gap-2 rounded-xl bg-muted p-4">
                <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Your answer
                </Text>
                <Text className="text-sm leading-5 text-foreground">
                  {typeof answer?.content === "string" && answer.content
                    ? answer.content
                    : "Not answered"}
                </Text>
              </View>
            ) : (
              <View className="gap-3">
                {question.options.map((option) => {
                  const isSelected = selected.has(option.id);
                  const isCorrect = option.isCorrect === true;
                  const state = isCorrect
                    ? isSelected
                      ? "Your answer · Correct"
                      : "Correct answer"
                    : isSelected
                      ? "Your answer · Incorrect"
                      : null;
                  return (
                    <View
                      className={`gap-2 rounded-xl border p-4 ${
                        isCorrect
                          ? "border-primary/50 bg-primary/10"
                          : isSelected
                            ? "border-destructive/50 bg-destructive/10"
                            : "border-border"
                      }`}
                      key={option.id}
                    >
                      {state ? (
                        <Text
                          className={`text-xs font-black ${isCorrect ? "text-primary" : "text-destructive"}`}
                        >
                          {state}
                        </Text>
                      ) : null}
                      <NativeContentRenderer
                        content={option.content}
                        resolveAssetUrl={resolveAssetUrl}
                      />
                    </View>
                  );
                })}
              </View>
            )}

            {feedback ? (
              <View className="gap-2 rounded-xl bg-primary/10 p-4">
                <Text className="text-xs font-bold uppercase tracking-wider text-primary">
                  Teacher feedback
                </Text>
                <NativeContentRenderer
                  content={feedback}
                  resolveAssetUrl={resolveAssetUrl}
                />
              </View>
            ) : null}

            {question.explanation ? (
              <View className="gap-2 rounded-xl bg-muted p-4">
                <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Explanation
                </Text>
                <NativeContentRenderer
                  content={question.explanation}
                  resolveAssetUrl={resolveAssetUrl}
                />
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
