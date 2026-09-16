import type { RouterOutputs } from "@hakgyo/api";
import { Stack } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import type { NativeGesture } from "react-native-gesture-handler";

import {
  isVocabularyAnswerCorrect,
  type Word,
} from "../lib/vocabulary-practice";
import { api } from "../lib/trpc";
import { useAppTheme } from "../providers/AppThemeProvider";
import { toolbarIcons } from "../theme/toolbar-icons";
import { Action, Empty, QueryState } from "./learning-ui";
import {
  VocabularyPracticeDeck,
  type VocabularyPracticeDeckHandle,
} from "./vocabulary-practice-deck";

type Challenge = RouterOutputs["learning"]["startVocabularyRecall"];
type RecallEvidence = Pick<
  RouterOutputs["learning"]["submitVocabularyRecall"],
  "items" | "practiced" | "remembered"
>;

function errorCode(error: unknown) {
  if (!error || typeof error !== "object" || !("data" in error)) return;
  return (error.data as { code?: string } | undefined)?.code;
}

export function VocabularySession({
  words,
  vocabularySetId,
  sourceCourseItemId,
  scrollGesture,
  onRoundActiveChange,
  onComplete,
  saving,
  saveError,
}: {
  words: Word[];
  vocabularySetId: string;
  sourceCourseItemId: string;
  scrollGesture: NativeGesture;
  onRoundActiveChange?: (active: boolean) => void;
  onComplete: () => Promise<void>;
  saving: boolean;
  saveError?: string;
}) {
  const { colors } = useAppTheme();
  const { width: screenWidth } = useWindowDimensions();
  const scope = { vocabularySetId, sourceCourseItemId };
  const memoryQuery = api.learning.getVocabularyMemory.useQuery(scope, {
    retry: false,
  });
  const startRecall = api.learning.startVocabularyRecall.useMutation();
  const submitRecall = api.learning.submitVocabularyRecall.useMutation();
  const [latestEvidence, setLatestEvidence] = useState<RecallEvidence>();
  const [queue, setQueue] = useState<Word[]>([]);
  const [index, setIndex] = useState(0);
  const [challenge, setChallenge] = useState<Challenge>();
  const [answer, setAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);
  const answerClaim = useRef<"unanswered" | "revealed" | "answered">(
    "unanswered",
  );
  const [roundKey, setRoundKey] = useState(0);
  const [feedback, setFeedback] = useState<{
    correct: boolean;
    saved: boolean;
  }>();
  const [roundActive, setRoundActive] = useState(false);
  const [sessionError, setSessionError] = useState<string>();
  const [moving, setMoving] = useState(false);
  const deckRef = useRef<VocabularyPracticeDeckHandle>(null);
  const usableWords = useMemo(
    () => words.filter((word) => word.term.trim() && word.definition.trim()),
    [words],
  );
  const evidence = latestEvidence ?? memoryQuery.data;
  const memoryByEntry = useMemo(
    () => new Map(evidence?.items.map((item) => [item.entryId, item]) ?? []),
    [evidence?.items],
  );
  const now = Date.now();
  const unpracticedWords = usableWords.filter(
    (word) => !memoryByEntry.get(word.id)?.practiced,
  );
  const reviewDueWords = usableWords.filter((word) => {
    const memory = memoryByEntry.get(word.id);
    return (
      !memory?.remembered &&
      (!memory?.nextReviewAt || memory.nextReviewAt.getTime() <= now)
    );
  });
  const readyWords = evidence?.practiced ? reviewDueWords : unpracticedWords;
  const practicedCount =
    evidence?.items.filter((item) => item.practiced).length ?? 0;
  const masteredCount =
    evidence?.items.filter((item) => item.remembered).length ?? 0;
  const progress = usableWords.length
    ? Math.min(100, Math.round((practicedCount / usableWords.length) * 100))
    : 0;
  const currentWord = queue[index];
  const deckCards = useMemo(
    () =>
      queue.map((word, ordinal) => ({
        id: word.id,
        prompt:
          ordinal === index && challenge?.entryId === word.id
            ? challenge.prompt
            : word.definition,
        answer: word.term,
        imageAssetId: word.imageAssetId,
        imageAccessibilityLabel: `${word.term} illustration`,
      })),
    [challenge, index, queue],
  );
  const requestBusy = startRecall.isPending || submitRecall.isPending;
  const busy = requestBusy || moving;
  const toolbarInputWidth = Math.max(140, Math.min(screenWidth - 104, 520));

  useEffect(() => {
    onRoundActiveChange?.(roundActive && !evidence?.remembered);
  }, [evidence?.remembered, onRoundActiveChange, roundActive]);

  useEffect(
    () => () => {
      onRoundActiveChange?.(false);
    },
    [onRoundActiveChange],
  );

  async function refreshStatus() {
    const refreshed = await memoryQuery.refetch();
    if (refreshed.data) {
      setLatestEvidence({
        items: refreshed.data.items,
        practiced: refreshed.data.practiced,
        remembered: refreshed.data.remembered,
      });
    }
  }

  async function openChallenge(word: Word) {
    startRecall.reset();
    submitRecall.reset();
    setSessionError(undefined);
    setChallenge(undefined);
    setAnswer("");
    setFeedback(undefined);
    setRevealed(false);
    answerClaim.current = "unanswered";
    try {
      const started = await startRecall.mutateAsync({
        ...scope,
        entryId: word.id,
      });
      setChallenge(started);
    } catch (error) {
      if (errorCode(error) === "PRECONDITION_FAILED") {
        await refreshStatus();
        setRoundActive(false);
        setSessionError(
          "Your review schedule changed, so we refreshed this practice round.",
        );
      } else {
        setSessionError(
          "We couldn’t start this word. Check your connection and try again.",
        );
      }
    }
  }

  function beginRound() {
    if (!readyWords.length || busy) return;
    const nextQueue = [...readyWords];
    setQueue(nextQueue);
    setIndex(0);
    setRoundKey((value) => value + 1);
    setRoundActive(true);
    setMoving(false);
    void openChallenge(nextQueue[0]!);
  }

  async function checkAnswer() {
    if (
      !challenge ||
      !currentWord ||
      !answer.trim() ||
      feedback ||
      busy ||
      answerClaim.current !== "unanswered"
    )
      return;
    answerClaim.current = "answered";
    const submittedAnswer = answer.trim();
    setFeedback({
      correct: isVocabularyAnswerCorrect(submittedAnswer, currentWord.term),
      saved: false,
    });
    submitRecall.reset();
    setSessionError(undefined);
    try {
      const result = await submitRecall.mutateAsync({
        challengeId: challenge.challengeId,
        answer: submittedAnswer,
      });
      setLatestEvidence({
        items: result.items,
        practiced: result.practiced,
        remembered: result.remembered,
      });
      setFeedback({ correct: result.correct, saved: true });
    } catch (error) {
      answerClaim.current = "unanswered";
      setFeedback(undefined);
      setSessionError(
        errorCode(error) === "PRECONDITION_FAILED"
          ? "This word expired or changed. Restart it to keep your progress accurate."
          : "Your answer wasn’t saved. Check your connection and try again.",
      );
    }
  }

  async function nextWord() {
    const nextIndex = index + 1;
    if (nextIndex < queue.length) {
      setIndex(nextIndex);
      await openChallenge(queue[nextIndex]!);
      return;
    }
    setRoundActive(false);
    setChallenge(undefined);
    setFeedback(undefined);
    await refreshStatus();
  }

  function advanceCard() {
    if ((!feedback?.saved && !revealed) || busy) return;
    deckRef.current?.advance();
  }

  function revealAnswer() {
    if (
      !challenge ||
      !currentWord ||
      busy ||
      answerClaim.current !== "unanswered"
    )
      return;
    answerClaim.current = "revealed";
    setRevealed(true);
    setAnswer("");
    // This is local study only. Do not submit a recall or update evidence.
  }

  function finishAdvance() {
    setMoving(false);
    void nextWord();
  }

  function restartWord() {
    if (currentWord) void openChallenge(currentWord);
  }

  if (memoryQuery.isPending) {
    return (
      <View className="min-h-64 items-center justify-center gap-3">
        <ActivityIndicator color={colors.primary} />
        <Text className="text-sm text-muted-foreground">
          Loading your saved practice…
        </Text>
      </View>
    );
  }

  if (memoryQuery.isError) {
    return (
      <QueryState
        pending={false}
        error={memoryQuery.error}
        retry={() => void memoryQuery.refetch()}
      />
    );
  }

  if (!usableWords.length) {
    return <Empty>This set has no words ready for practice.</Empty>;
  }

  if (evidence?.practiced && !roundActive) {
    return (
      <View className="items-center gap-5 rounded-3xl border border-primary/30 bg-primary/10 px-5 py-8">
        <View className="size-16 items-center justify-center rounded-full bg-primary">
          <SymbolView
            fallback={
              <Text className="text-2xl font-black text-primary-foreground">
                ✓
              </Text>
            }
            name="checkmark"
            size={28}
            tintColor={colors.primaryForeground}
            weight="bold"
          />
        </View>
        <View className="items-center gap-2">
          <Text className="text-center text-2xl font-black text-foreground">
            {evidence.remembered ? "Vocabulary mastered" : "Practice complete"}
          </Text>
          <Text className="text-center text-sm leading-6 text-muted-foreground">
            {evidence.remembered
              ? "Every word has been recalled successfully. Your answers are saved to your account."
              : `You practiced every word once. ${masteredCount} of ${usableWords.length} are mastered, and you can review them again later.`}
          </Text>
        </View>
        <Action
          disabled={saving}
          onPress={() => void onComplete().catch(() => undefined)}
        >
          {saving ? "Saving course progress…" : "Continue learning →"}
        </Action>
        {reviewDueWords.length ? (
          <Action secondary onPress={beginRound}>
            {`Review again · ${reviewDueWords.length} words`}
          </Action>
        ) : null}
        {saveError ? (
          <Text accessibilityRole="alert" className="text-sm text-destructive">
            Course progress wasn’t saved. Tap continue to try again.
          </Text>
        ) : null}
      </View>
    );
  }

  if (!roundActive) {
    return (
      <View className="gap-5">
        <View className="gap-3 rounded-3xl bg-muted p-5">
          <View className="flex-row items-end justify-between gap-4">
            <View className="min-w-0 flex-1 gap-1">
              <Text className="text-xs font-bold uppercase tracking-[1.4px] text-primary">
                Your progress
              </Text>
              <Text className="text-2xl font-black text-foreground">
                {practicedCount} of {usableWords.length} practiced
              </Text>
            </View>
            <Text className="text-sm font-bold text-muted-foreground">
              {progress}%
            </Text>
          </View>
          <View
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: progress }}
            className="h-2 overflow-hidden rounded-full bg-background"
          >
            <View
              className="h-full rounded-full bg-primary"
              style={{ width: `${progress}%` }}
            />
          </View>
          <Text className="text-sm leading-5 text-muted-foreground">
            Finish one pass through the set to continue. Mastery reviews stay
            available without blocking your course.
          </Text>
        </View>

        {readyWords.length ? (
          <View className="gap-3">
            <Text className="text-base leading-6 text-muted-foreground">
              {readyWords.length}{" "}
              {readyWords.length === 1 ? "word is" : "words are"} left in this
              round.
            </Text>
            <Action onPress={beginRound}>
              {`Start practice · ${readyWords.length} words`}
            </Action>
          </View>
        ) : (
          <View className="items-center gap-4 rounded-3xl border border-border bg-card p-6">
            <Text className="text-3xl">🌱</Text>
            <View className="items-center gap-2">
              <Text className="text-xl font-black text-foreground">
                Great work for now
              </Text>
              <Text className="text-center text-sm leading-6 text-muted-foreground">
                Your answers are saved. Refresh to load the remaining words.
              </Text>
            </View>
            <Action secondary onPress={() => void refreshStatus()}>
              Check again
            </Action>
          </View>
        )}
        {sessionError ? (
          <Text accessibilityRole="alert" className="text-sm text-primary">
            {sessionError}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View className="min-h-0 flex-1">
      <Stack.Toolbar
        placement="bottom"
        backgroundColor={colors.background}
        tintColor={colors.primary}
      >
        <Stack.Toolbar.View>
          <TextInput
            accessibilityLabel={`Korean word for ${challenge?.prompt ?? currentWord?.definition ?? "current word"}`}
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={(value) => {
              if (answerClaim.current === "unanswered" && !busy)
                setAnswer(value);
            }}
            onSubmitEditing={() => {
              if (feedback?.saved || revealed) advanceCard();
              else if (!feedback) void checkAnswer();
            }}
            placeholder={
              revealed
                ? "Ready for the next word?"
                : challenge
                  ? "Type the Korean word"
                  : "Preparing next word…"
            }
            placeholderTextColor={colors.mutedForeground}
            returnKeyType={feedback?.saved || revealed ? "next" : "done"}
            selectionColor={colors.primary}
            submitBehavior="submit"
            style={{
              color: colors.foreground,
              fontSize: 16,
              height: 44,
              paddingHorizontal: 16,
              textAlign: "center",
              width: toolbarInputWidth,
            }}
            value={answer}
          />
        </Stack.Toolbar.View>
        <Stack.Toolbar.Button
          accessibilityLabel={
            feedback || revealed
              ? index + 1 < queue.length
                ? "Next word"
                : "Finish round"
              : "Check answer"
          }
          disabled={
            feedback || revealed
              ? (!feedback?.saved && !revealed) || busy
              : !challenge || !answer.trim() || busy
          }
          icon={feedback || revealed ? toolbarIcons.next : toolbarIcons.submit}
          onPress={
            feedback || revealed ? advanceCard : () => void checkAnswer()
          }
          variant="prominent"
        />
      </Stack.Toolbar>

      <View className="absolute inset-x-0 top-0 z-10 flex-row items-center justify-between gap-4">
        <Text className="text-xs font-bold uppercase tracking-[1.4px] text-muted-foreground">
          Word {index + 1} of {queue.length}
        </Text>
        <Text className="text-xs font-semibold text-muted-foreground">
          {masteredCount}/{usableWords.length} mastered
        </Text>
      </View>

      <View className="min-h-0 flex-1 justify-center gap-2">
        <Text className="text-center text-xs leading-5 text-muted-foreground">
          {!challenge || startRecall.isPending
            ? "Preparing this word…"
            : moving
              ? "Bringing up the next card…"
              : revealed
                ? "Just studying · no XP or streak change. Swipe up or tap Next."
                : feedback
                  ? !feedback.saved
                    ? feedback.correct
                      ? "Correct — saving…"
                      : "We’ll review this again — saving…"
                    : feedback.correct
                      ? "Correct and saved. Swipe up or tap Next."
                      : "Saved for an earlier review. Swipe up or tap Next."
                  : "Type the Korean word, peel the bottom-right corner to reveal, or swipe up to skip."}
        </Text>
        <VocabularyPracticeDeck
          key={roundKey}
          ref={deckRef}
          cards={deckCards}
          index={index}
          correct={feedback?.correct}
          revealed={revealed}
          onReveal={revealAnswer}
          scrollGesture={scrollGesture}
          disabled={requestBusy || !challenge}
          onInteractionChange={setMoving}
          onAdvanceComplete={finishAdvance}
        />
      </View>

      {sessionError ? (
        <View className="gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4">
          <Text
            accessibilityRole="alert"
            className="text-sm leading-5 text-destructive"
          >
            {sessionError}
          </Text>
          {errorCode(submitRecall.error) === "PRECONDITION_FAILED" ? (
            <Action secondary onPress={restartWord}>
              Restart this word
            </Action>
          ) : submitRecall.isError ? (
            <Action secondary onPress={() => void checkAnswer()}>
              Retry saving answer
            </Action>
          ) : startRecall.isError && currentWord ? (
            <Action secondary onPress={restartWord}>
              Try again
            </Action>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
