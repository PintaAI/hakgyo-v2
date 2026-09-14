import type { RouterOutputs } from "@hakgyo/api";
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { api } from "../lib/trpc";
import { NativeContentRenderer, useApiAssetResolver } from "./content-renderer";
import { Action, Card, Empty, Eyebrow, QueryState } from "./learning-ui";

type PracticeQuestion =
  RouterOutputs["practice"]["getAssessmentSample"]["questions"][number];
type GradeResult = RouterOutputs["practice"]["gradeAssessmentAnswer"];

function randomSeed() {
  return `${Date.now()}:${Math.random()}`;
}

export function TodayAssessmentPractice() {
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
    setSelected((current) =>
      question.type === "SINGLE_CHOICE"
        ? [optionId]
        : current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId],
    );
  }

  async function checkAnswer() {
    if (!question || selected.length === 0 || grade.isPending) return;
    const request = gradingRequest.current + 1;
    gradingRequest.current = request;
    try {
      const next = await grade.mutateAsync({
        questionId: question.questionId,
        sourceCourseItemId: question.sourceCourseItemId,
        optionIds: selected,
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
    <Card>
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1 gap-1">
          <Eyebrow tone="primary">Random sampler</Eyebrow>
          <Text className="text-xl font-black text-foreground">
            Assessment practice
          </Text>
        </View>
        <View className="rounded-full bg-muted px-3 py-1.5">
          <Text className="text-xs font-bold text-muted-foreground">
            Not graded
          </Text>
        </View>
      </View>
      <Text className="text-sm leading-5 text-muted-foreground">
        Up to five choice questions from your unlocked courses. Check answers
        without using an attempt or changing course progress.
      </Text>
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
          <View className="flex-row items-center justify-between gap-3">
            <Text className="flex-1 text-xs font-bold uppercase tracking-[1.2px] text-muted-foreground">
              {question.assessmentTitle} · {question.courseTitle}
            </Text>
            <Text className="text-xs font-bold text-muted-foreground">
              {index + 1}/{questions.length}
            </Text>
          </View>
          <View className="gap-4 rounded-2xl bg-muted p-5">
            <NativeContentRenderer
              content={question.prompt}
              resolveAssetUrl={resolveAssetUrl}
            />
          </View>
          <Text className="text-xs font-bold uppercase tracking-[1.2px] text-muted-foreground">
            {question.type === "MULTIPLE_CHOICE"
              ? "Select all that apply"
              : "Choose one answer"}
          </Text>
          <View className="gap-3">
            {question.options.map((option) => {
              const isSelected = selected.includes(option.id);
              const isCorrect = result?.correctOptionIds.includes(option.id);
              const isWrongSelection = !!result && isSelected && !isCorrect;
              const stateClass = result
                ? isCorrect
                  ? "border-primary bg-primary/10"
                  : isWrongSelection
                    ? "border-destructive bg-destructive/10"
                    : "border-border opacity-60"
                : isSelected
                  ? "border-primary bg-primary/10"
                  : "border-border bg-background";
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
                  className={`min-h-14 flex-row items-center gap-3 rounded-2xl border p-4 ${stateClass}`}
                  disabled={!!result || grade.isPending}
                  key={option.id}
                  onPress={() => chooseOption(option.id)}
                >
                  <View
                    className={`size-5 border ${question.type === "SINGLE_CHOICE" ? "rounded-full" : "rounded-md"} ${isSelected || isCorrect ? "border-primary bg-primary" : "border-border"}`}
                  />
                  <View className="min-w-0 flex-1">
                    <NativeContentRenderer
                      content={option.content}
                      resolveAssetUrl={resolveAssetUrl}
                    />
                    {result && (isCorrect || isWrongSelection) ? (
                      <Text
                        className={`mt-2 text-xs font-bold ${isCorrect ? "text-primary" : "text-destructive"}`}
                      >
                        {isCorrect ? "Correct answer" : "Your answer"}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
          {result ? (
            <View
              className={`gap-2 rounded-2xl border p-4 ${result.correct ? "border-primary/40 bg-primary/10" : "border-destructive/40 bg-destructive/10"}`}
            >
              <Text
                accessibilityLiveRegion="polite"
                className={`font-bold ${result.correct ? "text-primary" : "text-destructive"}`}
              >
                {result.correct ? "Correct" : "Not quite"}
              </Text>
              {result.explanation ? (
                <NativeContentRenderer
                  content={result.explanation}
                  resolveAssetUrl={resolveAssetUrl}
                />
              ) : (
                <Text className="text-sm text-muted-foreground">
                  The correct answer is highlighted above.
                </Text>
              )}
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
          {result ? (
            <Action onPress={nextQuestion}>Next question</Action>
          ) : (
            <Action
              disabled={selected.length === 0 || grade.isPending}
              onPress={() => void checkAnswer()}
            >
              {grade.isPending ? "Checking answer…" : "Check answer"}
            </Action>
          )}
        </>
      ) : query.data ? (
        <View className="gap-3 rounded-2xl bg-muted p-5">
          <Text className="text-2xl font-black text-foreground">
            {score} of {questions.length} correct
          </Text>
          <Text className="text-sm leading-5 text-muted-foreground">
            This was practice only. Your grades, attempts, course progress, and
            XP were not changed.
          </Text>
          <Action onPress={newSample}>Get another random set</Action>
        </View>
      ) : null}
      <Text className="text-xs leading-5 text-muted-foreground">
        This sampler never uses an assessment attempt, changes a grade or course
        progress, or awards XP.
      </Text>
    </Card>
  );
}
