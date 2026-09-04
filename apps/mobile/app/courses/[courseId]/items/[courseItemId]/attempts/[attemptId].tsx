import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { NativeContentRenderer } from "../../../../../../src/components/content-renderer";
import { api } from "../../../../../../src/lib/trpc";

type Answer = { content?: string; optionIds: string[] };

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default function AssessmentAttemptScreen() {
  const params = useLocalSearchParams<{
    courseId: string | string[];
    courseItemId: string | string[];
    attemptId: string | string[];
  }>();
  const courseId = firstParam(params.courseId);
  const courseItemId = firstParam(params.courseItemId);
  const attemptId = firstParam(params.attemptId);
  const assessment = api.assessment.getForCourseItem.useQuery(
    { courseItemId, attemptId },
    { enabled: Boolean(courseItemId && attemptId), retry: false },
  );
  const attempt = api.assessment.getMyAttempt.useQuery(
    { attemptId },
    { enabled: Boolean(attemptId), retry: false },
  );
  const saveAnswers = api.assessment.saveAnswers.useMutation();
  const submitAttempt = api.assessment.submitAttempt.useMutation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [result, setResult] = useState<{
    status: "GRADED" | "IN_REVIEW";
    score: number;
    maxScore: number;
  }>();

  useEffect(() => {
    if (!attempt.data) return;
    setAnswers(
      Object.fromEntries(
        attempt.data.answers.map((answer) => [
          answer.questionId,
          {
            content:
              typeof answer.content === "string" ? answer.content : undefined,
            optionIds: answer.selectedOptions.map(
              (selection) => selection.optionId,
            ),
          },
        ]),
      ),
    );
  }, [attempt.data]);

  const question = assessment.data?.questions[currentIndex];

  function chooseOption(optionId: string) {
    if (!question) return;
    setAnswers((current) => {
      const existing = current[question.id] ?? { optionIds: [] };
      const optionIds =
        question.type === "SINGLE_CHOICE"
          ? [optionId]
          : existing.optionIds.includes(optionId)
            ? existing.optionIds.filter((id) => id !== optionId)
            : [...existing.optionIds, optionId];
      return { ...current, [question.id]: { optionIds } };
    });
  }

  async function submit() {
    if (!assessment.data) return;
    const payload = assessment.data.questions.flatMap((item) => {
      const answer = answers[item.id];
      if (!answer) return [];
      return [
        {
          questionId: item.id,
          optionIds: answer.optionIds,
          ...(item.type === "WRITTEN"
            ? { content: answer.content ?? "" }
            : {}),
        },
      ];
    });
    try {
      if (payload.length) {
        await saveAnswers.mutateAsync({ attemptId, answers: payload });
      }
      const submitted = await submitAttempt.mutateAsync({ attemptId });
      setResult(submitted);
    } catch {
      // Mutation errors are rendered below.
    }
  }

  const loading = assessment.isPending || attempt.isPending;
  const error = assessment.error ?? attempt.error;

  return (
    <>
      <Stack.Screen
        options={{ headerShown: true, title: assessment.data?.title ?? "Assessment" }}
      />
      {loading ? (
        <View className="flex-1 items-center justify-center bg-background">
          <ActivityIndicator />
        </View>
      ) : error || !assessment.data || !attempt.data ? (
        <View className="flex-1 items-center justify-center gap-4 bg-background px-6">
          <Text className="text-center text-sm text-destructive">
            {error?.message ?? "Assessment unavailable."}
          </Text>
          <Pressable
            className="rounded-full border border-border px-5 py-3"
            onPress={() => router.back()}
          >
            <Text className="font-bold text-foreground">Go back</Text>
          </Pressable>
        </View>
      ) : result ? (
        <View className="flex-1 items-center justify-center gap-4 bg-background px-6">
          <View className="size-16 items-center justify-center rounded-full bg-primary/10">
            <Text className="text-2xl font-black text-primary">✓</Text>
          </View>
          <Text className="text-2xl font-black text-foreground">
            {result.status === "IN_REVIEW"
              ? "Submitted for review"
              : "Assessment complete"}
          </Text>
          {result.status === "GRADED" ? (
            <Text className="text-lg text-muted-foreground">
              Score: {result.score}/{result.maxScore}
            </Text>
          ) : null}
          <Pressable
            className="rounded-full bg-primary px-6 py-4"
            onPress={() =>
              router.replace({
                pathname: "/courses/[courseId]",
                params: { courseId },
              })
            }
          >
            <Text className="font-black text-primary-foreground">
              Return to course
            </Text>
          </Pressable>
        </View>
      ) : question ? (
        <ScrollView
          className="flex-1 bg-background"
          contentContainerClassName="gap-5 px-5 pb-14 pt-4"
          contentInsetAdjustmentBehavior="automatic"
        >
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-black uppercase tracking-[1.5px] text-muted-foreground">
              Question {currentIndex + 1} of {assessment.data.questions.length}
            </Text>
            <Text className="text-xs font-bold text-muted-foreground">
              {question.points} pt
            </Text>
          </View>
          <View className="gap-5 rounded-xl border border-border bg-card p-5">
            <NativeContentRenderer content={question.prompt} />
            {question.type === "WRITTEN" ? (
              <TextInput
                className="min-h-32 rounded-xl border border-border bg-background p-4 text-foreground"
                multiline
                onChangeText={(content) =>
                  setAnswers((current) => ({
                    ...current,
                    [question.id]: { content, optionIds: [] },
                  }))
                }
                placeholder="Write your answer…"
                textAlignVertical="top"
                value={answers[question.id]?.content ?? ""}
              />
            ) : (
              <View className="gap-3">
                {question.options.map((option) => {
                  const selected = answers[question.id]?.optionIds.includes(
                    option.id,
                  );
                  return (
                    <Pressable
                      className={`flex-row items-center gap-3 rounded-xl border p-4 ${selected ? "border-primary bg-primary/10" : "border-border"}`}
                      key={option.id}
                      onPress={() => chooseOption(option.id)}
                    >
                      <View
                        className={`size-5 rounded-full border ${selected ? "border-primary bg-primary" : "border-border"}`}
                      />
                      <View className="min-w-0 flex-1">
                        <NativeContentRenderer content={option.content} />
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
          <View className="flex-row gap-3">
            <Pressable
              className="flex-1 items-center rounded-full border border-border px-5 py-4 disabled:opacity-40"
              disabled={currentIndex === 0}
              onPress={() => setCurrentIndex((index) => index - 1)}
            >
              <Text className="font-black text-foreground">Previous</Text>
            </Pressable>
            {currentIndex < assessment.data.questions.length - 1 ? (
              <Pressable
                className="flex-1 items-center rounded-full bg-primary px-5 py-4"
                onPress={() => setCurrentIndex((index) => index + 1)}
              >
                <Text className="font-black text-primary-foreground">Next</Text>
              </Pressable>
            ) : (
              <Pressable
                className="flex-1 items-center rounded-full bg-primary px-5 py-4 disabled:opacity-50"
                disabled={saveAnswers.isPending || submitAttempt.isPending}
                onPress={() => void submit()}
              >
                <Text className="font-black text-primary-foreground">
                  {saveAnswers.isPending || submitAttempt.isPending
                    ? "Submitting…"
                    : "Submit"}
                </Text>
              </Pressable>
            )}
          </View>
          {saveAnswers.isError || submitAttempt.isError ? (
            <Text className="text-center text-sm text-destructive">
              {saveAnswers.error?.message ?? submitAttempt.error?.message}
            </Text>
          ) : null}
        </ScrollView>
      ) : (
        <View className="flex-1 items-center justify-center bg-background px-6">
          <Text className="text-muted-foreground">
            This assessment has no questions.
          </Text>
        </View>
      )}
    </>
  );
}
