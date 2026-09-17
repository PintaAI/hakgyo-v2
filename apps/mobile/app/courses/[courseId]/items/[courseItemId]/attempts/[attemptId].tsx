import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import Storage from "expo-sqlite/kv-store";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { AssessmentResultReview } from "../../../../../../src/components/assessment-result-review";
import {
  AssessmentOption,
  AssessmentQuestion,
} from "../../../../../../src/components/assessment-ui";
import {
  StudyAction,
  StudyGlass,
} from "../../../../../../src/components/study-glass";
import {
  isQuestionAnswered,
  nextUnansweredQuestion,
  type QuestionStatus,
} from "../../../../../../src/lib/question-progress";
import { useQuestionNavigator } from "../../../../../../src/providers/QuestionNavigatorProvider";
import {
  NativeContentRenderer,
  useApiAssetResolver,
} from "../../../../../../src/components/content-renderer";
import { api } from "../../../../../../src/lib/trpc";
import { authClient } from "../../../../../../src/lib/auth-client";
import { restoreAssessmentDraft } from "../../../../../../src/lib/assessment-draft";
import { assessmentTerminalResult } from "../../../../../../src/lib/assessment-state";

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
  return (
    <AssessmentAttemptContent
      key={attemptId}
      courseId={courseId}
      courseItemId={courseItemId}
      attemptId={attemptId}
    />
  );
}

