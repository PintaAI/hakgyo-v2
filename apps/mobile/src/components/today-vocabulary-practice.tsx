import type { RouterOutputs } from "@hakgyo/api";
import { entryMeanings, joinMeanings } from "@hakgyo/shared";
import { useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, Text, TextInput, View } from "react-native";
import type { NativeGesture } from "react-native-gesture-handler";

import { localSample } from "../lib/local-sample";
import { useMobileSyncActions } from "../providers/MobileSyncProvider";
import { isDefinitionCorrect } from "../lib/today-vocabulary-practice";
import { isVocabularyAnswerCorrect } from "../lib/vocabulary-practice";
import {
  matchSpeechAlternative,
  type VocabularySpeechMode,
} from "../lib/vocabulary-speech";
import { useHandsFreeSpeech } from "../lib/use-hands-free-speech";
import { HandsFreeAnswerField } from "./hands-free-answer-field";
import { VocabularyModeSwitch } from "./vocabulary-mode-switch";
import { Action, Empty, Eyebrow } from "./learning-ui";
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
  const initializedPool = useRef<string | undefined>(undefined);
  const inputRef = useRef<TextInput>(null);
  const restoreInputFocus = useRef(false);

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
        prompt: mode === "KR" ? joinMeanings(entryMeanings(item)) : item.term,
        answer: mode === "KR" ? item.term : joinMeanings(entryMeanings(item)),
        imageAssetId: item.imageAssetId,
        imageAccessibilityLabel: `${item.term} illustration`,
      })),
    [mode, round],
  );
  // Any one meaning counts when the learner answers with the meaning.
  const expectedAnswer = useMemo(
    () => (card ? (mode === "KR" ? card.term : entryMeanings(card)) : ""),
    [card, mode],
  );

  function isAnswerCorrect(value: string) {
    if (!card) return false;
    return mode === "KR"
      ? isVocabularyAnswerCorrect(value, card.term)
      : isDefinitionCorrect({ meanings: entryMeanings(card) }, value);
  }

  async function checkAnswer(spokenTranscripts?: readonly string[]) {
    if (!card || submitted.current || moving) return;
    const spokenDisplay = spokenTranscripts?.find((text) => text.trim());
    const value = spokenDisplay ?? answer;
    if (!value.trim()) return;
    submitted.current = true;
    speech.clearMiss();
    // Exact match against any STT alternative; fall back to the first
    // transcript so wrong answers are still recorded.
    const matched = spokenTranscripts?.length
      ? (matchSpeechAlternative(expectedAnswer, spokenTranscripts) ??
        spokenDisplay!)
      : value;
    if (spokenDisplay) setAnswer(matched);
    const correct = isAnswerCorrect(matched);
    setFeedback({ correct, saved: false });
    if (!speech.handsFree) inputRef.current?.focus();

    await saveAnswer(correct);
  }

  async function recordAttempt(result: "CORRECT" | "INCORRECT" | "REVEALED") {
    if (!card) return false;
    const sessionId = roundSessionId.current;
    setRecordError(null);
    setRecordPending(true);
    try {
      await recordVocabularyAttempt({
        gameKey: "today-cards",
        sessionId,
        timeZone: deviceTimeZone(),
        attempt: {
          attemptId: `${sessionId}:${index}:${card.entryId}${result === "REVEALED" ? ":revealed" : ""}`,
          entryId: card.entryId,
          evidence: "RECALL",
          result,
          sourceCourseItemId: card.sourceCourseItemId,
          vocabularySetId: card.vocabularySetId,
        },
      });
      return roundSessionId.current === sessionId;
    } catch (cause) {
      if (roundSessionId.current === sessionId)
        setRecordError(
          cause instanceof Error
            ? cause
            : new Error("Tidak dapat menyimpan di perangkat"),
        );
      throw cause;
    } finally {
      setRecordPending(false);
    }
  }

  async function saveAnswer(correct: boolean) {
    const sessionId = roundSessionId.current;
    try {
      if (await recordAttempt(correct ? "CORRECT" : "INCORRECT"))
        setFeedback({ correct, saved: true });
    } catch {
      if (roundSessionId.current === sessionId)
        setFeedback({ correct, saved: false });
    }
  }

  async function saveReveal() {
    try {
      if (await recordAttempt("REVEALED")) setRevealSaved(true);
    } catch {
      // Keep the card blocked so the learner can retry this exact outcome.
    }
  }

  function nextCard() {
    speech.interrupt();
    deckRef.current?.advance();
    if (!speech.handsFree) inputRef.current?.focus();
  }

  function revealAnswer() {
    if (!card || submitted.current || moving) return;
    // Claim the card synchronously: a queued keyboard submit must not award
    // credit after the learner has seen the answer.
    submitted.current = true;
    speech.interrupt();
    setRevealed(true);
    setRevealSaved(false);
    setAnswer("");
    // Keep the keyboard open: the input becomes "Siap untuk kata berikutnya?"
    // with a Next return key, so the learner can advance without re-tapping.
    if (!speech.handsFree) inputRef.current?.focus();
    void saveReveal();
  }

  function handleInteractionChange(busy: boolean) {
    if (busy) {
      if (speech.handsFree) {
        restoreInputFocus.current = false;
        Keyboard.dismiss();
        speech.interrupt();
      } else {
        restoreInputFocus.current = inputRef.current?.isFocused() ?? false;
      }
    }
    setMoving(busy);
  }

  function finishAdvance() {
    speech.interrupt();
    setIndex((value) => value + 1);
    setAnswer("");
    setFeedback(undefined);
    setRevealed(false);
    setRecordError(null);
    setMoving(false);
    submitted.current = false;
    if (index + 1 >= round.length) {
      Keyboard.dismiss();
      speech.stop();
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
    speech.beginTyping();
    setAnswer(value);
  }

  function handleInputSubmit() {
    speech.endTyping();
    if (feedback?.saved || (revealed && revealSaved)) {
      if (speech.handsFree) Keyboard.dismiss();
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
    if (speech.handsFree) Keyboard.dismiss();
    if (speech.rejectTyped(answer)) {
      setAnswer("");
      return;
    }
    void checkAnswer();
  }

  const speech = useHandsFreeSpeech({
    mode,
    contextualStrings: useMemo(
      () =>
        round.flatMap((item) =>
          mode === "KR" ? [item.term] : entryMeanings(item),
        ),
      [mode, round],
    ),
    expectedAnswer,
    blocked: !card || moving,
    canAnswer:
      !!card && !moving && !feedback && !revealed && !submitted.current,
    canAutoAdvance: !!feedback?.correct && feedback.saved && !moving,
    onAdvance: nextCard,
    onInterim: setAnswer,
    onAnswer: (transcripts) => void checkAnswer(transcripts),
    onMiss: () => setAnswer(""),
  });
  const { handsFree, listening } = speech;

  function toggleSpeechSession() {
    if (!handsFree) Keyboard.dismiss();
    speech.toggle();
  }

  function handleModeChange(next: VocabularySpeechMode) {
    if (next === mode || moving) return;
    speech.stop();
    Keyboard.dismiss();
    setMode(next);
    setAnswer("");
  }

  async function newMix() {
    speech.stop();
    setRecordError(null);
    await finishVocabularySession(organizationId);
    setSeed(randomSeed());
  }

  const hint = moving
    ? "Menyiapkan kartu berikutnya…"
    : listening
      ? mode === "KR"
        ? "Mendengarkan bahasa Korea… ketuk mikrofon untuk berhenti."
        : "Mendengarkan bahasa Indonesia… ketuk mikrofon untuk berhenti."
      : revealed
        ? "Hanya belajar · XP dan streak tidak berubah. Geser ke atas atau samping atau ketuk Lanjut."
        : feedback
          ? feedback.saved
            ? "Geser ke atas atau samping atau ketuk Lanjut jika sudah siap."
            : "Menyimpan jawaban kamu…"
          : mode === "KR"
            ? "Ucapkan atau ketik kata Koreanya, kelupas sudut kartu untuk melihat jawaban, atau geser ke atas atau samping untuk melewati."
            : "Ucapkan atau ketik artinya, kelupas sudut kartu untuk melihat jawaban, atau geser ke atas atau samping untuk melewati.";
  const placeholder = revealed
    ? "Siap untuk kata berikutnya?"
    : listening
      ? speech.retryPrompt
        ? "Ucapkan lagi…"
        : "Mendengarkan…"
      : mode === "KR"
        ? "Ketik kata Koreanya"
        : "Ketik artinya";
  const answered = Boolean(feedback || revealed);

  return (
    <View className="gap-3" style={{ overflow: "visible", zIndex: 1 }}>
      {!pool.hasAvailableContent ? (
        <Empty>Belum ada kata untuk dilatih.</Empty>
      ) : round.length > 0 ? (
        <>
          <Eyebrow size="md" className="text-center">
            {card
              ? `${card.vocabularySetTitle} · ${card.courseTitle}`
              : "Siap untuk campuran berikutnya?"}
          </Eyebrow>
          <View className="items-center">
            <VocabularyModeSwitch
              mode={mode}
              onChange={handleModeChange}
              disabled={moving || speech.speechBusy}
            />
          </View>
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
          {card ? (
            <View className="gap-3">
              <Text className="text-center text-xs text-muted-foreground">
                {hint}
              </Text>
              {speech.speechError && !answered ? (
                <Text
                  accessibilityRole="alert"
                  className="text-center text-sm text-destructive"
                >
                  {speech.speechError}
                </Text>
              ) : null}
              {recordError ? (
                <Text
                  accessibilityRole="alert"
                  className="text-center text-sm text-destructive"
                >
                  Jawaban kamu tidak dapat disimpan di perangkat ini. Coba lagi.
                </Text>
              ) : null}
              <View className="flex-row items-center gap-2">
                <HandsFreeAnswerField
                  inputRef={inputRef}
                  accessibilityLabel={
                    mode === "KR"
                      ? `Kata Korea untuk ${joinMeanings(entryMeanings(card))}`
                      : `Arti dari ${card.term}`
                  }
                  value={answer}
                  placeholder={placeholder}
                  misheard={speech.misheard}
                  shakeStyle={speech.shakeStyle}
                  levels={
                    listening && !speech.retryPrompt ? speech.levels : undefined
                  }
                  returnKeyType={answered ? "next" : "done"}
                  onChangeText={handleAnswerChange}
                  onFocus={speech.beginTyping}
                  onBlur={speech.endTyping}
                  onSubmitEditing={handleInputSubmit}
                  mic={
                    handsFree || !answered
                      ? {
                          active: handsFree,
                          busy: speech.speechBusy,
                          disabled: moving && !handsFree,
                          dimmed: moving,
                          onPress: toggleSpeechSession,
                        }
                      : undefined
                  }
                  action={
                    answered
                      ? {
                          kind: "next",
                          accessibilityLabel:
                            feedback && !feedback.saved
                              ? "Coba simpan jawaban lagi"
                              : revealed && !revealSaved
                                ? "Coba simpan lagi"
                                : "Kata berikutnya",
                          busy: moving || recordPending,
                          disabled: moving || recordPending,
                          dimmed: moving,
                          onPress: () => {
                            if (feedback && !feedback.saved) {
                              void saveAnswer(feedback.correct);
                            } else if (revealed && !revealSaved) {
                              void saveReveal();
                            } else {
                              nextCard();
                            }
                          },
                        }
                      : {
                          kind: "check",
                          accessibilityLabel:
                            mode === "KR"
                              ? "Periksa kata Korea"
                              : "Periksa arti",
                          busy: recordPending,
                          disabled: moving || !answer.trim(),
                          dimmed: !answer.trim(),
                          onPress: () => void checkAnswer(),
                        }
                  }
                />
              </View>
            </View>
          ) : (
            <Action onPress={newMix}>Campuran berikutnya</Action>
          )}
        </>
      ) : null}
    </View>
  );
}
