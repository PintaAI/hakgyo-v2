import { useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";
import Storage from "expo-sqlite/kv-store";
import { Action, Empty, Section } from "./learning-ui";
import {
  buildSession,
  choiceOptions,
  memoryFor,
  parseMemory,
  recordRecall,
  type Word,
} from "../lib/vocabulary-practice";

export function VocabularySession({
  words,
  userId,
  setId,
  onComplete,
  saving,
  saveError,
}: {
  words: Word[];
  userId: string;
  setId: string;
  onComplete: () => void;
  saving: boolean;
  saveError?: string;
}) {
  const storageKey = `hakgyo:recall:v1:${userId}:${setId}`;
  const [loaded] = useState(() => {
    try {
      return {
        memory: parseMemory(Storage.getItemSync(storageKey)),
        failed: false,
      };
    } catch {
      return { memory: {}, failed: true };
    }
  });
  const [readFailed, setReadFailed] = useState(loaded.failed);
  const [storageError, setStorageError] = useState<string>();
  const [memory, setMemory] = useState(loaded.memory);
  const [queue, setQueue] = useState<Word[]>([]);
  const [index, setIndex] = useState(0);
  const [active, setActive] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState<boolean>();
  const [score, setScore] = useState(0);
  const [mode, setMode] = useState<"recall" | "choices">("recall");
  const answered = useRef(false);
  const word = queue[index];
  const reverse = index % 2 === 1;
  const choices = useMemo(
    () => (word ? choiceOptions(word, words, reverse) : []),
    [word, words, reverse],
  );
  const usableWords = words.filter(
    (item) => item.term.trim() && item.definition.trim(),
  );
  const reviewed = usableWords.filter(
    (item) => (memoryFor(item, memory)?.reviews ?? 0) > 0,
  ).length;

  function startSession(extra = false) {
    const next = extra
      ? usableWords
          .slice()
          .sort(
            (a, b) =>
              (memoryFor(a, memory)?.dueAt ?? 0) -
              (memoryFor(b, memory)?.dueAt ?? 0),
          )
          .slice(0, 10)
      : buildSession(words, memory, Date.now());
    setQueue(next);
    setIndex(0);
    setScore(0);
    setRevealed(false);
    setFeedback(undefined);
    setActive(true);
    answered.current = false;
  }
  function answer(recalled: boolean) {
    if (!word || answered.current) return;
    answered.current = true;
    const updated = recordRecall(memory, word, recalled, Date.now());
    setMemory(updated);
    setFeedback(recalled);
    setRevealed(true);
    setScore((value) => value + Number(recalled));
    try {
      Storage.setItemSync(storageKey, JSON.stringify(updated));
      setStorageError(undefined);
    } catch {
      setStorageError(
        "This review could not be saved on your device. Keep the session open and retry saving.",
      );
    }
  }
  const due = buildSession(words, memory, Date.now()).length;
  if (readFailed)
    return (
      <View className="gap-3">
        <Text accessibilityRole="alert" className="text-sm text-destructive">
          Your device review history could not be loaded.
        </Text>
        <Action
          secondary
          onPress={() => {
            try {
              setMemory(parseMemory(Storage.getItemSync(storageKey)));
              setReadFailed(false);
            } catch {
              /* Keep the retry visible without overwriting existing history. */
            }
          }}
        >
          Retry loading reviews
        </Action>
      </View>
    );
  return (
    <View className="gap-5">
      {storageError ? (
        <>
          <Text accessibilityRole="alert" className="text-sm text-destructive">
            {storageError}
          </Text>
          <Action
            secondary
            onPress={() => {
              try {
                Storage.setItemSync(storageKey, JSON.stringify(memory));
                setStorageError(undefined);
              } catch {
                /* Keep the visible retry. */
              }
            }}
          >
            Retry saving review
          </Action>
        </>
      ) : null}
      {!active ? (
        <>
          <Text className="text-base leading-6 text-muted-foreground">
            {due} words ready for review · {reviewed} of {usableWords.length}{" "}
            reviewed on this device
          </Text>
          <Text className="text-sm leading-5 text-muted-foreground">
            Short rounds of up to 10 words. Missed words return sooner;
            remembered words return after a longer interval.
          </Text>
          <Action
            secondary
            onPress={() =>
              setMode((value) => (value === "recall" ? "choices" : "recall"))
            }
          >
            {mode === "recall"
              ? "Mode: recall · tap for multiple choice"
              : "Mode: multiple choice · tap for recall"}
          </Action>
          <Action
            disabled={usableWords.length === 0}
            onPress={() => startSession(due === 0)}
          >
            {due ? "Start daily review" : "Extra practice"}
          </Action>
          {usableWords.length === 0 ? (
            <Empty>This set has no words ready for practice.</Empty>
          ) : null}
        </>
      ) : word ? (
        <>
          <Text className="text-sm font-semibold text-muted-foreground">
            {index + 1} / {queue.length} ·{" "}
            {reverse ? "Recall the word" : "Recall the meaning"}
          </Text>
          <View className="min-h-48 justify-center gap-5 rounded-3xl bg-muted p-6">
            <Text
              selectable
              className="text-center text-3xl font-bold text-foreground"
            >
              {reverse ? word.definition : word.term}
            </Text>
            {revealed ? (
              <Text selectable className="text-center text-xl text-primary">
                {reverse ? word.term : word.definition}
              </Text>
            ) : null}
          </View>
          {feedback !== undefined ? (
            <>
              <Text
                accessibilityLiveRegion="polite"
                className="text-base text-foreground"
              >
                {feedback
                  ? "Remembered. We’ll space the next review out."
                  : "Keep going. This word will return in 10 minutes."}
              </Text>
              <Action
                onPress={() => {
                  setIndex((value) => value + 1);
                  setFeedback(undefined);
                  setRevealed(false);
                  answered.current = false;
                }}
              >
                Continue
              </Action>
            </>
          ) : mode === "choices" && choices.length > 1 ? (
            choices.map((choice) => (
              <Action
                secondary
                key={choice}
                onPress={() =>
                  answer(choice === (reverse ? word.term : word.definition))
                }
              >
                {choice}
              </Action>
            ))
          ) : !revealed ? (
            <Action onPress={() => setRevealed(true)}>Reveal answer</Action>
          ) : (
            <>
              <Action onPress={() => answer(true)}>I remembered</Action>
              <Action secondary onPress={() => answer(false)}>
                Review again
              </Action>
            </>
          )}
        </>
      ) : (
        <Section title="Round complete">
          <Text className="text-2xl font-bold text-foreground">
            {score} / {queue.length} recalled
          </Text>
          <Text className="text-base text-muted-foreground">
            {reviewed} of {usableWords.length} words reviewed. Daily recall
            history is stored on this device.
          </Text>
          <Action onPress={() => setActive(false)}>
            Back to practice options
          </Action>
        </Section>
      )}
      {!word && usableWords.length > 0 && reviewed === usableWords.length ? (
        <>
          <Action
            secondary
            disabled={saving || !!storageError}
            onPress={onComplete}
          >
            {saving
              ? "Saving course progress…"
              : "Complete vocabulary activity"}
          </Action>
          <Text className="text-xs leading-5 text-muted-foreground">
            Course completion and its XP reward are recorded once. Extra
            practice does not award additional course XP.
          </Text>
        </>
      ) : null}
      {saveError ? (
        <Text accessibilityRole="alert" className="text-sm text-destructive">
          {saveError}
        </Text>
      ) : null}
    </View>
  );
}