function AssessmentAttemptContent({
  courseId,
  courseItemId,
  attemptId,
}: {
  courseId: string;
  courseItemId: string;
  attemptId: string;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const resultScrollRef = useRef<ScrollView>(null);
  const operationPending = useRef(false);
  const { data: session } = authClient.useSession();
  const utils = api.useUtils();
  const resolveAssetUrl = useApiAssetResolver();
  const assessment = api.assessment.getForCourseItem.useQuery(
    { courseItemId, attemptId },
    { enabled: Boolean(courseItemId && attemptId), retry: false },
  );
  const attempt = api.assessment.getMyAttempt.useQuery(
    { attemptId },
    {
      enabled: Boolean(attemptId),
      retry: false,
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        return status === "IN_REVIEW" || status === "SUBMITTED"
          ? 15_000
          : false;
      },
    },
  );
  const saveAnswers = api.assessment.saveAnswers.useMutation();
  const submitAttempt = api.assessment.submitAttempt.useMutation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [lastSavedSignature, setLastSavedSignature] = useState("");
  const initialized = useRef<string | null>(null);
  const [now, setNow] = useState(Date.now);
  const [draftError, setDraftError] = useState<string>();
  const storageKey = session
    ? `hakgyo:attempt:v1:${session.user.id}:${attemptId}`
    : null;
  const deadline =
    assessment.data?.attemptDeadline?.getTime() ??
    (attempt.data && assessment.data?.timeLimitMinutes != null
      ? attempt.data.startedAt.getTime() +
        assessment.data.timeLimitMinutes * 60_000
      : null);
  const expired = deadline !== null && now >= deadline;
  const busy = saveAnswers.isPending || submitAttempt.isPending;
  const [submittedResult, setSubmittedResult] = useState<{
    status: "GRADED" | "IN_REVIEW";
    score: number;
    maxScore: number;
  }>();
  const result = assessmentTerminalResult(attempt.data) ?? submittedResult;
  const hasResult = result !== undefined;

  useEffect(() => {
    if (
      !attempt.data ||
      !assessment.data ||
      !storageKey ||
      initialized.current === attemptId
    )
      return;
    initialized.current = attemptId;
    const serverSaved: Record<string, Answer> = Object.fromEntries(
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
    );
    let saved = serverSaved;
    if (storageKey && attempt.data.status === "IN_PROGRESS") {
      try {
        saved = restoreAssessmentDraft(saved, Storage.getItemSync(storageKey));
      } catch {
        setDraftError(
          "The local draft could not be restored. Your last server-saved answers are shown.",
        );
      }
    }
    setLastSavedSignature(JSON.stringify(answerPayload(serverSaved)));
    setAnswers(saved);
  }, [assessment.data, attempt.data, attemptId, storageKey]);

  useEffect(() => {
    if (attempt.data?.status !== "IN_PROGRESS" || deadline === null) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [attempt.data?.status, deadline]);

  useEffect(() => {
    if (
      !storageKey ||
      initialized.current !== attemptId ||
      hasResult ||
      attempt.data?.status !== "IN_PROGRESS"
    )
      return;
    // The hydration render still contains the initial empty state.
    if (!Object.keys(answers).length) return;
    try {
      Storage.setItemSync(storageKey, JSON.stringify(answers));
      setDraftError(undefined);
    } catch {
      setDraftError(
        "Device draft unavailable. Use Save answers before leaving this screen.",
      );
    }
  }, [answers, attemptId, storageKey, hasResult, attempt.data?.status]);

  const question = assessment.data?.questions[currentIndex];
  const statuses: QuestionStatus[] = (assessment.data?.questions ?? []).map(
    (item) =>
      isQuestionAnswered(answers[item.id]) ? "answered" : "unanswered",
  );
  const answeredCount = statuses.filter(
    (status) => status === "answered",
  ).length;
  const nextUnanswered = nextUnansweredQuestion(statuses, currentIndex);
  const openQuestions = useQuestionNavigator({
    title: assessment.data?.title ?? "Assessment",
    current: currentIndex,
    statuses,
    onSelect: async (index) => {
      if (result || operationPending.current) return false;
      if (expired) {
        setCurrentIndex(index);
        return true;
      }
      return save(index);
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [currentIndex]);

  function chooseOption(optionId: string) {
    if (!question || busy || expired || result) return;
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

  function answerPayload(source = answers) {
    return (
      assessment.data?.questions.flatMap((item) => {
        const answer = source[item.id];
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
      }) ?? []
    );
  }

  const currentAnswerSignature = JSON.stringify(answerPayload());
  const hasUnsavedAnswers =
    initialized.current === attemptId &&
    currentAnswerSignature !== lastSavedSignature;

  async function save(nextIndex?: number) {
    if (busy || expired || result || operationPending.current) return false;
    operationPending.current = true;
    try {
      const payload = answerPayload();
      if (hasUnsavedAnswers && payload.length) {
        await saveAnswers.mutateAsync({ attemptId, answers: payload });
        setLastSavedSignature(JSON.stringify(payload));
      }
      if (nextIndex !== undefined) setCurrentIndex(nextIndex);
      return true;
    } catch {
      /* Keep answers on screen and expose the retry below. */
      return false;
    } finally {
      operationPending.current = false;
    }
  }

  async function submit() {
    if (!assessment.data || result || operationPending.current) return;
    operationPending.current = true;
    const payload = answerPayload();
    try {
      if (payload.length && !expired) {
        await saveAnswers.mutateAsync({ attemptId, answers: payload });
      }
      const submitted = await submitAttempt.mutateAsync({ attemptId });
      setSubmittedResult(submitted);
      if (storageKey) {
        try {
          Storage.removeItemSync(storageKey);
        } catch {
          /* Terminal server status prevents draft reuse. */
        }
      }
      await Promise.all([
        utils.learning.invalidate(),
        utils.gamification.invalidate(),
        utils.assessmentEvent.invalidate(),
        utils.assessment.invalidate(),
      ]);
      if (assessment.data.event) {
        router.replace({
          pathname: "/events/[eventId]",
          params: { eventId: assessment.data.event.id },
        });
      } else {
        router.replace({
          pathname: "/courses/[courseId]/items/[courseItemId]",
          params: { courseId, courseItemId },
        });
      }
    } catch {
      // Mutation errors are rendered below.
    } finally {
      operationPending.current = false;
    }
  }

  const loading = assessment.isPending || attempt.isPending;
  const error = assessment.error ?? attempt.error;
  function confirmSubmit() {
    Alert.alert(
      "Submit assessment?",
      expired
        ? "Time is up. Only answers already saved to the server can be graded."
        : `${answeredCount} of ${assessment.data?.questions.length ?? 0} questions answered. Submission is final.`,
      [
        { text: "Keep reviewing", style: "cancel" },
        { text: "Submit", onPress: () => void submit() },
      ],
    );
  }

  function leaveResult() {
    if (assessment.data?.event) {
      router.replace({
        pathname: "/events/[eventId]",
        params: { eventId: assessment.data.event.id },
      });
      return;
    }
    router.replace({
      pathname: "/courses/[courseId]",
      params: { courseId },
    });
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: assessment.data?.title ?? "Assessment",
          headerBackButtonDisplayMode: "minimal",
        }}
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
        <ScrollView
          ref={resultScrollRef}
          className="flex-1 bg-background"
          contentContainerClassName="gap-6 px-5 pb-14 pt-6"
          contentInsetAdjustmentBehavior="automatic"
        >
          <StudyGlass>
            <View className="size-16 self-center items-center justify-center rounded-full bg-primary/10">
              <Text className="text-2xl font-black text-primary">✓</Text>
            </View>
            <Text className="text-center text-2xl font-black text-foreground">
              {result.status === "IN_REVIEW"
                ? "Awaiting review"
                : "Assessment reviewed"}
            </Text>
            {result.status === "GRADED" ? (
              <Text className="text-lg text-muted-foreground">
                Score: {result.score}/{result.maxScore}
              </Text>
            ) : (
              <Text className="text-center text-sm leading-5 text-muted-foreground">
                Your detailed result will appear here after the teacher finishes
                reviewing it.
              </Text>
            )}
          </StudyGlass>

          <AssessmentResultReview
            assessment={assessment.data}
            attempt={attempt.data}
            resolveAssetUrl={resolveAssetUrl}
            onQuestionChange={() =>
              resultScrollRef.current?.scrollTo({ y: 0, animated: false })
            }
          />

          {assessment.data.event ? (
            <StudyAction onPress={leaveResult}>
              View score & leaderboard
            </StudyAction>
          ) : null}
        </ScrollView>
      ) : question ? (
        <ScrollView
          ref={scrollRef}
          className="flex-1 bg-background"
          contentContainerClassName="gap-4 px-5 pb-14 pt-4"
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
        >
          {deadline !== null ? (
            <Text
              accessibilityLiveRegion={expired ? "polite" : "none"}
              className={
                expired
                  ? "text-sm font-bold text-destructive"
                  : "text-sm font-bold text-primary"
              }
            >
              {expired
                ? "Time is up · submit your saved answers"
                : `${Math.floor(Math.max(0, deadline - now) / 60_000)}:${String(Math.floor(Math.max(0, deadline - now) / 1000) % 60).padStart(2, "0")} remaining`}
            </Text>
          ) : null}
          <AssessmentQuestion
            current={currentIndex}
            total={assessment.data.questions.length}
            answered={answeredCount}
            onOpen={openQuestions}
            disabled={busy}
          >
            <NativeContentRenderer
              content={question.prompt}
              resolveAssetUrl={resolveAssetUrl}
            />
          </AssessmentQuestion>
          <Text className="text-sm font-bold text-foreground">
            {question.type === "WRITTEN"
              ? "Write your answer"
              : question.type === "MULTIPLE_CHOICE"
                ? "Select every correct answer"
                : "Choose one answer"}
          </Text>
          {question.type === "WRITTEN" ? (
            <StudyGlass>
              <TextInput
                accessibilityLabel={`Answer to question ${currentIndex + 1}`}
                className="min-h-32 text-base text-foreground"
                multiline
                editable={!busy && !expired}
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
            </StudyGlass>
          ) : (
            <View className="gap-3">
              {question.options.map((option, optionIndex) => (
                <AssessmentOption
                  key={option.id}
                  index={optionIndex}
                  selected={
                    answers[question.id]?.optionIds.includes(option.id) ?? false
                  }
                  multiple={question.type === "MULTIPLE_CHOICE"}
                  disabled={busy || expired}
                  onPress={() => chooseOption(option.id)}
                >
                  <NativeContentRenderer
                    content={option.content}
                    resolveAssetUrl={resolveAssetUrl}
                  />
                </AssessmentOption>
              ))}
            </View>
          )}
          <Text className="text-xs leading-5 text-muted-foreground">
            You can change answers until you submit. Answers save when you move
            between questions.
            {deadline !== null ? " The timer continues if you leave." : ""}
          </Text>
          {draftError ? (
            <Text
              accessibilityRole="alert"
              className="text-sm text-destructive"
            >
              {draftError}
            </Text>
          ) : null}
          {saveAnswers.isError || submitAttempt.isError ? (
            <Text
              accessibilityRole="alert"
              className="text-sm text-destructive"
            >
              {saveAnswers.error?.message ?? submitAttempt.error?.message}
            </Text>
          ) : null}
          <View className="gap-3 border-t border-border pt-4">
            <View className="flex-row gap-3">
              {currentIndex > 0 ? (
                <View className="flex-1">
                  <StudyAction
                    secondary
                    disabled={busy}
                    onPress={() =>
                      expired
                        ? setCurrentIndex((index) => index - 1)
                        : void save(currentIndex - 1)
                    }
                  >
                    Previous
                  </StudyAction>
                </View>
              ) : null}
              {currentIndex < assessment.data.questions.length - 1 ||
              (nextUnanswered >= 0 && nextUnanswered !== currentIndex) ? (
                <View className="flex-1">
                  <StudyAction
                    disabled={busy}
                    onPress={() => {
                      const next =
                        currentIndex < assessment.data.questions.length - 1
                          ? currentIndex + 1
                          : nextUnanswered;
                      if (expired) setCurrentIndex(next);
                      else void save(next);
                    }}
                  >
                    {currentIndex < assessment.data.questions.length - 1
                      ? "Next →"
                      : "Next unanswered →"}
                  </StudyAction>
                </View>
              ) : null}
            </View>
            {hasUnsavedAnswers && !expired ? (
              <StudyAction
                secondary
                disabled={busy}
                loading={saveAnswers.isPending}
                onPress={() => void save()}
              >
                {saveAnswers.isPending ? "Saving answers…" : "Save answers"}
              </StudyAction>
            ) : null}
            {expired ||
            currentIndex === assessment.data.questions.length - 1 ||
            answeredCount === assessment.data.questions.length ? (
              <StudyAction
                loading={submitAttempt.isPending}
                disabled={busy}
                onPress={confirmSubmit}
              >
                {busy
                  ? "Saving…"
                  : answeredCount === assessment.data.questions.length
                    ? "Submit assessment"
                    : `Submit · ${answeredCount}/${assessment.data.questions.length} answered`}
              </StudyAction>
            ) : null}
          </View>
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
