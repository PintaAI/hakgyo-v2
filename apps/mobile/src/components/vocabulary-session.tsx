import type { RouterOutputs } from "@hakgyo/api";
import { Stack } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
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
import { isDefinitionCorrect } from "../lib/today-vocabulary-practice";
import {
  matchSpeechAlternative,
  type VocabularySpeechMode,
} from "../lib/vocabulary-speech";
import { useVocabularySpeech } from "../lib/use-vocabulary-speech";
import { VocabularyModeSwitch } from "./vocabulary-mode-switch";
import { api } from "../lib/trpc";
import {
  GameModal,
  GameStartModal,
  GameJourneyFooter,
} from "../games/game-modals";
import { GameBackToolbar } from "../games/game-screens";
import { useGameExitGuard } from "../games/game-navigation";
import { useVocabularyProgressReporter } from "../lib/use-vocabulary-progress";
import { useAppTheme } from "../providers/AppThemeProvider";
import { toolbarIcons } from "../theme/toolbar-icons";
import { Action, Empty, QueryState } from "./learning-ui";
import {
  VocabularyPracticeDeck,
  type VocabularyPracticeDeckHandle,
} from "./vocabulary-practice-deck";

type ProgressEvidence = RouterOutputs["learning"]["getVocabularyProgress"];

