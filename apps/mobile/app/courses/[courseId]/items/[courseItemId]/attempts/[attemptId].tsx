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
  NativeContentRenderer,
  useApiAssetResolver,
} from "../../../../../../src/components/content-renderer";
import { api } from "../../../../../../src/lib/trpc";
import { authClient } from "../../../../../../src/lib/auth-client";
import { restoreAssessmentDraft } from "../../../../../../src/lib/assessment-draft";

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
  const [result, setResult] = useState<{
    status: "GRADED" | "IN_REVIEW";
    score: number;
    maxScore: number;
  }>();

  useEffect(() => {
    if (!attempt.data || !storageKey || initialized.current === attemptId)
      return;
    initialized.current = attemptId;
    let saved: Record<string, Answer> = Object.fromEntries(
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
    if (storageKey && attempt.data.status === "IN_PROGRESS") {
      try {
        saved = restoreAssessmentDraft(saved, Storage.getItemSync(storageKey));
      } catch {
        setDraftError(
          "The local draft could not be restored. Your last server-saved answers are shown.",
        );
      }
    }
    setAnswers(saved);
  }, [attempt.data, attemptId, storageKey]);

  useEffect(() => {
    if (attempt.data && attempt.data.status !== "IN_PROGRESS") {
      setResult({
        status: attempt.data.status === "GRADED" ? "GRADED" : "IN_REVIEW",
        score: attempt.data.score ?? 0,
        maxScore: attempt.data.maxScore ?? 0,
      });
    }
  }, [attempt.data]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (
      !storageKey ||
      initialized.current !== attemptId ||
      result ||
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
  }, [answers, attemptId, storageKey, result, attempt.data?.status]);

  const question = assessment.data?.questions[currentIndex];

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

  function answerPayload() {
    return (
      assessment.data?.questions.flatMap((item) => {
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
      }) ?? []
    );
  }

  async function save(nextIndex?: number) {
    if (busy || expired || result) return;
    try {
      const payload = answerPayload();
      if (payload.length)
        await saveAnswers.mutateAsync({ attemptId, answers: payload });
      if (nextIndex !== undefined) setCurrentIndex(nextIndex);
    } catch {
      /* Keep answers on screen and expose the retry below. */
    }
  }

  async function submit() {
    if (!assessment.data) return;
    const payload = answerPayload();
    try {
      if (payload.length && !expired) {
        await saveAnswers.mutateAsync({ attemptId, answers: payload });
      }
      const submitted = await submitAttempt.mutateAsync({ attemptId });
      setResult(submitted);
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
    } catch {
      // Mutation errors are rendered below.
    }
  }

  const loading = assessment.isPending || attempt.isPending;
  const error = assessment.error ?? attempt.error;
  function confirmSubmit() {
    const answeredCount = Object.values(answers).filter(
      (answer) => answer.optionIds.length > 0 || answer.content?.trim(),
    ).length;
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
          headerShown: true,
          title: assessment.data?.title ?? "Assessment",
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
          className="flex-1 bg-background"
          contentContainerClassName="gap-6 px-5 pb-14 pt-6"
          contentInsetAdjustmentBehavior="automatic"
        >
          <View className="items-center gap-3 py-4">
            <View className="size-16 items-center justify-center rounded-full bg-primary/10">
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
          </View>

          <AssessmentResultReview
            assessment={assessment.data}
            attempt={attempt.data}
            resolveAssetUrl={resolveAssetUrl}
          />

          <Pressable
            className="items-center rounded-full bg-primary px-6 py-4"
            onPress={leaveResult}
          >
            <Text className="font-black text-primary-foreground">
              {assessment.data.event
                ? "View score & leaderboard"
                : "Return to course"}
            </Text>
          </Pressable>
        </ScrollView>
      ) : question ? (
        <ScrollView
          className="flex-1 bg-background"
          contentContainerClassName="gap-5 px-5 pb-14 pt-4"
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
        >
          {deadline !== null ? (
            <Text className="text-base font-semibold text-primary">
              {expired
                ? "Time is up · submit saved answers"
                : `${Math.floor(Math.max(0, deadline - now) / 60_000)}:${String(Math.floor(Math.max(0, deadline - now) / 1000) % 60).padStart(2, "0")} remaining`}
            </Text>
          ) : null}
          {draftError ? (
            <Text
              accessibilityRole="alert"
              className="text-sm text-destructive"
            >
              {draftError}
            </Text>
          ) : null}
          <Text className="text-xs text-muted-foreground">
            Answers save to the server when you move between questions or tap
            Save answers. The timer continues if you leave.
          </Text>
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-black uppercase tracking-[1.5px] text-muted-foreground">
              Question {currentIndex + 1} of {assessment.data.questions.length}
            </Text>
            <Text className="text-xs font-bold text-muted-foreground">
              {question.points} pt
            </Text>
          </View>
          <View className="gap-5 rounded-xl border border-border bg-card p-5">
            <NativeContentRenderer
              content={question.prompt}
              resolveAssetUrl={resolveAssetUrl}
            />
            {question.type === "WRITTEN" ? (
              <TextInput
                className="min-h-32 rounded-xl border border-border bg-background p-4 text-foreground"
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
            ) : (
              <View className="gap-3">
                {question.options.map((option) => {
                  const selected = answers[question.id]?.optionIds.includes(
                    option.id,
                  );
                  return (
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityState={{
                        checked: !!selected,
                        disabled: busy || expired,
                      }}
                      disabled={busy || expired}
                      className={`flex-row items-center gap-3 rounded-xl border p-4 ${selected ? "border-primary bg-primary/10" : "border-border"}`}
                      key={option.id}
                      onPress={() => chooseOption(option.id)}
                    >
                      <View
                        className={`size-5 rounded-full border ${selected ? "border-primary bg-primary" : "border-border"}`}
                      />
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
            )}
          </View>
          <View className="flex-row gap-3">
            <Pressable
              className="flex-1 items-center rounded-full border border-border px-5 py-4 disabled:opacity-40"
              disabled={currentIndex === 0 || busy}
              onPress={() =>
                expired
                  ? setCurrentIndex((index) => index - 1)
                  : void save(currentIndex - 1)
              }
            >
              <Text className="font-black text-foreground">Previous</Text>
            </Pressable>
            {currentIndex < assessment.data.questions.length - 1 ? (
              <Pressable
                className="flex-1 items-center rounded-full bg-primary px-5 py-4"
                disabled={busy}
                onPress={() =>
                  expired
                    ? setCurrentIndex((index) => index + 1)
                    : void save(currentIndex + 1)
                }
              >
                <Text className="font-black text-primary-foreground">Next</Text>
              </Pressable>
            ) : (
              <Pressable
                className="flex-1 items-center rounded-full bg-primary px-5 py-4 disabled:opacity-50"
                disabled={saveAnswers.isPending || submitAttempt.isPending}
                onPress={confirmSubmit}
              >
                <Text className="font-black text-primary-foreground">
                  {saveAnswers.isPending || submitAttempt.isPending
                    ? "Submitting…"
                    : "Submit"}
                </Text>
              </Pressable>
            )}
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={busy || expired}
            onPress={() => void save()}
            className="min-h-12 items-center justify-center rounded-full border border-border px-5 py-3"
          >
            <Text className="font-bold text-foreground">
              {saveAnswers.isPending ? "Saving…" : "Save answers"}
            </Text>
          </Pressable>
          {saveAnswers.isSuccess ? (
            <Text
              accessibilityLiveRegion="polite"
              className="text-sm text-primary"
            >
              Last save succeeded. Save again after editing.
            </Text>
          ) : null}
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
