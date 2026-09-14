import type { RouterOutputs } from "@hakgyo/api";
import Storage from "expo-sqlite/kv-store";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TextInput,
  Pressable,
  View,
} from "react-native";
import { SymbolView } from "expo-symbols";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

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
import { useApiAssetResolver } from "./content-renderer";

type VocabularyCard =
  RouterOutputs["practice"]["getVocabularyPool"]["items"][number];

function randomSeed() {
  return `${Date.now()}:${Math.random()}`;
}

function TodayFlipCard({
  card,
  counter,
  correct,
  flipped,
}: {
  card: VocabularyCard;
  counter: string;
  correct: boolean | undefined;
  flipped: boolean;
}) {
  const progress = useSharedValue(0);
  const resolveAssetUrl = useApiAssetResolver();
  const [resolvedImage, setResolvedImage] = useState<{
    assetId: string;
    url: string | null;
  }>();

  useEffect(() => {
    progress.value = withTiming(flipped ? 1 : 0, { duration: 450 });
  }, [flipped, progress]);

  useEffect(() => {
    if (!card.imageAssetId) return;
    let active = true;
    const assetId = card.imageAssetId;
    void resolveAssetUrl(assetId)
      .then((url) => {
        if (active) setResolvedImage({ assetId, url });
      })
      .catch(() => {
        if (active) setResolvedImage({ assetId, url: null });
      });
    return () => {
      active = false;
    };
  }, [card.imageAssetId, resolveAssetUrl]);

  const imageState = card.imageAssetId
    ? resolvedImage?.assetId === card.imageAssetId
      ? resolvedImage.url
        ? "ready"
        : "error"
      : "loading"
    : "empty";

  const frontStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.5, 0.51, 1], [1, 1, 0, 0]),
    transform: [
      { perspective: 1200 },
      { rotateY: `${interpolate(progress.value, [0, 1], [0, 180])}deg` },
    ],
  }));
  const backStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.49, 0.5, 1], [0, 0, 1, 1]),
    transform: [
      { perspective: 1200 },
      { rotateY: `${interpolate(progress.value, [0, 1], [180, 360])}deg` },
    ],
  }));

  return (
    <View className="h-56">
      <Animated.View
        className="items-center justify-center gap-2 rounded-2xl bg-muted px-5"
        style={[styles.face, frontStyle]}
      >
        {imageState === "ready" && resolvedImage?.url ? (
          <Image
            accessibilityIgnoresInvertColors
            accessibilityLabel={`${card.term} illustration`}
            className="h-28 w-full rounded-xl"
            resizeMode="contain"
            source={{ uri: resolvedImage.url }}
          />
        ) : imageState === "loading" ? (
          <View className="h-28 items-center justify-center">
            <ActivityIndicator />
          </View>
        ) : null}
        <Text selectable className="text-3xl font-black text-foreground">
          {card.term}
        </Text>
        <Text className="text-xs text-muted-foreground">{counter}</Text>
      </Animated.View>
      <Animated.View
        className={`items-center justify-center gap-2 rounded-2xl border px-5 ${
          correct === undefined
            ? "border-border bg-muted"
            : correct
              ? "border-primary/40 bg-primary/10"
              : "border-destructive/40 bg-destructive/10"
        }`}
        style={[styles.face, backStyle]}
      >
        <Text
          accessibilityLiveRegion="polite"
          className={`text-xs font-bold uppercase tracking-[1.2px] ${
            correct === undefined
              ? "text-muted-foreground"
              : correct
                ? "text-primary"
                : "text-destructive"
          }`}
        >
          {correct === undefined
            ? card.term
            : correct
              ? "Correct"
              : "Not quite"}
        </Text>
        <Text selectable className="text-2xl font-black text-foreground">
          {card.definition}
        </Text>
        <Text className="text-xs text-muted-foreground">{counter}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  face: {
    backfaceVisibility: "hidden",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
});

