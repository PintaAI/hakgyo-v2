import type { RouterOutputs } from "@hakgyo/api";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { SymbolView } from "expo-symbols";

import { api } from "../lib/trpc";
import { useAppTheme } from "../providers/AppThemeProvider";
import { NativeContentRenderer, useApiAssetResolver } from "./content-renderer";
import { Action, Empty, QueryState } from "./learning-ui";

type PracticeQuestion =
  RouterOutputs["practice"]["getAssessmentSample"]["questions"][number];
type GradeResult = RouterOutputs["practice"]["gradeAssessmentAnswer"];

function randomSeed() {
  return `${Date.now()}:${Math.random()}`;
}

export function TodayAssessmentPractice() {
  const { colors } = useAppTheme();
  const [seed, setSeed] = useState(randomSeed);
  const query = api.practice.getAssessmentSample.useQuery({ limit: 5, seed });
  const grade = api.practice.gradeAssessmentAnswer.useMutation();
  const resolveAssetUrl = useApiAssetResolver();
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [result, setResult] = useState<GradeResult>();
  const [score, setScore] = useState(0);
  const initializedPool = useRef<
    { seed: string; signature: string } | undefined
  >(undefined);
  const gradingRequest = useRef(0);

  useEffect(() => {
    if (!query.data) return;
    const signature = JSON.stringify(query.data.questions);
    if (
      initializedPool.current?.seed === seed &&
      initializedPool.current.signature === signature
    ) {
      return;
    }
    initializedPool.current = { seed, signature };
    gradingRequest.current += 1;
    setQuestions(query.data.questions);
    setIndex(0);
    setSelected([]);
    setResult(undefined);
    setScore(0);
  }, [query.data, seed]);

  const question = questions[index];

  function chooseOption(optionId: string) {
    if (!question || result || grade.isPending) return;
    if (question.type === "SINGLE_CHOICE") {
      setSelected([optionId]);
      void checkAnswer([optionId]);
      return;
    }
    setSelected((current) =>
      current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId],
    );
  }

  async function checkAnswer(optionIds: string[]) {
    if (!question || optionIds.length === 0 || grade.isPending) return;
    const request = gradingRequest.current + 1;
    gradingRequest.current = request;
    try {
      const next = await grade.mutateAsync({
        questionId: question.questionId,
        sourceCourseItemId: question.sourceCourseItemId,
        optionIds,
      });
      if (gradingRequest.current !== request) return;
      setResult(next);
      if (next.correct) setScore((value) => value + 1);
    } catch {
      // The mutation error remains visible with the selected answer for retry.
    }
  }

  function nextQuestion() {
    setIndex((value) => value + 1);
    setSelected([]);
    setResult(undefined);
    grade.reset();
  }

  function newSample() {
    gradingRequest.current += 1;
    grade.reset();
    setQuestions([]);
    setSeed(randomSeed());
  }

  return (
    <View className="gap-3">
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {query.data && !query.data.hasAvailableContent ? (
        <Empty>
          Assessment practice appears when an unlocked course has published
          choice questions.
        </Empty>
      ) : question ? (
        <>
          <View className="gap-3">
            <View className="flex-row items-end justify-between gap-4">
              <View className="min-w-0 flex-1 gap-1">
                <Text className="text-[11px] font-black uppercase tracking-[2px] text-primary">
                  Quick check
                </Text>
                <Text className="text-3xl font-black tracking-tight text-foreground">
                  Assessment
                </Text>
              </View>
              <View className="flex-row items-baseline">
                <Text className="text-3xl font-black text-foreground">
                  {String(index + 1).padStart(2, "0")}
                </Text>
                <Text className="text-sm font-bold text-muted-foreground">
                  /{String(questions.length).padStart(2, "0")}
                </Text>
              </View>
            </View>
            <View className="flex-row gap-1.5">
              {questions.map((item, itemIndex) => (
                <View
                  className={`h-1 flex-1 rounded-full ${itemIndex <= index ? "bg-primary" : "bg-muted"}`}
                  key={item.questionId}
                />
              ))}
            </View>
          </View>

          <Text
            className="text-xs font-bold uppercase tracking-[1.2px] text-muted-foreground"
            numberOfLines={2}
          >
            {question.assessmentTitle} · {question.courseTitle}
          </Text>

          <View className="gap-3 rounded-3xl border border-border bg-card px-5 py-6">
            <Text className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground">
              Question
            </Text>
            <NativeContentRenderer
              content={question.prompt}
              resolveAssetUrl={resolveAssetUrl}
            />
          </View>

          <View className="mt-1 flex-row items-center justify-between gap-3">
            <Text className="text-sm font-black text-foreground">
              {question.type === "MULTIPLE_CHOICE"
                ? "Select every correct answer"
                : "Choose your answer"}
            </Text>
            <Text className="text-[10px] font-bold uppercase tracking-[1.5px] text-muted-foreground">
              {question.type === "MULTIPLE_CHOICE" ? "Multiple" : "One choice"}
            </Text>
          </View>
          <View className="gap-3">
            {question.options.map((option, optionIndex) => {
              const isSelected = selected.includes(option.id);
              const isCorrect = result?.correctOptionIds.includes(option.id);
              const isWrongSelection = !!result && isSelected && !isCorrect;
              const stateClass = result
                ? isCorrect
                  ? "border-primary bg-primary/10"
                  : isWrongSelection
                    ? "border-destructive bg-destructive/10"
                    : "border-border opacity-50"
                : isSelected
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card";
              const markerClass = isCorrect
                ? "border-primary bg-primary"
                : isWrongSelection
                  ? "border-destructive bg-destructive"
                  : isSelected
                    ? "border-primary bg-primary"
                    : "border-border bg-muted";
              return (
                <Pressable
                  accessibilityHint={
                    result
                      ? isCorrect
                        ? "Correct answer"
                        : isWrongSelection
                          ? "Your incorrect answer"
                          : undefined
                      : undefined
                  }
                  accessibilityRole={
                    question.type === "SINGLE_CHOICE" ? "radio" : "checkbox"
                  }
                  accessibilityState={{
                    checked: isSelected,
                    disabled: !!result || grade.isPending,
                  }}
                  className={`min-h-16 flex-row items-center gap-4 rounded-2xl border px-4 py-3.5 active:opacity-75 ${stateClass}`}
                  disabled={!!result || grade.isPending}
                  key={option.id}
                  onPress={() => chooseOption(option.id)}
                >
                  <View
                    className={`size-8 items-center justify-center rounded-xl border ${markerClass}`}
                  >
                    {isCorrect || isWrongSelection ? (
                      <SymbolView
                        fallback={
                          <Text className="text-sm font-black text-primary-foreground">
                            {isCorrect ? "✓" : "×"}
                          </Text>
                        }
                        name={isCorrect ? "checkmark" : "xmark"}
                        size={15}
                        tintColor={
                          isCorrect
                            ? colors.primaryForeground
                            : colors.destructiveForeground
                        }
                        weight="bold"
                      />
                    ) : (
                      <Text
                        className={`text-xs font-black ${isSelected ? "text-primary-foreground" : "text-muted-foreground"}`}
                      >
                        {String.fromCharCode(65 + optionIndex)}
                      </Text>
                    )}
                  </View>
                  <View className="min-w-0 flex-1">
                    <NativeContentRenderer
                      content={option.content}
                      resolveAssetUrl={resolveAssetUrl}
                    />
                  </View>
                </Pressable>
              );
            })}
          </View>
          {result ? (
            <View className="mt-1 gap-4 border-t border-border pt-4">
              <View className="flex-row items-center gap-4">
                <View className="min-w-0 flex-1 gap-1">
                  <Text className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground">
                    Result
                  </Text>
                  <Text
                    accessibilityLiveRegion="polite"
                    className={`text-2xl font-black ${result.correct ? "text-primary" : "text-destructive"}`}
                  >
                    {result.correct ? "You got it." : "Almost."}
                  </Text>
                </View>
                <Pressable
                  accessibilityLabel="Next question"
                  accessibilityRole="button"
                  onPress={nextQuestion}
                  className="size-12 items-center justify-center rounded-full bg-primary active:opacity-75"
                >
                  <SymbolView
                    fallback={
                      <Text
                        className="text-xl font-black"
                        style={{ color: colors.primaryForeground }}
                      >
                        →
                      </Text>
                    }
                    name="arrow.right"
                    size={22}
                    tintColor={colors.primaryForeground}
                    weight="bold"
                  />
                </Pressable>
              </View>
              <View className="rounded-2xl bg-muted p-4">
                {result.explanation ? (
                  <NativeContentRenderer
                    content={result.explanation}
                    resolveAssetUrl={resolveAssetUrl}
                  />
                ) : (
                  <Text className="text-sm text-muted-foreground">
                    The correct answer is marked above.
                  </Text>
                )}
              </View>
            </View>
          ) : null}
          {grade.isError ? (
            <Text
              accessibilityRole="alert"
              className="text-sm text-destructive"
            >
              {grade.error.message}
            </Text>
          ) : null}
          {!result && grade.isPending ? (
            <View className="flex-row items-center justify-center gap-2 py-2">
              <ActivityIndicator color={colors.primary} size="small" />
              <Text className="text-sm font-bold text-muted-foreground">
                Checking your answer
              </Text>
            </View>
          ) : null}
          {!result &&
          !grade.isPending &&
          question.type === "MULTIPLE_CHOICE" ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: selected.length === 0 }}
              disabled={selected.length === 0}
              onPress={() => void checkAnswer(selected)}
              className="min-h-12 flex-row items-center justify-between rounded-2xl bg-primary px-5 active:opacity-75"
              style={{ opacity: selected.length === 0 ? 0.4 : 1 }}
            >
              <Text className="font-black text-primary-foreground">
                Submit {selected.length || "your"} selection
                {selected.length === 1 ? "" : "s"}
              </Text>
              <SymbolView
                fallback={
                  <Text
                    className="text-lg font-black"
                    style={{ color: colors.primaryForeground }}
                  >
                    →
                  </Text>
                }
                name="arrow.right"
                size={18}
                tintColor={colors.primaryForeground}
                weight="bold"
              />
            </Pressable>
          ) : null}
        </>
      ) : query.data ? (
        <View className="gap-3 rounded-2xl bg-muted p-5">
          <Text className="text-xl font-black text-foreground">
            {score} of {questions.length} correct
          </Text>
          <Text className="text-sm leading-5 text-muted-foreground">
            This was practice only. Your grades, attempts, course progress, and
            XP were not changed.
          </Text>
          <Action onPress={newSample}>Get another random set</Action>
        </View>
      ) : null}
    </View>
  );
}
