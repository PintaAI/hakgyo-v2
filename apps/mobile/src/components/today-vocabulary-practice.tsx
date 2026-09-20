import type { RouterOutputs } from "@hakgyo/api";
import { useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, Text, TextInput, Pressable, View } from "react-native";
import { SymbolView } from "expo-symbols";
import type { NativeGesture } from "react-native-gesture-handler";

import { localSample } from "../lib/local-sample";
import { useAppTheme } from "../providers/AppThemeProvider";
import { useMobileSyncActions } from "../providers/MobileSyncProvider";
import { withOpacity } from "../theme/colors";
import { isDefinitionCorrect } from "../lib/today-vocabulary-practice";
import { isVocabularyAnswerCorrect } from "../lib/vocabulary-practice";
import {
  matchSpeechAlternative,
  type VocabularySpeechMode,
} from "../lib/vocabulary-speech";
import { useVocabularySpeech } from "../lib/use-vocabulary-speech";
import { VocabularyModeSwitch } from "./vocabulary-mode-switch";
import { Action, Empty } from "./learning-ui";
import { GlassBox } from "./GlassBox";
import {
  VocabularyPracticeDeck,
  type VocabularyPracticeDeckHandle,
} from "./vocabulary-practice-deck";

type VocabularyCard =
  RouterOutputs["practice"]["getVocabularyPool"]["items"][number];
type VocabularyPool = RouterOutputs["practice"]["getVocabularyPool"];

function randomSeed() {
  return `${Date.now()}:${Math.random()}`;
}

function deviceTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function TodayVocabularyPractice({
  organizationId,
  scrollGesture,
  pool,
}: {
  organizationId: string;
  scrollGesture: NativeGesture;
  pool: VocabularyPool;
}) {
  const { colors, colorScheme } = useAppTheme();
  const [seed, setSeed] = useState(randomSeed);
  const { finishVocabularySession, recordVocabularyAttempt } =
    useMobileSyncActions();
  const [recordPending, setRecordPending] = useState(false);
  const [recordError, setRecordError] = useState<Error | null>(null);
  const [round, setRound] = useState<VocabularyCard[]>([]);
  const [roundKey, setRoundKey] = useState("");
  const roundSessionId = useRef(randomSeed());
  const [moving, setMoving] = useState(false);
  const submitted = useRef(false);
  const deckRef = useRef<VocabularyPracticeDeckHandle>(null);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<{
    correct: boolean;
    saved: boolean;
  }>();
  const [revealed, setRevealed] = useState(false);
  const [revealSaved, setRevealSaved] = useState(false);
  const [mode, setMode] = useState<VocabularySpeechMode>("ID");
  // Hands-free mic session: on = auto-listen every card, auto-advance when
  // correct, auto-clear + retry when wrong, until the user stops it.
  const [handsFree, setHandsFree] = useState(false);
  const [typing, setTyping] = useState(false);
  const initializedPool = useRef<string | undefined>(undefined);
  const inputRef = useRef<TextInput>(null);
  const restoreInputFocus = useRef(false);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  function poolSignature(items: readonly VocabularyCard[]) {
    return items.map((item) => `${item.entryId}:${item.setVersion}`).join(",");
  }

  useEffect(() => {
    const items = localSample(pool.items, seed, 24);
    const signature = `${seed}:${poolSignature(items)}`;
    if (initializedPool.current === signature) {
      return;
    }
    initializedPool.current = signature;
    roundSessionId.current = randomSeed();
    setRound(items);
    setRoundKey(signature);
    setMoving(false);
    submitted.current = false;
    restoreInputFocus.current = false;
    setIndex(0);
    setAnswer("");
    setFeedback(undefined);
    setRevealed(false);
    setRevealSaved(false);
    // A new API pool starts a new round; attempt updates stay on-device until
    // the round checkpoint.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool.items, seed]);

  const card = round[index];
  const deckCards = useMemo(
    () =>
      round.map((item) => ({
        id: `${item.entryId}:${item.setVersion}`,
        // KR mode answers in Korean (productive); ID mode answers in Indonesian (receptive).
        prompt: mode === "KR" ? item.definition : item.term,
        answer: mode === "KR" ? item.term : item.definition,
        imageAssetId: item.imageAssetId,
        imageAccessibilityLabel: `${item.term} illustration`,
      })),
    [mode, round],
  );
  const expectedAnswer = card
    ? mode === "KR"
      ? card.term
      : card.definition
    : "";

  function isAnswerCorrect(value: string) {
    if (!card) return false;
    return mode === "KR"
      ? isVocabularyAnswerCorrect(value, card.term)
      : isDefinitionCorrect(card, value);
  }

  async function checkAnswer(spokenTranscripts?: readonly string[]) {
    if (!card || submitted.current || moving) return;
    const spokenDisplay = spokenTranscripts?.find((text) => text.trim());
    const value = spokenDisplay ?? answer;
    if (!value.trim()) return;
    submitted.current = true;
    // Exact match against any STT alternative; fall back to the first
    // transcript so wrong answers are still recorded.
    const matched = spokenTranscripts?.length
      ? (matchSpeechAlternative(expectedAnswer, spokenTranscripts) ??
        spokenDisplay!)
      : value;
    if (spokenDisplay) setAnswer(matched);
    const correct = isAnswerCorrect(matched);
    setFeedback({ correct, saved: false });
    if (!handsFree) inputRef.current?.focus();

    await saveAnswer(correct);
  }

  async function saveAnswer(correct: boolean) {
    if (!card) return;
    const sessionId = roundSessionId.current;
    setRecordError(null);
    setRecordPending(true);
    try {
      await recordVocabularyAttempt({
        gameKey: "today-cards",
        sessionId,
        timeZone: deviceTimeZone(),
        attempt: {
          attemptId: `${sessionId}:${index}:${card.entryId}`,
          entryId: card.entryId,
          evidence: "RECALL",
          result: correct ? "CORRECT" : "INCORRECT",
          sourceCourseItemId: card.sourceCourseItemId,
          vocabularySetId: card.vocabularySetId,
        },
      });
      if (roundSessionId.current !== sessionId) return;
      setFeedback({ correct, saved: true });
    } catch (cause) {
      if (roundSessionId.current !== sessionId) return;
      setRecordError(
        cause instanceof Error ? cause : new Error("Could not save locally"),
      );
      setFeedback({ correct, saved: false });
    } finally {
      setRecordPending(false);
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

  function nextCard() {
    clearAutoTimer();
    speech.abort();
    deckRef.current?.advance();
    if (!handsFree) inputRef.current?.focus();
  }

  function revealAnswer() {
    if (!card || submitted.current || moving) return;
    // Claim the card synchronously: a queued keyboard submit must not award
    // credit after the learner has seen the answer.
    submitted.current = true;
    clearAutoTimer();
    speech.abort();
    setTyping(false);
    Keyboard.dismiss();
    setRevealed(true);
    setRevealSaved(false);
    setAnswer("");
    void saveReveal();
  }

  async function saveReveal() {
    if (!card) return;
    const sessionId = roundSessionId.current;
    setRecordError(null);
    setRecordPending(true);
    try {
      await recordVocabularyAttempt({
        gameKey: "today-cards",
        sessionId,
        timeZone: deviceTimeZone(),
        attempt: {
          attemptId: `${sessionId}:${index}:${card.entryId}:revealed`,
          entryId: card.entryId,
          evidence: "RECALL",
          result: "REVEALED",
          sourceCourseItemId: card.sourceCourseItemId,
          vocabularySetId: card.vocabularySetId,
        },
      });
      if (roundSessionId.current === sessionId) setRevealSaved(true);
    } catch (cause) {
      setRecordError(
        cause instanceof Error ? cause : new Error("Could not save locally"),
      );
      // Keep the card blocked so the learner can retry this exact outcome.
    } finally {
      setRecordPending(false);
    }
  }

  function handleInteractionChange(busy: boolean) {
    if (busy) {
      if (handsFree) {
        restoreInputFocus.current = false;
        setTyping(false);
        Keyboard.dismiss();
        speech.abort();
      } else {
        restoreInputFocus.current = inputRef.current?.isFocused() ?? false;
      }
    }
    setMoving(busy);
  }

  function finishAdvance() {
    clearAutoTimer();
    speech.abort();
    setIndex((value) => value + 1);
    setAnswer("");
    setFeedback(undefined);
    setRevealed(false);
    setTyping(false);
    setRecordError(null);
    setMoving(false);
    submitted.current = false;
    if (index + 1 >= round.length) {
      Keyboard.dismiss();
      stopSession();
      void finishVocabularySession(organizationId);
    }
  }

  useEffect(() => {
    if (restoreInputFocus.current && index > 0 && index < round.length) {
      inputRef.current?.focus();
    }
  }, [index, round.length]);

  function handleAnswerChange(value: string) {
    // Keep the keyboard mounted, but preserve the submitted answer during review.
    if (submitted.current || moving) return;
    if (handsFree) {
      setTyping(true);
      speech.abort();
    }
    setAnswer(value);
  }

  function handleInputSubmit() {
    setTyping(false);
    if (feedback?.saved || (revealed && revealSaved)) {
      if (handsFree) Keyboard.dismiss();
      nextCard();
      return;
    }
    if (revealed) {
      void saveReveal();
      return;
    }
    if (feedback) {
      void saveAnswer(feedback.correct);
      return;
    }
    if (handsFree) {
      Keyboard.dismiss();
      if (!matchSpeechAlternative(expectedAnswer, [answer])) {
        setAnswer("");
        return;
      }
    }
    void checkAnswer();
  }

  const speech = useVocabularySpeech({
    mode,
    contextualStrings: useMemo(
      () => round.map((item) => (mode === "KR" ? item.term : item.definition)),
      [mode, round],
    ),
    disabled: !card || moving || typing,
    onInterim: (text) => {
      if (!submitted.current && !moving) setAnswer(text);
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
  const speechBusy = speech.status !== "idle";

  useEffect(() => {
    if (
      !handsFree ||
      !card ||
      moving ||
      typing ||
      feedback ||
      revealed ||
      submitted.current ||
      (speech.errorMessage && !speech.recoverableError) ||
      speech.status !== "idle"
    )
      return;
    void speech.start();
  }, [card, feedback, handsFree, moving, revealed, speech, typing]);

  useEffect(() => {
    if (handsFree && speech.errorMessage && !speech.recoverableError)
      setHandsFree(false);
  }, [handsFree, speech.errorMessage, speech.recoverableError]);

  useEffect(() => {
    if (!handsFree || !feedback?.correct || !feedback.saved || moving) return;
    clearAutoTimer();
    autoAdvanceTimer.current = setTimeout(() => {
      autoAdvanceTimer.current = undefined;
      nextCard();
    }, 650);
    return clearAutoTimer;
  }, [feedback, handsFree, moving]);

  useEffect(() => clearAutoTimer, []);

  function toggleSpeechSession() {
    if (handsFree) {
      stopSession();
      return;
    }
    speech.clearError();
    setTyping(false);
    Keyboard.dismiss();
    setHandsFree(true);
  }

  function handleModeChange(next: VocabularySpeechMode) {
    if (next === mode || moving) return;
    stopSession();
    setTyping(false);
    Keyboard.dismiss();
    setMode(next);
    setAnswer("");
  }

  async function newMix() {
    stopSession();
    setRecordError(null);
    await finishVocabularySession(organizationId);
    setSeed(randomSeed());
  }

  return (
    <View className="gap-3" style={{ overflow: "visible", zIndex: 1 }}>
      {!pool.hasAvailableContent ? (
        <Empty>No words to practice yet.</Empty>
      ) : round.length > 0 ? (
        <>
          <Text className="text-center text-xs font-bold uppercase tracking-[1.2px] text-muted-foreground">
            {card
              ? `${card.vocabularySetTitle} · ${card.courseTitle}`
              : "Ready for another mix?"}
          </Text>
          <VocabularyPracticeDeck
            key={roundKey}
            ref={deckRef}
            scrollGesture={scrollGesture}
            cards={deckCards}
            index={index}
            correct={feedback?.correct}
            disabled={
              recordPending ||
              (feedback ? !feedback.saved : false) ||
              (revealed && !revealSaved)
            }
            revealed={revealed}
            onReveal={revealAnswer}
            onInteractionChange={handleInteractionChange}
            onAdvanceComplete={finishAdvance}
          />
          <View className="items-center">
            <VocabularyModeSwitch
              mode={mode}
              onChange={handleModeChange}
              disabled={moving || speechBusy}
            />
          </View>
          {card ? (
            <View className="gap-3">
              <Text className="text-center text-xs text-muted-foreground">
                {moving
                  ? "Bringing up the next card…"
                  : listening
                    ? mode === "KR"
                      ? "Listening for Korean… tap mic to stop."
                      : "Listening for Indonesian… tap mic to stop."
                    : revealed
                      ? "Just studying · no XP or streak change. Swipe up or tap Next."
                      : feedback
                        ? feedback.saved
                          ? "Swipe up or tap Next when you’re ready."
                          : "Saving your answer…"
                        : mode === "KR"
                          ? "Say or type the Korean word, peel the corner to reveal, or swipe up to skip."
                          : "Say or type the definition, peel the corner to reveal, or swipe up to skip."}
              </Text>
              {speech.errorMessage && !feedback && !revealed ? (
                <Text
                  accessibilityRole="alert"
                  className="text-center text-sm text-destructive"
                >
                  {speech.errorMessage}
                </Text>
              ) : null}
              {recordError ? (
                <Text
                  accessibilityRole="alert"
                  className="text-center text-sm text-destructive"
                >
                  Your answer could not be saved on this device. Try again.
                </Text>
              ) : null}
              <View className="flex-row items-center gap-2">
                <GlassBox
                  isInteractive
                  tintColor={withOpacity(
                    colors.primary,
                    colorScheme === "dark" ? 0.35 : 0.18,
                  )}
                  glassEffectStyle="clear"
                  style={{ borderRadius: 9999, flex: 1, height: 44 }}
                >
                  {answer.length === 0 ? (
                    <View
                      pointerEvents="none"
                      className="absolute inset-0 items-center justify-center px-14"
                    >
                      <Text
                        className="text-center text-base"
                        style={{ color: colors.mutedForeground }}
                      >
                        {revealed
                          ? "Ready for the next word?"
                          : listening
                            ? "Listening…"
                            : mode === "KR"
                              ? "Type the Korean word"
                              : "Type the definition"}
                      </Text>
                    </View>
                  ) : null}
                  <TextInput
                    ref={inputRef}
                    accessibilityLabel={
                      mode === "KR"
                        ? `Korean word for ${card.definition}`
                        : `Definition for ${card.term}`
                    }
                    autoCapitalize="none"
                    autoCorrect={false}
                    blurOnSubmit={false}
                    onBlur={() => setTyping(false)}
                    onChangeText={handleAnswerChange}
                    onFocus={() => {
                      if (!handsFree) return;
                      clearAutoTimer();
                      setTyping(true);
                      speech.abort();
                    }}
                    onSubmitEditing={handleInputSubmit}
                    returnKeyType={feedback || revealed ? "next" : "done"}
                    selectionColor={colors.primary}
                    value={answer}
                    style={{
                      color: colors.foreground,
                      fontSize: 16,
                      height: 44,
                      includeFontPadding: false,
                      paddingHorizontal: 62,
                      paddingVertical: 0,
                      textAlign: "center",
                      textAlignVertical: "center",
                      width: "100%",
                    }}
                  />
                  {handsFree || (!feedback && !revealed) ? (
                    <Pressable
                      accessibilityLabel={
                        handsFree
                          ? "Stop hands-free practice"
                          : "Start hands-free practice"
                      }
                      accessibilityRole="button"
                      accessibilityState={{
                        busy: speechBusy,
                        disabled: moving && !handsFree,
                      }}
                      disabled={moving && !handsFree}
                      onPress={toggleSpeechSession}
                      className="rounded-full active:opacity-75"
                      style={{
                        opacity: moving ? 0.5 : 1,
                        position: "absolute",
                        left: 2,
                        top: 2,
                      }}
                    >
                      <View
                        className="size-10 items-center justify-center"
                        style={{
                          transform: [{ translateX: 2 }, { translateY: 2 }],
                        }}
                      >
                        <SymbolView
                          fallback={
                            <Text
                              className="text-xl font-black"
                              style={{
                                color: handsFree
                                  ? colors.destructive
                                  : colors.primary,
                              }}
                            >
                              {handsFree ? "■" : "🎙"}
                            </Text>
                          }
                          name={handsFree ? "stop.fill" : "mic.fill"}
                          size={22}
                          style={{ height: 22, width: 22 }}
                          tintColor={
                            handsFree ? colors.destructive : colors.primary
                          }
                          weight="bold"
                        />
                      </View>
                    </Pressable>
                  ) : null}
                  {feedback || revealed ? (
                    <Pressable
                      accessibilityLabel={
                        feedback && !feedback.saved
                          ? "Retry saving answer"
                          : revealed && !revealSaved
                            ? "Retry saving reveal"
                            : "Next word"
                      }
                      accessibilityRole="button"
                      accessibilityState={{
                        disabled: moving || recordPending,
                        busy: moving || recordPending,
                      }}
                      disabled={moving || recordPending}
                      style={{
                        opacity: moving ? 0.5 : 1,
                        position: "absolute",
                        right: 2,
                        top: 2,
                      }}
                      onPress={() => {
                        if (feedback && !feedback.saved) {
                          void saveAnswer(feedback.correct);
                        } else if (revealed && !revealSaved) {
                          void saveReveal();
                        } else {
                          nextCard();
                        }
                      }}
                      className="rounded-full active:opacity-75"
                    >
                      <View
                        className="size-10 items-center justify-center"
                        style={{ transform: [{ translateY: 2 }] }}
                      >
                        <SymbolView
                          fallback={
                            <Text
                              className="text-xl font-black"
                              style={{ color: colors.primary }}
                            >
                              →
                            </Text>
                          }
                          name="arrow.right"
                          size={22}
                          tintColor={colors.primary}
                          weight="bold"
                        />
                      </View>
                    </Pressable>
                  ) : (
                    <Pressable
                      accessibilityLabel={
                        mode === "KR" ? "Check Korean word" : "Check definition"
                      }
                      accessibilityRole="button"
                      accessibilityState={{
                        busy: recordPending,
                        disabled: moving || !answer.trim(),
                      }}
                      disabled={moving || !answer.trim()}
                      onPress={() => void checkAnswer()}
                      className="rounded-full active:opacity-75"
                      style={{
                        opacity: answer.trim() ? 1 : 0.4,
                        position: "absolute",
                        right: 2,
                        top: 2,
                      }}
                    >
                      <View
                        className="size-10 items-center justify-center"
                        style={{
                          transform: [{ translateX: -2 }, { translateY: 2 }],
                        }}
                      >
                        <SymbolView
                          fallback={
                            <Text
                              className="text-xl font-black"
                              style={{ color: colors.primary }}
                            >
                              ➤
                            </Text>
                          }
                          name="paperplane.fill"
                          size={22}
                          style={{ height: 22, width: 22 }}
                          tintColor={colors.primary}
                          weight="bold"
                        />
                      </View>
                    </Pressable>
                  )}
                </GlassBox>
              </View>
            </View>
          ) : (
            <Action onPress={newMix}>Next mix</Action>
          )}
        </>
      ) : null}
    </View>
  );
}