export function TodayVocabularyPractice({ userId }: { userId: string }) {
  const { colors, colorScheme } = useAppTheme();
  const storageKey = `hakgyo:today-practice:v1:${userId}`;
  const [seed, setSeed] = useState(randomSeed);
  const query = api.practice.getVocabularyPool.useQuery({ limit: 24, seed });
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
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<{ correct: boolean }>();
  const [readFailed, setReadFailed] = useState(loaded.failed);
  const initializedPool = useRef<string | undefined>(undefined);
  const [storageError, setStorageError] = useState<string>();
  const memoryRef = useRef(memory);
  memoryRef.current = memory;
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    };
  }, []);

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
    if (autoAdvanceRef.current) {
      clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }
    const next = buildTodayVocabularyQueue(
      query.data.items,
      memoryRef.current,
      Date.now(),
    );
    setRound(next.cards);
    setIndex(0);
    setAnswer("");
    setFeedback(undefined);
    // A new API pool starts a new round. Memory updates are handled in-place.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data, readFailed, seed]);

  const card = round[index];

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
    if (!card || feedback || !answer.trim()) return;
    const correct = isDefinitionCorrect(card, answer);
    saveMemory(recordTodayVocabularyRecall(memory, card, correct, Date.now()));
    setFeedback({ correct });
  }

  function nextCard() {
    if (autoAdvanceRef.current) {
      clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }
    setIndex((value) => value + 1);
    setAnswer("");
    setFeedback(undefined);
  }

  function handleAnswerChange(value: string) {
    setAnswer(value);
    if (!card || feedback || !value.trim()) return;
    if (isDefinitionCorrect(card, value)) {
      saveMemory(recordTodayVocabularyRecall(memory, card, true, Date.now()));
      setFeedback({ correct: true });
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = setTimeout(() => {
        autoAdvanceRef.current = null;
        nextCard();
      }, 700);
    }
  }

  function newMix() {
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
    <View className="gap-3">
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
      ) : !readFailed && card ? (
        <>
          <Text className="text-center text-3xl font-black tracking-tight text-foreground">
            kosa-kata
          </Text>
          <Text className="text-center text-xs font-bold uppercase tracking-[1.2px] text-muted-foreground">
            {card.vocabularySetTitle} · {card.courseTitle}
          </Text>
          <TodayFlipCard
            card={card}
            counter={`${index + 1} of ${round.length}`}
            correct={feedback?.correct}
            flipped={!!feedback}
          />
          <View className="flex-row items-center gap-2">
            <View className="min-w-0 flex-1">
              <GlassBox
                isInteractive
                tintColor={withOpacity(
                  colors.primary,
                  colorScheme === "dark" ? 0.35 : 0.18,
                )}
            glassEffectStyle="clear"
            style={{ borderRadius: 9999, height: 44 }}
              >
            {answer.length === 0 ? (
              <View
                pointerEvents="none"
                className="absolute inset-0 items-center justify-center px-5"
              >
                <Text
                  className="text-center text-base"
                  style={{ color: colors.mutedForeground }}
                >
                  Type the definition
                </Text>
              </View>
            ) : null}
            <TextInput
              accessibilityLabel={`Definition for ${card.term}`}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!feedback}
              onChangeText={handleAnswerChange}
              onSubmitEditing={checkAnswer}
              returnKeyType="done"
              selectionColor={colors.primary}
              value={answer}
              style={{
                color: colors.foreground,
                fontSize: 16,
                height: 44,
                includeFontPadding: false,
                paddingHorizontal: 20,
                paddingVertical: 0,
                textAlign: "center",
              }}
            />
              </GlassBox>
            </View>
            {feedback ? (
              <Pressable
                accessibilityLabel="Next word"
                accessibilityRole="button"
                onPress={nextCard}
                className="size-11 items-center justify-center rounded-full bg-primary"
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
            ) : (
              <Pressable
                accessibilityLabel="Check definition"
                accessibilityRole="button"
                accessibilityState={{ disabled: !answer.trim() }}
                disabled={!answer.trim()}
                onPress={checkAnswer}
                className="size-11 items-center justify-center rounded-full bg-primary"
                style={{ opacity: answer.trim() ? 1 : 0.4 }}
              >
                <SymbolView
                  fallback={
                    <Text
                      className="text-xl font-black"
                      style={{ color: colors.primaryForeground }}
                    >
                      ✓
                    </Text>
                  }
                  name="checkmark"
                  size={22}
                  tintColor={colors.primaryForeground}
                  weight="bold"
                />
              </Pressable>
            )}
          </View>
        </>
      ) : !readFailed && query.data ? (
        <View className="gap-3 rounded-2xl bg-muted p-5">
          <Text className="text-xl font-black text-foreground">
            Round complete
          </Text>
          <Action onPress={newMix}>Next mix</Action>
        </View>
      ) : null}
    </View>
  );
}
