import type { RouterOutputs } from "@hakgyo/api";
import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { api } from "../lib/trpc";
import { localSample } from "../lib/local-sample";
import {
  nextUnansweredQuestion,
  type QuestionStatus,
} from "../lib/question-progress";
import { useQuestionNavigator } from "../providers/QuestionNavigatorProvider";
import { NativeContentRenderer, useApiAssetResolver } from "./content-renderer";
import { Empty } from "./learning-ui";
import {
  AssessmentFeedback,
  AssessmentOption,
  AssessmentQuestion,
} from "./assessment-ui";
import { StudyAction, StudyGlass } from "./study-glass";

type PracticeQuestion =
  RouterOutputs["practice"]["getAssessmentSample"]["questions"][number];
type GradeResult = RouterOutputs["practice"]["gradeAssessmentAnswer"];
type AssessmentPool = RouterOutputs["practice"]["getAssessmentSample"];
function randomSeed() {
  return Date.now() + ":" + Math.random();
}

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
  const [finished, setFinished] = useState(false);
  const initializedPool = useRef("");
  const gradingRequest = useRef(0);
  const inFlight = useRef(false);

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
    setFinished(false);
  }, [pool.questions, seed, organizationId]);

  useEffect(
    () => () => {
      gradingRequest.current += 1;
    },
    [],
  );
  const question = questions[index];
  const selected = selections[index] ?? [];
  const result = results[index];
  const statuses: QuestionStatus[] = questions.map((_, questionIndex) => {
    const answer = results[questionIndex];
    return answer ? (answer.correct ? "correct" : "incorrect") : "unanswered";
  });
  const answered = statuses.filter((status) => status !== "unanswered").length;
  const score = Object.values(results).filter(
    (answer) => answer.correct,
  ).length;
  const openQuestions = useQuestionNavigator({
    title: "Today’s assessment",
    current: index,
    statuses,
    onSelect: (next) => {
      if (inFlight.current) return false;
      setIndex(next);
      setFinished(false);
      grade.reset();
      return true;
    },
  });

  async function checkAnswer(optionIds: string[]) {
    if (!question || !optionIds.length || inFlight.current || result) return;
    inFlight.current = true;
    const request = ++gradingRequest.current;
    const questionIndex = index;
    try {
      const next = await grade.mutateAsync({
        questionId: question.questionId,
        sourceCourseItemId: question.sourceCourseItemId,
        optionIds,
      });
      if (gradingRequest.current !== request) return;
      setResults((current) => ({ ...current, [questionIndex]: next }));
    } catch {
      // Keep the selection visible and offer an explicit retry.
    } finally {
      if (gradingRequest.current === request) inFlight.current = false;
    }
  }
  function chooseOption(optionId: string) {
    if (!question || result || inFlight.current) return;
    const next =
      question.type === "SINGLE_CHOICE"
        ? [optionId]
        : selected.includes(optionId)
          ? selected.filter((id) => id !== optionId)
          : [...selected, optionId];
    setSelections((current) => ({ ...current, [index]: next }));
    if (question.type === "SINGLE_CHOICE") void checkAnswer(next);
  }
  function nextQuestion() {
    const next = nextUnansweredQuestion(statuses, index);
    if (next < 0) setFinished(true);
    else setIndex(next);
    grade.reset();
  }
  function newSample() {
    gradingRequest.current += 1;
    inFlight.current = false;
    grade.reset();
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
          Assessment practice appears when an unlocked course has published
          choice questions.
        </Empty>
      ) : finished ? (
        <StudyGlass>
          <Text className="text-2xl font-black text-foreground">
            {score} of {questions.length} correct
          </Text>
          <Text className="text-sm leading-5 text-muted-foreground">
            Practice complete. Your grades, attempts, course progress, and XP
            were not changed.
          </Text>
          <StudyAction secondary onPress={openQuestions}>
            Review questions
          </StudyAction>
          <StudyAction onPress={newSample}>Get another random set</StudyAction>
        </StudyGlass>
      ) : question ? (
        <>
          <Text className="text-lg font-bold tracking-tight text-foreground">
            Today’s assessment
          </Text>
          <Text
            className="text-xs font-bold uppercase tracking-[1.2px] text-muted-foreground"
            numberOfLines={2}
          >
            {question.assessmentTitle} · {question.courseTitle}
          </Text>
          <AssessmentQuestion
            current={index}
            total={questions.length}
            answered={answered}
            onOpen={openQuestions}
            disabled={grade.isPending}
          >
            <NativeContentRenderer
              content={question.prompt}
              resolveAssetUrl={resolveAssetUrl}
            />
          </AssessmentQuestion>
          <Text className="text-sm font-bold text-foreground">
            {question.type === "MULTIPLE_CHOICE"
              ? "Select every correct answer, then check"
              : "Tap an answer to check it"}
          </Text>
          <View className="gap-3">
            {question.options.map((option, optionIndex) => (
              <AssessmentOption
                key={option.id}
                index={optionIndex}
                selected={selected.includes(option.id)}
                multiple={question.type === "MULTIPLE_CHOICE"}
                disabled={!!result || grade.isPending}
                correct={
                  result
                    ? result.correctOptionIds.includes(option.id)
                    : undefined
                }
                onPress={() => chooseOption(option.id)}
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
                    The correct answer is marked above.
                  </Text>
                )}
              </AssessmentFeedback>
              <StudyAction onPress={nextQuestion}>
                {answered === questions.length
                  ? "See practice result"
                  : "Next unanswered →"}
              </StudyAction>
            </>
          ) : null}
          {grade.isError ? (
            <Text
              accessibilityRole="alert"
              className="text-sm text-destructive"
            >
              {grade.error.message}
            </Text>
          ) : null}
          {!result &&
          (question.type === "MULTIPLE_CHOICE" ||
            grade.isPending ||
            grade.isError) ? (
            <StudyAction
              loading={grade.isPending}
              disabled={!selected.length}
              onPress={() => void checkAnswer(selected)}
            >
              {grade.isPending
                ? "Checking your answer…"
                : grade.isError
                  ? "Retry checking answer"
                  : "Check answer"}
            </StudyAction>
          ) : null}
        </>
      ) : null}
    </View>
  );
}
