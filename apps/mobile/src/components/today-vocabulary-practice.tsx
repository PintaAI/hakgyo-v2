import type { RouterOutputs } from "@hakgyo/api";
import Storage from "expo-sqlite/kv-store";
import { useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, Text, TextInput, Pressable, View } from "react-native";
import { SymbolView } from "expo-symbols";
import type { NativeGesture } from "react-native-gesture-handler";

import { api } from "../lib/trpc";
import { useAppTheme } from "../providers/AppThemeProvider";
import { withOpacity } from "../theme/colors";
import {
  buildTodayVocabularyQueue,
  emptyTodayVocabularyMemory,
  isDefinitionCorrect,
  parseTodayVocabularyMemory,
  recordTodayVocabularyRecall,
  type TodayVocabularyMemory,
} from "../lib/today-vocabulary-practice";
import { Action, Empty, QueryState } from "./learning-ui";
import { GlassBox } from "./GlassBox";
import {
  VocabularyPracticeDeck,
  type VocabularyPracticeDeckHandle,
} from "./vocabulary-practice-deck";

type VocabularyCard =
  RouterOutputs["practice"]["getVocabularyPool"]["items"][number];

function randomSeed() {
  return `${Date.now()}:${Math.random()}`;
}

function deviceTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function TodayVocabularyPractice({
  organizationId,
  userId,
  scrollGesture,
}: {
  organizationId: string;
  userId: string;
  scrollGesture: NativeGesture;
}) {
  const { colors, colorScheme } = useAppTheme();
  const storageKey = `hakgyo:today-practice:v2:${userId}:${organizationId}`;
  const [seed, setSeed] = useState(randomSeed);
  const query = api.practice.getVocabularyPool.useQuery({
    limit: 24,
    organizationId,
    seed,
  });
  const utils = api.useUtils();
  const recordReview = api.practice.recordVocabularyCardReview.useMutation({
    retry: 3,
  });
  const [loaded] = useState(() => {
    try {
      return {
        memory: parseTodayVocabularyMemory(Storage.getItemSync(storageKey)),
        failed: false,
      };
    } catch {
      return { memory: emptyTodayVocabularyMemory(), failed: true };
    }
  });
  const [memory, setMemory] = useState<TodayVocabularyMemory>(loaded.memory);
  const [round, setRound] = useState<VocabularyCard[]>([]);
  const [roundKey, setRoundKey] = useState("");
  const [moving, setMoving] = useState(false);
  const submitted = useRef(false);
  const deckRef = useRef<VocabularyPracticeDeckHandle>(null);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<{ correct: boolean }>();
  const [revealed, setRevealed] = useState(false);
  const [readFailed, setReadFailed] = useState(loaded.failed);
  const initializedPool = useRef<string | undefined>(undefined);
  const [storageError, setStorageError] = useState<string>();
  const memoryRef = useRef(memory);
  memoryRef.current = memory;
  const inputRef = useRef<TextInput>(null);
  const restoreInputFocus = useRef(false);

  function poolSignature(items: readonly VocabularyCard[]) {
    return items.map((item) => `${item.entryId}:${item.setVersion}`).join(",");
  }

  useEffect(() => {
    if (!query.data || readFailed) return;
    const signature = `${seed}:${poolSignature(query.data.items)}`;
    if (initializedPool.current === signature) {
      return;
    }
    initializedPool.current = signature;
    const next = buildTodayVocabularyQueue(
      query.data.items,
      memoryRef.current,
      Date.now(),
    );
    setRound(next.cards);
    setRoundKey(signature);
    setMoving(false);
    submitted.current = false;
    restoreInputFocus.current = false;
    setIndex(0);
    setAnswer("");
    setFeedback(undefined);
    setRevealed(false);
    // A new API pool starts a new round. Memory updates are handled in-place.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data, readFailed, seed]);

  const card = round[index];
  const deckCards = useMemo(
    () =>
      round.map((item) => ({
        id: `${item.entryId}:${item.setVersion}`,
        prompt: item.term,
        answer: item.definition,
        imageAssetId: item.imageAssetId,
        imageAccessibilityLabel: `${item.term} illustration`,
      })),
    [round],
  );

  function saveMemory(next: TodayVocabularyMemory) {
    setMemory(next);
    try {
      Storage.setItemSync(storageKey, JSON.stringify(next));
      setStorageError(undefined);
    } catch {
      setStorageError("Could not save on this device.");
    }
  }

  function checkAnswer() {
    if (!card || submitted.current || moving || !answer.trim()) return;
    submitted.current = true;
    const correct = isDefinitionCorrect(card, answer);
    recordReview.reset();
    saveMemory(
      recordTodayVocabularyRecall(memoryRef.current, card, correct, Date.now()),
    );
    setFeedback({ correct });
    inputRef.current?.focus();

    void recordReview
      .mutateAsync({
        completionId: `${seed}:${index}:${card.entryId}:${card.setVersion}`,
        entryId: card.entryId,
        sourceCourseItemId: card.sourceCourseItemId,
        timeZone: deviceTimeZone(),
      })
      .then(() => utils.gamification.invalidate())
      .catch(() => undefined);
  }

  function nextCard() {
    deckRef.current?.advance();
    inputRef.current?.focus();
  }

  function revealAnswer() {
    if (!card || submitted.current || moving) return;
    // Claim the card synchronously: a queued keyboard submit must not award
    // credit after the learner has seen the answer.
    submitted.current = true;
    setRevealed(true);
    setAnswer("");
  }

  function handleInteractionChange(busy: boolean) {
    if (busy)
      restoreInputFocus.current = inputRef.current?.isFocused() ?? false;
    setMoving(busy);
  }

  function finishAdvance() {
    setIndex((value) => value + 1);
    setAnswer("");
    setFeedback(undefined);
    setRevealed(false);
    recordReview.reset();
    setMoving(false);
    submitted.current = false;
    if (index + 1 >= round.length) Keyboard.dismiss();
  }

  useEffect(() => {
    if (restoreInputFocus.current && index > 0 && index < round.length) {
      inputRef.current?.focus();
    }
  }, [index, round.length]);

  function handleAnswerChange(value: string) {
    // Keep the keyboard mounted, but preserve the submitted answer during review.
    if (submitted.current || moving) return;
    setAnswer(value);
  }

  function newMix() {
    recordReview.reset();
    setSeed(randomSeed());
  }

  function retryHistory() {
    try {
      const next = parseTodayVocabularyMemory(Storage.getItemSync(storageKey));
      initializedPool.current = undefined;
      setMemory(next);
      setReadFailed(false);
    } catch {
      // Keep practice blocked so an unread history is never overwritten.
    }
  }

  return (
    <View className="gap-3" style={{ overflow: "visible", zIndex: 1 }}>
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {readFailed ? (
        <View className="gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-4">
          <Text accessibilityRole="alert" className="text-sm text-destructive">
            History could not be loaded. Practice is paused.
          </Text>
          <Action secondary onPress={retryHistory}>
            Retry
          </Action>
        </View>
      ) : storageError ? (
        <Text accessibilityRole="alert" className="text-sm text-destructive">
          {storageError}
        </Text>
      ) : null}
      {!readFailed && query.data && !query.data.hasAvailableContent ? (
        <Empty>No words to practice yet.</Empty>
      ) : !readFailed && round.length > 0 ? (
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
            revealed={revealed}
            onReveal={revealAnswer}
            onInteractionChange={handleInteractionChange}
            onAdvanceComplete={finishAdvance}
          />
          {card ? (
            <View className="gap-3">
              <Text className="text-center text-xs text-muted-foreground">
                {moving
                  ? "Bringing up the next card…"
                  : revealed
                    ? "Just studying · no XP or streak change. Swipe up or tap Next."
                    : feedback
                      ? "Swipe up or tap Next when you’re ready."
                      : "Type the definition, peel the bottom-right corner to reveal, or swipe up to skip."}
              </Text>
              {recordReview.error ? (
                <Text
                  accessibilityRole="alert"
                  className="text-center text-sm text-destructive"
                >
                  Your answer is saved, but XP could not sync for this card.
                  Check your connection before continuing.
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
                          : "Type the definition"}
                      </Text>
                    </View>
                  ) : null}
                  <TextInput
                    ref={inputRef}
                    accessibilityLabel={`Definition for ${card.term}`}
                    autoCapitalize="none"
                    autoCorrect={false}
                    blurOnSubmit={false}
                    onChangeText={handleAnswerChange}
                    onSubmitEditing={
                      feedback || revealed ? nextCard : checkAnswer
                    }
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
                  {feedback || revealed ? (
                    <Pressable
                      accessibilityLabel="Next word"
                      accessibilityRole="button"
                      accessibilityState={{ disabled: moving, busy: moving }}
                      disabled={moving}
                      style={{
                        opacity: moving ? 0.5 : 1,
                        position: "absolute",
                        right: 2,
                        top: 2,
                      }}
                      onPress={nextCard}
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
                      accessibilityLabel="Check definition"
                      accessibilityRole="button"
                      accessibilityState={{
                        busy: recordReview.isPending,
                        disabled: moving || !answer.trim(),
                      }}
                      disabled={moving || !answer.trim()}
                      onPress={checkAnswer}
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
