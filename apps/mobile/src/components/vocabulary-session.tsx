import type { RouterOutputs } from "@hakgyo/api";
import { displayMeanings, joinMeanings } from "@hakgyo/shared";
import { Stack } from "expo-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
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
import { useDeckTutorial } from "../lib/use-deck-tutorial";
import { useHandsFreeSpeech } from "../lib/use-hands-free-speech";
import {
  DeckTutorialCoach,
  DeckTutorialOverlay,
} from "./onboarding-deck-tutorial";
import { VocabularyModeSwitch } from "./vocabulary-mode-switch";
import { api } from "../lib/trpc";
import { GameResultSheet } from "../games/game-result";
import { GameBackToolbar } from "../games/game-screens";
import { useGameExitGuard } from "../games/game-navigation";
import type { GameLesson } from "../games/lesson";
import { useVocabularyProgressReporter } from "../lib/use-vocabulary-progress";
import { useAppTheme } from "../providers/AppThemeProvider";
import { toolbarIcons } from "../theme/toolbar-icons";
import { Action, Card, Empty, QueryState, Spinner } from "./learning-ui";
import type { VocabularyAttemptResult } from "../lib/use-vocabulary-progress";
import {
  VocabularyPracticeDeck,
  type VocabularyPracticeDeckCard,
  type VocabularyPracticeDeckHandle,
} from "./vocabulary-practice-deck";

type ProgressEvidence = RouterOutputs["learning"]["getVocabularyProgress"];

function toDeckCards(
  words: readonly Word[],
  mode: VocabularySpeechMode,
): VocabularyPracticeDeckCard[] {
  return words.map((word) => ({
    id: word.id,
    prompt: mode === "KR" ? displayMeanings(word.meanings) : word.term,
    answer: mode === "KR" ? word.term : displayMeanings(word.meanings),
    imageAssetId: word.imageAssetId,
    imageAccessibilityLabel: `Ilustrasi ${word.term}`,
  }));
}

