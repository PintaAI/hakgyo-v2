import { router, Stack, useLocalSearchParams } from "expo-router";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { useAppTheme } from "../../../../../../src/providers/AppThemeProvider";
import { useMobileSyncActions } from "../../../../../../src/providers/MobileSyncProvider";
import { useLearnerAttempt } from "../../../../../../src/sync/hooks";

type Answer = { content?: string; optionIds: string[] };

function buildAnswerPayload(
  questions: readonly { id: string; type: string }[] | undefined,
  answers: Record<string, Answer>,
) {
  return (
    questions?.flatMap((question) => {
      const answer = answers[question.id];
      if (!answer) return [];
      return [
        {
          questionId: question.id,
          optionIds: answer.optionIds,
          ...(question.type === "WRITTEN"
            ? { content: answer.content ?? "" }
            : {}),
        },
      ];
    }) ?? []
  );
}

function persistAssessmentDraft(
  storageKey: string,
  answers: Record<string, Answer>,
) {
  Storage.setItemSync(storageKey, JSON.stringify(answers));
}

const AssessmentDeadline = memo(function AssessmentDeadline({
  deadline,
  onExpire,
}: {
  deadline: number;
  onExpire: () => void;
}) {
  const [now, setNow] = useState(Date.now);
  const reportedExpiration = useRef(false);

  useEffect(() => {
    reportedExpiration.current = false;
    if (Date.now() >= deadline) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [deadline]);

  const expired = now >= deadline;
  useEffect(() => {
    if (!expired || reportedExpiration.current) return;
    reportedExpiration.current = true;
    onExpire();
  }, [expired, onExpire]);

  return (
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
  );
});

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
  const { activeOrganizationId } = useAppTheme();
  const { completeAssessment } = useMobileSyncActions();
  const resolveAssetUrl = useApiAssetResolver();
  // Resumable attempts come from the local index / persisted start result;
  // graded ones from the persisted checkpoint result. Online otherwise.
  const { assessment, attempt } = useLearnerAttempt(attemptId, courseItemId);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [hasUnsavedAnswers, setHasUnsavedAnswers] = useState(false);
  const initialized = useRef<string | null>(null);
  const latestDraft = useRef<Record<string, Answer>>({});
  const latestDraftKey = useRef<string | null>(null);
  const shouldPersistLatestDraft = useRef(false);
  const draftCompleted = useRef(false);
  const [expiredDeadline, setExpiredDeadline] = useState<number | null>(null);
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
  const expired =
    deadline !== null &&
    (Date.now() >= deadline || expiredDeadline === deadline);
  const busy = submitting;
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
    draftCompleted.current = false;
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
    setAnswers(saved);
    setHasUnsavedAnswers(false);
  }, [assessment.data, attempt.data, attemptId, storageKey]);

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
    const timer = setTimeout(() => {
      try {
        persistAssessmentDraft(storageKey, answers);
        setDraftError(undefined);
        setHasUnsavedAnswers(false);
      } catch {
        setDraftError("Device draft unavailable. It will retry as you work.");
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [answers, attemptId, storageKey, hasResult, attempt.data?.status]);

  latestDraft.current = answers;
  latestDraftKey.current = storageKey;
  shouldPersistLatestDraft.current =
    Boolean(Object.keys(answers).length) &&
    initialized.current === attemptId &&
    !hasResult &&
    attempt.data?.status === "IN_PROGRESS";

  useEffect(
    () => () => {
      if (
        draftCompleted.current ||
        !shouldPersistLatestDraft.current ||
        !latestDraftKey.current
      )
        return;
      try {
        persistAssessmentDraft(latestDraftKey.current, latestDraft.current);
      } catch {
        // The screen is unmounting; the next visit still has server answers.
      }
    },
    [],
  );

  const question = assessment.data?.questions[currentIndex];
  const statuses: QuestionStatus[] = useMemo(
    () =>
      (assessment.data?.questions ?? []).map((item) =>
        isQuestionAnswered(answers[item.id]) ? "answered" : "unanswered",
      ),
    [answers, assessment.data?.questions],
  );
  const answeredCount = useMemo(
    () => statuses.filter((status) => status === "answered").length,
    [statuses],
  );
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
    setHasUnsavedAnswers(true);
  }

  async function save(nextIndex?: number) {
    if (busy || expired || result || operationPending.current) return false;
    if (storageKey) {
      try {
        persistAssessmentDraft(storageKey, answers);
        setDraftError(undefined);
      } catch {
        setDraftError("Device draft unavailable. It will retry as you work.");
        return false;
      }
    }
    setHasUnsavedAnswers(false);
    if (nextIndex !== undefined) setCurrentIndex(nextIndex);
    return true;
  }

  async function submit() {
    if (!assessment.data || result || operationPending.current) return;
    operationPending.current = true;
    setSubmitting(true);
    setSubmitError(undefined);
    const payload = buildAnswerPayload(assessment.data.questions, answers);
    try {
      const sync = await completeAssessment({
        attemptId,
        answers: payload,
        organizationId: activeOrganizationId ?? undefined,
      });
      if (sync.state === "synced") {
        const operationId = `assessment:${attemptId}`;
        const failure = sync.result.failures.find(
          (entry) => entry.id === operationId,
        );
        if (
          failure ||
          !sync.result.acknowledgedOperationIds.includes(operationId)
        ) {
          setSubmitError(
            failure?.message ??
              "The assessment is saved on this device but was not accepted by the server.",
          );
          return;
        }
        const submitted = sync.result.results.find(
          (entry) => entry.id === operationId,
        )?.assessment;
        if (
          submitted &&
          (submitted.status === "GRADED" || submitted.status === "IN_REVIEW")
        ) {
          setSubmittedResult({
            status: submitted.status,
            score: submitted.score ?? 0,
            maxScore: submitted.maxScore ?? 0,
          });
        }
      } else {
        Alert.alert(
          "Saved on this device",
          "Your completed assessment is queued and will submit at the next online sync checkpoint.",
        );
      }
      draftCompleted.current = true;
      if (storageKey) {
        try {
          Storage.removeItemSync(storageKey);
        } catch {
          /* Terminal server status prevents draft reuse. */
        }
      }
      if (sync.state === "synced") {
        await Promise.all([
          utils.learning.invalidate(undefined, { refetchType: "none" }),
          utils.gamification.invalidate(undefined, { refetchType: "none" }),
          utils.assessmentEvent.invalidate(undefined, { refetchType: "none" }),
          utils.assessment.invalidate(undefined, { refetchType: "none" }),
        ]);
      }
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
    } catch (cause) {
      setSubmitError(
        cause instanceof Error
          ? cause.message
          : "The assessment could not be saved on this device.",
      );
    } finally {
      operationPending.current = false;
      setSubmitting(false);
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

  const expireAttempt = useCallback(() => {
    if (deadline !== null) setExpiredDeadline(deadline);
  }, [deadline]);

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
            <AssessmentDeadline deadline={deadline} onExpire={expireAttempt} />
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
                onChangeText={(content) => {
                  setAnswers((current) => ({
                    ...current,
                    [question.id]: { content, optionIds: [] },
                  }));
                  setHasUnsavedAnswers(true);
                }}
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
            You can change answers until you submit. Drafts save on this device
            as you work.
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
          {submitError ? (
            <Text
              accessibilityRole="alert"
              className="text-sm text-destructive"
            >
              {submitError}
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
                        currentIndex <
                        (assessment.data?.questions.length ?? 0) - 1
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
            {!expired ? (
              <Text className="text-center text-xs text-muted-foreground">
                {hasUnsavedAnswers
                  ? "Saving draft on this device…"
                  : "Draft saved on this device"}
              </Text>
            ) : null}
            {expired ||
            currentIndex === assessment.data.questions.length - 1 ||
            answeredCount === assessment.data.questions.length ? (
              <StudyAction
                loading={submitting}
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