export function VocabularySession({
  words,
  vocabularySetId,
  sourceCourseItemId,
  courseId,
  scrollGesture,
  onRoundActiveChange,
  onComplete,
}: {
  words: Word[];
  vocabularySetId: string;
  sourceCourseItemId: string;
  courseId?: string;
  scrollGesture: NativeGesture;
  onRoundActiveChange?: (active: boolean) => void;
  onComplete: () => Promise<void>;
}) {
  const { colors } = useAppTheme();
  const { width: screenWidth } = useWindowDimensions();
  const scope = { vocabularySetId, sourceCourseItemId };
  const progressQuery = api.learning.getVocabularyProgress.useQuery(scope, {
    retry: false,
  });
  const reporter = useVocabularyProgressReporter({
    gameKey: "cards",
    sourceCourseItemId,
    vocabularySetId,
  });
  const [latestEvidence, setLatestEvidence] = useState<ProgressEvidence>();
  const [queue, setQueue] = useState<Word[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [revealSaved, setRevealSaved] = useState(false);
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
  const [mode, setMode] = useState<VocabularySpeechMode>("KR");
  const [handsFree, setHandsFree] = useState(false);
  const [typing, setTyping] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const deckRef = useRef<VocabularyPracticeDeckHandle>(null);
  const answerInputRef = useRef<TextInput>(null);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const usableWords = useMemo(
    () => words.filter((word) => word.term.trim() && word.definition.trim()),
    [words],
  );
  const evidence = latestEvidence ?? progressQuery.data;
  const progressByEntry = useMemo(
    () => new Map(evidence?.items.map((item) => [item.entryId, item]) ?? []),
    [evidence?.items],
  );
  const unpracticedWords = usableWords.filter(
    (word) => !progressByEntry.get(word.id)?.practiced,
  );
  const reviewDueWords = usableWords.filter((word) => {
    const progress = progressByEntry.get(word.id);
    return progress?.due;
  });
  const readyWords = unpracticedWords.length
    ? unpracticedWords
    : reviewDueWords;
  const practicedCount =
    evidence?.items.filter((item) => item.practiced).length ?? 0;
  const masteredCount =
    evidence?.items.filter((item) => item.mastered).length ?? 0;
  const progress = usableWords.length
    ? Math.min(100, Math.round((practicedCount / usableWords.length) * 100))
    : 0;
  const currentWord = queue[index];
  const isStudyMode = mode === "ID";
  const expectedAnswer = currentWord
    ? isStudyMode
      ? currentWord.definition
      : currentWord.term
    : "";
  const deckCards = useMemo(
    () =>
      queue.map((word) => ({
        id: word.id,
        // Both directions are graded recall; the switch only changes which
        // side of the card is used as the prompt.
        prompt: mode === "KR" ? word.definition : word.term,
        answer: mode === "KR" ? word.term : word.definition,
        imageAssetId: word.imageAssetId,
        imageAccessibilityLabel: `${word.term} illustration`,
      })),
    [mode, queue],
  );
  const requestBusy = reporter.isPending;
  const busy = requestBusy || moving;
  // Match / Word Fall pattern: the game board stays mounted behind the
  // start / finish sheets. Before the round starts the deck shows a
  // non-interactive preview of the upcoming words.
  const previewCards = useMemo(
    () =>
      readyWords.map((word) => ({
        id: word.id,
        prompt: mode === "KR" ? word.definition : word.term,
        answer: mode === "KR" ? word.term : word.definition,
        imageAssetId: word.imageAssetId,
        imageAccessibilityLabel: `${word.term} illustration`,
      })),
    [mode, readyWords],
  );
  // Reserve room for mic + submit/next and the native toolbar's item spacing.
  const toolbarInputWidth = Math.max(120, Math.min(screenWidth - 160, 520));

  // Hoisted alongside the other hooks: exitGame is a hoisted function
  // declaration, so referencing it here (above the early returns) is safe.
  const exit = useGameExitGuard({
    active: roundActive,
    locked: requestBusy,
    onExit: exitGame,
  });

  useEffect(() => {
    onRoundActiveChange?.(roundActive);
  }, [onRoundActiveChange, roundActive]);

  useEffect(
    () => () => {
      onRoundActiveChange?.(false);
    },
    [onRoundActiveChange],
  );

  function dismissKeyboard() {
    setKeyboardVisible(false);
    Keyboard.dismiss();
  }

  function prepareWord() {
    reporter.reset();
    setSessionError(undefined);
    setAnswer("");
    setFeedback(undefined);
    setRevealed(false);
    setRevealSaved(false);
    answerClaim.current = "unanswered";
  }

  function beginRound() {
    if (!readyWords.length || busy) return;
    stopSession();
    reporter.startSession();
    const nextQueue = [...readyWords];
    setQueue(nextQueue);
    setIndex(0);
    setRoundKey((value) => value + 1);
    setRoundActive(true);
    setMoving(false);
    prepareWord();
  }

  async function checkAnswer(spokenTranscripts?: readonly string[]) {
    if (
      !currentWord ||
      feedback ||
      busy ||
      answerClaim.current !== "unanswered"
    )
      return;
    const spokenDisplay = spokenTranscripts?.find((text) => text.trim());
    const rawValue = spokenDisplay ?? answer;
    if (!rawValue.trim()) return;
    // Exact match against any STT alternative; fall back to the first
    // transcript so wrong answers are still recorded.
    const submittedAnswer =
      spokenTranscripts?.length && currentWord
        ? (matchSpeechAlternative(expectedAnswer, spokenTranscripts) ??
          spokenDisplay!.trim())
        : rawValue.trim();
    if (spokenDisplay) setAnswer(submittedAnswer);
    answerClaim.current = "answered";
    const correct = isStudyMode
      ? isDefinitionCorrect(
          {
            definition: currentWord.definition,
          },
          submittedAnswer,
        )
      : isVocabularyAnswerCorrect(submittedAnswer, currentWord.term);
    setFeedback({
      correct,
      saved: false,
    });
    await saveAnswer(correct);
  }

  async function saveAnswer(correct: boolean) {
    reporter.reset();
    setSessionError(undefined);
    try {
      await reporter.report({
        entryId: currentWord.id,
        evidence: "RECALL",
        result: correct ? "CORRECT" : "INCORRECT",
      });
      setFeedback({ correct, saved: true });
    } catch {
      setFeedback({ correct, saved: false });
      setSessionError(
        "Your answer couldn’t be saved on this device. Try again.",
      );
    }
  }

  function clearAutoTimer() {
    if (autoAdvanceTimer.current !== undefined) {
      clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = undefined;
    }
  }

  function stopSession() {
    clearAutoTimer();
    setHandsFree(false);
    speech.abort();
  }

  async function nextWord() {
    const nextIndex = index + 1;
    if (nextIndex < queue.length) {
      setIndex(nextIndex);
      prepareWord();
      return;
    }
    setRoundActive(false);
    setFeedback(undefined);
    stopSession();
    const synced = await reporter.finishSession();
    const set = synced?.sets.find(
      (item) => item.vocabularySetId === vocabularySetId,
    );
    if (set) setLatestEvidence(set);
  }

  function advanceCard() {
    // A graded answer must be durable on-device before either mode can advance.
    const canAdvance = (revealed && revealSaved) || feedback?.saved;
    if (!canAdvance || busy) return;
    deckRef.current?.advance();
  }

  function revealAnswer() {
    if (
      !currentWord ||
      busy ||
      answerClaim.current !== "unanswered" ||
      reporter.isPending
    )
      return;
    answerClaim.current = "revealed";
    clearAutoTimer();
    speech.abort();
    setTyping(false);
    setRevealed(true);
    setRevealSaved(false);
    setAnswer("");
    void saveReveal();
  }

  async function saveReveal() {
    if (!currentWord) return;
    reporter.reset();
    setSessionError(undefined);
    try {
      await reporter.report({
        entryId: currentWord.id,
        evidence: "RECALL",
        result: "REVEALED",
      });
      setRevealSaved(true);
    } catch {
      setSessionError(
        "This reveal couldn’t be saved on this device. Try again before continuing.",
      );
    }
  }

  function finishAdvance() {
    clearAutoTimer();
    speech.abort();
    setMoving(false);
    void nextWord();
  }

  function restartWord() {
    if (currentWord) prepareWord();
  }

  function handleInteractionChange(interacting: boolean) {
    if (interacting && handsFree) {
      setTyping(false);
      dismissKeyboard();
      speech.abort();
    }
    setMoving(interacting);
  }

  const speech = useVocabularySpeech({
    mode,
    contextualStrings: useMemo(
      () => queue.map((word) => (mode === "KR" ? word.term : word.definition)),
      [mode, queue],
    ),
    disabled: !currentWord || busy || typing,
    onInterim: (text) => {
      if (answerClaim.current === "unanswered" && !busy) setAnswer(text);
    },
    onFinal: (transcripts) => {
      if (handsFree && !matchSpeechAlternative(expectedAnswer, transcripts)) {
        setAnswer("");
        return;
      }
      void checkAnswer(transcripts);
    },
  });
  const listening = speech.status === "listening";

  useEffect(() => {
    if (
      !handsFree ||
      !currentWord ||
      busy ||
      typing ||
      feedback ||
      revealed ||
      answerClaim.current !== "unanswered" ||
      (speech.errorMessage && !speech.recoverableError) ||
      speech.status !== "idle"
    )
      return;
    void speech.start();
  }, [
    busy,
    currentWord,
    feedback,
    handsFree,
    isStudyMode,
    revealed,
    speech,
    typing,
  ]);

  useEffect(() => {
    if (handsFree && speech.errorMessage && !speech.recoverableError)
      setHandsFree(false);
  }, [handsFree, speech.errorMessage, speech.recoverableError]);

  useEffect(() => {
    const ready = feedback?.correct && feedback.saved;
    if (!handsFree || !ready || busy) return;
    clearAutoTimer();
    autoAdvanceTimer.current = setTimeout(() => {
      autoAdvanceTimer.current = undefined;
      advanceCard();
    }, 650);
    return clearAutoTimer;
  }, [busy, feedback, handsFree]);

  useEffect(() => clearAutoTimer, []);

  function toggleSpeechSession() {
    if (handsFree) {
      stopSession();
      return;
    }
    speech.clearError();
    setTyping(false);
    dismissKeyboard();
    setHandsFree(true);
  }

  function handleInputSubmit() {
    const canAdvance = (revealed && revealSaved) || feedback?.saved;
    if (canAdvance) {
      setTyping(false);
      dismissKeyboard();
      advanceCard();
      return;
    }
    if (feedback) return;
    setTyping(false);
    if (handsFree) {
      dismissKeyboard();
      if (!matchSpeechAlternative(expectedAnswer, [answer])) {
        setAnswer("");
        return;
      }
    }
    void checkAnswer();
  }

  function handleModeChange(next: VocabularySpeechMode) {
    if (next === mode || busy) return;
    stopSession();
    setTyping(false);
    dismissKeyboard();
    setMode(next);
    if (currentWord) prepareWord();
  }

  function toggleKeyboard() {
    if (keyboardVisible) {
      dismissKeyboard();
      return;
    }
    if (!roundActive || !currentWord || feedback || revealed || busy) return;
    answerInputRef.current?.focus();
  }

  if (progressQuery.isPending) {
    return (
      <View className="min-h-64 items-center justify-center gap-3">
        <ActivityIndicator color={colors.primary} />
        <Text className="text-sm text-muted-foreground">
          Loading your saved practice…
        </Text>
      </View>
    );
  }

  if (progressQuery.isError) {
    return (
      <QueryState
        pending={false}
        error={progressQuery.error}
        retry={() => void progressQuery.refetch()}
      />
    );
  }

  if (!usableWords.length) {
    return <Empty>This set has no words ready for practice.</Empty>;
  }

  const showStart =
    !roundActive && !evidence?.practiced && readyWords.length > 0;
  const showFinish = Boolean(evidence?.practiced) && !roundActive;
  const finishTitle = evidence?.mastered
    ? "Vocabulary mastered"
    : "Practice complete";
  const finishDetail = evidence?.mastered
    ? "Every word has been recalled successfully. Your answers are saved on this device and synced at the round checkpoint."
    : `You practiced every word once. ${masteredCount} of ${usableWords.length} are mastered, and you can review them again later.`;

  function exitGame() {
    void onComplete().catch(() => undefined);
  }

  const visibleCards = roundActive ? deckCards : previewCards;
  const visibleCount = roundActive ? queue.length : readyWords.length;
  const visibleIndex = roundActive ? index : 0;
  const idleHint = showFinish
    ? "Your answers are saved. Refresh to load the remaining words."
    : isStudyMode
      ? "Say or type the definition, peel the corner to reveal, or swipe up to skip."
      : "Say or type the Korean word, peel the corner to reveal, or swipe up to skip.";

  return (
    <View className="min-h-0 flex-1">
      <GameBackToolbar disabled={requestBusy} onPress={exit} />
      <Stack.Screen
        options={{
          gestureEnabled: false,
          headerBackButtonDisplayMode: "minimal",
          headerBackVisible: false,
          headerShadowVisible: false,
          headerShown: true,
          title: "",
        }}
      />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.View hidesSharedBackground>
          <View
            accessibilityLabel={`Word ${visibleCount === 0 ? 0 : visibleIndex + 1} of ${visibleCount}, ${practicedCount} of ${usableWords.length} practiced`}
            className="flex-row items-center gap-3"
          >
            <Text className="text-[13px] font-bold tabular-nums text-foreground">
              Word {visibleCount === 0 ? 0 : visibleIndex + 1}/{visibleCount}
            </Text>
            <Text className="text-[13px] font-semibold tabular-nums text-muted-foreground">
              {practicedCount}/{usableWords.length} practiced
            </Text>
          </View>
        </Stack.Toolbar.View>
        <Stack.Toolbar.Button
          accessibilityLabel={
            keyboardVisible ? "Hide keyboard" : "Show keyboard"
          }
          disabled={
            !keyboardVisible &&
            (!roundActive || !currentWord || !!feedback || revealed || busy)
          }
          icon={
            keyboardVisible ? toolbarIcons.keyboardHide : toolbarIcons.keyboard
          }
          onPress={toggleKeyboard}
        />
      </Stack.Toolbar>
      <Stack.Toolbar
        placement="bottom"
        backgroundColor={colors.background}
        tintColor={colors.primary}
      >
        <Stack.Toolbar.Button
          accessibilityLabel={
            handsFree ? "Stop hands-free practice" : "Start hands-free practice"
          }
          disabled={(!handsFree && !!feedback) || revealed || busy}
          icon={handsFree ? toolbarIcons.stop : toolbarIcons.mic}
          onPress={toggleSpeechSession}
          separateBackground
          variant="prominent"
        />
        <Stack.Toolbar.View>
          <TextInput
            ref={answerInputRef}
            accessibilityLabel={
              isStudyMode
                ? `Definition for ${currentWord?.term ?? "current word"}`
                : `Korean word for ${currentWord?.definition ?? "current word"}`
            }
            autoCapitalize="none"
            autoCorrect={false}
            onBlur={() => {
              setKeyboardVisible(false);
              setTyping(false);
            }}
            onChangeText={(value) => {
              if (answerClaim.current === "unanswered" && !busy) {
                if (handsFree) {
                  setTyping(true);
                  speech.abort();
                }
                setAnswer(value);
              }
            }}
            onFocus={() => {
              setKeyboardVisible(true);
              if (!handsFree) return;
              clearAutoTimer();
              setTyping(true);
              speech.abort();
            }}
            onSubmitEditing={handleInputSubmit}
            placeholder={
              revealed
                ? "Ready for the next word?"
                : listening
                  ? "Listening…"
                  : isStudyMode
                    ? "Type the definition"
                    : "Type the Korean word"
            }
            placeholderTextColor={colors.mutedForeground}
            returnKeyType={revealed || feedback?.saved ? "next" : "done"}
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
              ? (revealed ? !revealSaved : !feedback?.saved) || busy
              : !answer.trim() || busy
          }
          icon={feedback || revealed ? toolbarIcons.next : toolbarIcons.submit}
          onPress={
            feedback || revealed ? advanceCard : () => void checkAnswer()
          }
          variant="prominent"
        />
      </Stack.Toolbar>

      <View className="min-h-0 flex-1 justify-center gap-2">
        <Text className="text-center text-xs leading-5 text-muted-foreground">
          {!roundActive
            ? idleHint
            : isStudyMode
              ? moving
                ? "Bringing up the next card…"
                : listening
                  ? "Listening for Indonesian… tap mic to stop."
                  : revealed
                    ? "Answer revealed. Swipe up or tap Next."
                    : feedback
                      ? feedback.correct
                        ? "Correct and saved. Swipe up or tap Next."
                        : "Saved for review. Swipe up or tap Next."
                      : "Say or type the definition, peel the corner to reveal, or swipe up to skip."
              : moving
                ? "Bringing up the next card…"
                : listening
                  ? "Listening for Korean… tap mic to stop."
                  : revealed
                    ? "Answer revealed. Swipe up or tap Next."
                    : feedback
                      ? !feedback.saved
                        ? feedback.correct
                          ? "Correct — saving…"
                          : "We’ll review this again — saving…"
                        : feedback.correct
                          ? "Correct and saved. Swipe up or tap Next."
                          : "Saved for an earlier review. Swipe up or tap Next."
                      : "Say or type the Korean word, peel the corner to reveal, or swipe up to skip."}
        </Text>
        {speech.errorMessage && !feedback && !revealed ? (
          <Text
            accessibilityRole="alert"
            className="text-center text-sm text-destructive"
          >
            {speech.errorMessage}
          </Text>
        ) : null}
        {visibleCards.length === 0 ? (
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
            <Action secondary onPress={() => void progressQuery.refetch()}>
              Check again
            </Action>
          </View>
        ) : (
          <VocabularyPracticeDeck
            key={roundActive ? roundKey : "preview"}
            ref={deckRef}
            cards={visibleCards}
            index={visibleIndex}
            correct={feedback?.correct}
            revealed={roundActive && revealed}
            onReveal={revealAnswer}
            scrollGesture={scrollGesture}
            disabled={!roundActive || requestBusy || (revealed && !revealSaved)}
            onInteractionChange={handleInteractionChange}
            onAdvanceComplete={finishAdvance}
          />
        )}
        <View className="items-center">
          <VocabularyModeSwitch
            mode={mode}
            onChange={handleModeChange}
            disabled={!roundActive || busy}
          />
        </View>
      </View>

      {sessionError ? (
        <View className="gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4">
          <Text
            accessibilityRole="alert"
            className="text-sm leading-5 text-destructive"
          >
            {sessionError}
          </Text>
          {reporter.error ? (
            <Action
              secondary
              onPress={() => {
                if (feedback) void saveAnswer(feedback.correct);
                else if (revealed) void saveReveal();
              }}
            >
              {revealed ? "Retry saving reveal" : "Retry saving answer"}
            </Action>
          ) : currentWord ? (
            <Action secondary onPress={restartWord}>
              Try again
            </Action>
          ) : null}
        </View>
      ) : null}

      <GameStartModal
        content={
          <View className="gap-4">
            <View className="flex-row items-start justify-between gap-5">
              <View className="min-w-0 flex-1 gap-0.5">
                <Text className="text-[11px] font-bold uppercase tracking-[1.4px] text-primary">
                  Set progress
                </Text>
                <Text className="text-xl font-black tracking-tight text-foreground">
                  {practicedCount} practiced
                </Text>
              </View>
              <Text className="text-2xl font-black tabular-nums text-foreground">
                {progress}%
              </Text>
            </View>
            <View
              accessibilityRole="progressbar"
              accessibilityValue={{ min: 0, max: 100, now: progress }}
              className="h-1.5 overflow-hidden rounded-full bg-muted"
            >
              <View
                className="h-full rounded-full bg-primary"
                style={{ width: `${progress}%` }}
              />
            </View>
            <View className="flex-row items-center justify-between gap-4">
              <Text className="text-sm text-muted-foreground">
                {usableWords.length} total words
              </Text>
              <Text className="text-sm font-semibold text-primary">
                {readyWords.length} ready now
              </Text>
            </View>
          </View>
        }
        detail="Mastery reviews stay available without blocking your course."
        gameKey="cards"
        onPrimary={beginRound}
        onSecondary={exit}
        primaryLabel={`Start practice · ${readyWords.length} words`}
        title="Cards"
        visible={showStart}
      />
      <GameModal
        content={
          courseId ? (
            <GameJourneyFooter
              courseId={courseId}
              courseItemId={sourceCourseItemId}
              scrollable={false}
            />
          ) : undefined
        }
        detail={finishDetail}
        eyebrow="Cards"
        gameKey="cards"
        onPrimary={reviewDueWords.length ? beginRound : () => void exitGame()}
        onSecondary={reviewDueWords.length ? exit : undefined}
        primaryLabel={
          reviewDueWords.length
            ? `Review again · ${reviewDueWords.length} words`
            : "Back to practice"
        }
        secondaryLabel={reviewDueWords.length ? "Exit" : undefined}
        title={finishTitle}
        visible={showFinish}
      />
    </View>
  );
}