export function VocabularySession({
  words,
  vocabularySetId,
  sourceCourseItemId,
  courseId,
  scrollGesture,
  onRoundActiveChange,
  onComplete,
  lesson,
}: {
  words: Word[];
  vocabularySetId: string;
  sourceCourseItemId: string;
  courseId?: string;
  scrollGesture: NativeGesture;
  onRoundActiveChange?: (active: boolean) => void;
  onComplete: () => Promise<void>;
  /**
   * Played as a round of a vocabulary lesson: every given word, at once,
   * without the start and finish sheets.
   */
  lesson?: GameLesson;
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
  // What happened to each word of the round, kept on the phone: the result
  // page shows it at once, whether or not the answers have synced yet.
  const [roundResults, setRoundResults] = useState<
    Readonly<Record<string, VocabularyAttemptResult>>
  >({});
  const [roundDone, setRoundDone] = useState(false);
  const [sessionError, setSessionError] = useState<string>();
  const [moving, setMoving] = useState(false);
  const [mode, setMode] = useState<VocabularySpeechMode>("KR");
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const deckRef = useRef<VocabularyPracticeDeckHandle>(null);
  const tutorial = useDeckTutorial();
  const answerInputRef = useRef<TextInput>(null);
  const usableWords = useMemo(
    () =>
      words.filter((word) => word.term.trim() && joinMeanings(word.meanings)),
    [words],
  );
  const evidence = latestEvidence ?? progressQuery.data;
  const progressByEntry = useMemo(
    () => new Map(evidence?.items.map((item) => [item.entryId, item]) ?? []),
    [evidence?.items],
  );
  // Memoized so the preview deck keeps stable cards while the learner types.
  const readyWords = useMemo(() => {
    // A lesson already picked its words.
    if (lesson) return usableWords;
    const unpracticed = usableWords.filter(
      (word) => !progressByEntry.get(word.id)?.practiced,
    );
    return unpracticed.length
      ? unpracticed
      : usableWords.filter((word) => progressByEntry.get(word.id)?.due);
  }, [lesson, progressByEntry, usableWords]);
  const { practicedCount, masteredCount } = useMemo(() => {
    let practiced = 0;
    let mastered = 0;
    for (const item of evidence?.items ?? []) {
      if (item.practiced) practiced += 1;
      if (item.mastered) mastered += 1;
    }
    return { practicedCount: practiced, masteredCount: mastered };
  }, [evidence?.items]);
  const currentWord = queue[index];
  const isStudyMode = mode === "ID";
  // Any one meaning counts when the learner answers with the meaning.
  const expectedAnswer = useMemo(
    () =>
      currentWord
        ? isStudyMode
          ? currentWord.meanings
          : currentWord.term
        : "",
    [currentWord, isStudyMode],
  );
  // Both directions are graded recall; the switch only changes which side of
  // the card is used as the prompt.
  const deckCards = useMemo(() => toDeckCards(queue, mode), [mode, queue]);
  const requestBusy = reporter.isPending;
  const busy = requestBusy || moving;
  // Match / Word Fall pattern: the game board stays mounted behind the
  // start / finish sheets. Before the round starts the deck shows a
  // non-interactive preview of the upcoming words.
  const previewCards = useMemo(
    () => toDeckCards(readyWords, mode),
    [mode, readyWords],
  );
  // Reserve room for mic + submit/next and the native toolbar's item spacing.
  // Room for the mic, the language flag and the submit button.
  const toolbarInputWidth = Math.max(120, Math.min(screenWidth - 212, 520));

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

  // A round starts as soon as the saved progress has loaded: Latihan's
  // source sheet (or the lesson) already showed what the game is.
  const autoStarted = useRef(false);
  useEffect(() => {
    if (autoStarted.current || progressQuery.isPending || !readyWords.length)
      return;
    autoStarted.current = true;
    beginRound();
  });

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

  function beginRound(roundWords: readonly Word[] = readyWords) {
    if (!roundWords.length || busy) return;
    stopSession();
    reporter.startSession();
    setRoundResults({});
    setRoundDone(false);
    const nextQueue = [...roundWords];
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
      ? isDefinitionCorrect(currentWord, submittedAnswer)
      : isVocabularyAnswerCorrect(submittedAnswer, currentWord.term);
    setFeedback({
      correct,
      saved: false,
    });
    await saveAnswer(correct);
  }

  function noteResult(entryId: string, result: VocabularyAttemptResult) {
    setRoundResults((current) => ({ ...current, [entryId]: result }));
  }

  async function saveAnswer(correct: boolean) {
    noteResult(currentWord.id, correct ? "CORRECT" : "INCORRECT");
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
        "Jawaban kamu tidak dapat disimpan di perangkat ini. Coba lagi.",
      );
    }
  }

  function stopSession() {
    speech.stop();
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
    if (lesson) {
      void reporter.finishSession();
      lesson.onRoundComplete();
      return;
    }
    setRoundDone(true);
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
    speech.interrupt();
    setRevealed(true);
    setRevealSaved(false);
    setAnswer("");
    void saveReveal();
  }

  async function saveReveal() {
    if (!currentWord) return;
    noteResult(currentWord.id, "REVEALED");
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
        "Jawaban yang dibuka tidak dapat disimpan di perangkat ini. Coba lagi sebelum melanjutkan.",
      );
    }
  }

  function finishAdvance() {
    speech.interrupt();
    setMoving(false);
    void nextWord();
  }

  function restartWord() {
    if (currentWord) prepareWord();
  }

  function handleInteractionChange(interacting: boolean) {
    if (interacting && speech.handsFree) {
      dismissKeyboard();
      speech.interrupt();
    }
    setMoving(interacting);
  }

  const speech = useHandsFreeSpeech({
    mode,
    contextualStrings: useMemo(
      () =>
        queue.flatMap((word) => (mode === "KR" ? [word.term] : word.meanings)),
      [mode, queue],
    ),
    expectedAnswer,
    blocked: !currentWord || busy,
    canAnswer:
      !!currentWord &&
      !busy &&
      !feedback &&
      !revealed &&
      answerClaim.current === "unanswered",
    canAutoAdvance: !!feedback?.correct && feedback.saved && !busy,
    onAdvance: advanceCard,
    onInterim: setAnswer,
    onAnswer: (transcripts) => void checkAnswer(transcripts),
    onMiss: () => setAnswer(""),
  });
  const { handsFree, listening } = speech;

  function toggleSpeechSession() {
    if (!handsFree) dismissKeyboard();
    speech.toggle();
  }

  function handleInputSubmit() {
    const canAdvance = (revealed && revealSaved) || feedback?.saved;
    if (canAdvance) {
      speech.endTyping();
      dismissKeyboard();
      advanceCard();
      return;
    }
    if (feedback) return;
    speech.endTyping();
    if (handsFree) dismissKeyboard();
    if (speech.rejectTyped(answer)) {
      setAnswer("");
      return;
    }
    void checkAnswer();
  }

  function handleModeChange(next: VocabularySpeechMode) {
    if (next === mode || busy) return;
    stopSession();
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
      <View className="min-h-64 items-center justify-center">
        <Spinner label="Memuat latihan kamu yang tersimpan…" />
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
    return <Empty>Set ini belum memiliki kata yang siap dilatih.</Empty>;
  }

  // The result page: after a round, or when the set has nothing to practise
  // now. It does not wait for the server.
  const showFinish =
    !lesson && !roundActive && (roundDone || readyWords.length === 0);

  function exitGame() {
    void onComplete().catch(() => undefined);
  }

  const visibleCards = roundActive ? deckCards : previewCards;
  const visibleCount = roundActive ? queue.length : readyWords.length;
  const visibleIndex = roundActive ? index : 0;
  // How to answer is taught once by the deck tutorial and the input's
  // placeholder; this line only reports what happened to an answer.
  const status = !roundActive
    ? null
    : !feedback
      ? null
      : !feedback.saved && !isStudyMode
        ? feedback.correct
          ? "Benar — menyimpan…"
          : "Kita ulang kata ini nanti — menyimpan…"
        : feedback.correct
          ? "Benar dan tersimpan."
          : isStudyMode
            ? "Disimpan untuk diulang."
            : "Disimpan untuk diulang lebih cepat.";

  let resultSheet: ReactNode = null;
  if (showFinish) {
    const played = queue.filter((word) => roundResults[word.id]);
    const correct = played.filter(
      (word) => roundResults[word.id] === "CORRECT",
    ).length;
    const retryWords = played.filter(
      (word) => roundResults[word.id] !== "CORRECT",
    );
    const allCorrect = roundDone && played.length > 0 && !retryWords.length;
    const again = retryWords.length ? retryWords : roundDone ? readyWords : [];
    resultSheet = (
      <GameResultSheet
        courseId={courseId}
        courseItemId={sourceCourseItemId}
        eyebrow="Kartu"
        title={
          !roundDone
            ? evidence?.mastered
              ? "Kosakata dikuasai"
              : "Belum ada kata untuk diulang"
            : allCorrect
              ? "Mantap, semua benar!"
              : "Ronde selesai"
        }
        description={
          !roundDone
            ? "Semua kata di set ini sudah kamu latih. Kata yang perlu diulang muncul lagi nanti."
            : latestEvidence
              ? `${masteredCount} dari ${usableWords.length} kata di set ini sudah dikuasai.`
              : "Jawabanmu tersimpan di perangkat dan disinkronkan saat tersambung."
        }
        mark={
          roundDone
            ? { value: `${correct}/${played.length}`, label: "benar" }
            : {
                value: `${practicedCount}/${usableWords.length}`,
                label: "dilatih",
              }
        }
        done={allCorrect || (!roundDone && Boolean(evidence?.mastered))}
        celebrate={allCorrect}
        facts={
          roundDone
            ? [
                { icon: "checkmark.seal.fill", text: `${correct} benar` },
                ...(retryWords.length
                  ? [
                      {
                        icon: "arrow.clockwise" as const,
                        text: `${retryWords.length} perlu diulang`,
                      },
                    ]
                  : []),
              ]
            : undefined
        }
        primary={
          again.length
            ? {
                eyebrow: retryWords.length ? "Ulangi" : "Main lagi",
                title: retryWords.length
                  ? `${retryWords.length} kata yang belum tepat`
                  : `${again.length} kata`,
                meta: retryWords.length
                  ? "Kata yang salah atau kamu buka jawabannya"
                  : "Ronde baru dengan kata yang siap dilatih",
                pill: "Mulai",
                onPress: () => beginRound(again),
              }
            : undefined
        }
        secondary={{ label: "Selesai", onPress: exit }}
        review={{
          title: "Perlu diulang",
          rows: retryWords.map((word) => ({
            key: word.id,
            title: word.term,
            detail: displayMeanings(word.meanings),
          })),
        }}
      />
    );
  }

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
          title: lesson?.title ?? "",
        }}
      />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.View hidesSharedBackground>
          <View
            accessibilityLabel={`Kata ${visibleCount === 0 ? 0 : visibleIndex + 1} dari ${visibleCount}, ${practicedCount} dari ${usableWords.length} sudah dilatih`}
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
            keyboardVisible ? "Sembunyikan keyboard" : "Tampilkan keyboard"
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
            handsFree
              ? "Hentikan latihan tanpa sentuh"
              : "Mulai latihan tanpa sentuh"
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
                ? `Arti dari ${currentWord?.term ?? "kata ini"}`
                : `Kata Korea untuk ${currentWord ? displayMeanings(currentWord.meanings) : "kata ini"}`
            }
            autoCapitalize="none"
            autoCorrect={false}
            onBlur={() => {
              setKeyboardVisible(false);
              speech.endTyping();
            }}
            onChangeText={(value) => {
              if (answerClaim.current === "unanswered" && !busy) {
                speech.beginTyping();
                setAnswer(value);
              }
            }}
            onFocus={() => {
              setKeyboardVisible(true);
              speech.beginTyping();
            }}
            onSubmitEditing={handleInputSubmit}
            placeholder={
              revealed
                ? "Siap untuk kata berikutnya?"
                : listening
                  ? speech.retryPrompt
                    ? "Ucapkan lagi…"
                    : "Mendengarkan…"
                  : isStudyMode
                    ? "Ketik artinya"
                    : "Ketik kata Koreanya"
            }
            placeholderTextColor={colors.mutedForeground}
            returnKeyType={revealed || feedback?.saved ? "next" : "done"}
            selectionColor={colors.primary}
            submitBehavior="submit"
            style={{
              color: speech.misheard ? colors.destructive : colors.foreground,
              fontSize: 16,
              height: 44,
              paddingHorizontal: 16,
              textAlign: "center",
              width: toolbarInputWidth,
            }}
            value={speech.misheard ?? answer}
          />
        </Stack.Toolbar.View>
        <Stack.Toolbar.View>
          <VocabularyModeSwitch
            bare
            mode={mode}
            onChange={(next) => {
              tutorial.onLanguageChange();
              handleModeChange(next);
            }}
            disabled={!roundActive || busy}
            highlight={tutorial.highlightLanguage && roundActive}
          />
        </Stack.Toolbar.View>
        <Stack.Toolbar.Button
          accessibilityLabel={
            feedback || revealed
              ? index + 1 < queue.length
                ? "Kata berikutnya"
                : "Selesaikan ronde"
              : "Periksa jawaban"
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
        {tutorial.visible && roundActive ? (
          <DeckTutorialCoach
            doneDetail="Petunjuk ini tidak muncul lagi."
            step={tutorial.step}
            steps={tutorial.steps}
          />
        ) : status ? (
          <Text className="text-center text-xs leading-5 text-muted-foreground">
            {status}
          </Text>
        ) : null}
        {speech.speechError && !feedback && !revealed ? (
          <Text
            accessibilityRole="alert"
            className="text-center text-sm text-destructive"
          >
            {speech.speechError}
          </Text>
        ) : null}
        <View>
          <VocabularyPracticeDeck
            key={roundActive ? roundKey : "preview"}
            ref={deckRef}
            cards={visibleCards}
            index={visibleIndex}
            correct={feedback?.correct}
            revealed={roundActive && revealed}
            onReveal={() => {
              tutorial.onReveal();
              revealAnswer();
            }}
            scrollGesture={scrollGesture}
            disabled={!roundActive || requestBusy || (revealed && !revealSaved)}
            onInteractionChange={(busy) => {
              tutorial.onInteractionChange(busy);
              handleInteractionChange(busy);
            }}
            onAdvanceComplete={() => {
              tutorial.onAdvance();
              finishAdvance();
            }}
          />
          {tutorial.showHand && roundActive && !moving ? (
            <DeckTutorialOverlay step={tutorial.step} />
          ) : null}
        </View>
      </View>

      {sessionError ? (
        <Card tone="destructive">
          <Text
            accessibilityRole="alert"
            className="text-sm leading-5 text-destructive"
          >
            {sessionError}
          </Text>
          {reporter.error ? (
            <Action
              variant="secondary"
              onPress={() => {
                if (feedback) void saveAnswer(feedback.correct);
                else if (revealed) void saveReveal();
              }}
            >
              {revealed ? "Coba simpan lagi" : "Coba simpan jawaban lagi"}
            </Action>
          ) : currentWord ? (
            <Action variant="secondary" onPress={restartWord}>
              Coba lagi
            </Action>
          ) : null}
        </Card>
      ) : null}
      {resultSheet}
    </View>
  );
}
