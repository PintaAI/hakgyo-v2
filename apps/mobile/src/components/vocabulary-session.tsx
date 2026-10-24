import type { RouterOutputs } from "@hakgyo/api";
import { joinMeanings } from "@hakgyo/shared";
import { Stack } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { useHandsFreeSpeech } from "../lib/use-hands-free-speech";
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
import {
  Action,
  Card,
  Empty,
  Eyebrow,
  ProgressBar,
  QueryState,
  Spinner,
} from "./learning-ui";
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
    prompt: mode === "KR" ? joinMeanings(word.meanings) : word.term,
    answer: mode === "KR" ? word.term : joinMeanings(word.meanings),
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
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const deckRef = useRef<VocabularyPracticeDeckHandle>(null);
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
  const { reviewDueWords, readyWords } = useMemo(() => {
    const unpracticed = usableWords.filter(
      (word) => !progressByEntry.get(word.id)?.practiced,
    );
    const reviewDue = usableWords.filter(
      (word) => progressByEntry.get(word.id)?.due,
    );
    return {
      reviewDueWords: reviewDue,
      readyWords: unpracticed.length ? unpracticed : reviewDue,
    };
  }, [progressByEntry, usableWords]);
  const { practicedCount, masteredCount } = useMemo(() => {
    let practiced = 0;
    let mastered = 0;
    for (const item of evidence?.items ?? []) {
      if (item.practiced) practiced += 1;
      if (item.mastered) mastered += 1;
    }
    return { practicedCount: practiced, masteredCount: mastered };
  }, [evidence?.items]);
  const progress = usableWords.length
    ? Math.min(100, Math.round((practicedCount / usableWords.length) * 100))
    : 0;
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
      ? isDefinitionCorrect(currentWord, submittedAnswer)
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

  const showStart =
    !roundActive && !evidence?.practiced && readyWords.length > 0;
  const showFinish = Boolean(evidence?.practiced) && !roundActive;
  const finishTitle = evidence?.mastered
    ? "Kosakata dikuasai"
    : "Latihan selesai";
  const finishDetail = evidence?.mastered
    ? "Semua kata berhasil diingat. Jawaban kamu tersimpan di perangkat ini dan disinkronkan di akhir ronde."
    : `Kamu sudah melatih setiap kata sekali. ${masteredCount} dari ${usableWords.length} kata sudah dikuasai, dan kamu bisa mengulanginya nanti.`;

  function exitGame() {
    void onComplete().catch(() => undefined);
  }

  const visibleCards = roundActive ? deckCards : previewCards;
  const visibleCount = roundActive ? queue.length : readyWords.length;
  const visibleIndex = roundActive ? index : 0;
  const idleHint = showFinish
    ? "Jawaban kamu tersimpan. Muat ulang untuk memuat kata yang tersisa."
    : isStudyMode
      ? "Ucapkan atau ketik artinya, kelupas sudut kartu untuk melihat jawaban, atau geser ke atas atau samping untuk melewati."
      : "Ucapkan atau ketik kata Koreanya, kelupas sudut kartu untuk melihat jawaban, atau geser ke atas atau samping untuk melewati.";

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
                : `Kata Korea untuk ${currentWord ? joinMeanings(currentWord.meanings) : "kata ini"}`
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
        <Text className="text-center text-xs leading-5 text-muted-foreground">
          {!roundActive
            ? idleHint
            : isStudyMode
              ? moving
                ? "Menyiapkan kartu berikutnya…"
                : listening
                  ? "Mendengarkan bahasa Indonesia… ketuk mikrofon untuk berhenti."
                  : revealed
                    ? "Jawaban ditampilkan. Geser ke atas atau samping atau ketuk Lanjut."
                    : feedback
                      ? feedback.correct
                        ? "Benar dan tersimpan. Geser ke atas atau samping atau ketuk Lanjut."
                        : "Disimpan untuk diulang. Geser ke atas atau samping atau ketuk Lanjut."
                      : "Ucapkan atau ketik artinya, kelupas sudut kartu untuk melihat jawaban, atau geser ke atas atau samping untuk melewati."
              : moving
                ? "Menyiapkan kartu berikutnya…"
                : listening
                  ? "Mendengarkan bahasa Korea… ketuk mikrofon untuk berhenti."
                  : revealed
                    ? "Jawaban ditampilkan. Geser ke atas atau samping atau ketuk Lanjut."
                    : feedback
                      ? !feedback.saved
                        ? feedback.correct
                          ? "Benar — menyimpan…"
                          : "Kita ulang kata ini nanti — menyimpan…"
                        : feedback.correct
                          ? "Benar dan tersimpan. Geser ke atas atau samping atau ketuk Lanjut."
                          : "Disimpan untuk diulang lebih cepat. Geser ke atas atau samping atau ketuk Lanjut."
                      : "Ucapkan atau ketik kata Koreanya, kelupas sudut kartu untuk melihat jawaban, atau geser ke atas atau samping untuk melewati."}
        </Text>
        {speech.speechError && !feedback && !revealed ? (
          <Text
            accessibilityRole="alert"
            className="text-center text-sm text-destructive"
          >
            {speech.speechError}
          </Text>
        ) : null}
        <View className="items-center">
          <VocabularyModeSwitch
            mode={mode}
            onChange={handleModeChange}
            disabled={!roundActive || busy}
          />
        </View>
        {visibleCards.length === 0 ? (
          <Card className="items-center gap-4 p-6">
            <Text className="text-3xl">🌱</Text>
            <View className="items-center gap-2">
              <Text className="text-xl font-black text-foreground">
                Kerja bagus untuk sekarang
              </Text>
              <Text className="text-center text-sm leading-6 text-muted-foreground">
                Jawaban kamu tersimpan. Muat ulang untuk memuat kata yang
                tersisa.
              </Text>
            </View>
            <Action
              variant="secondary"
              onPress={() => void progressQuery.refetch()}
            >
              Periksa lagi
            </Action>
          </Card>
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

      <GameStartModal
        content={
          <View className="gap-4">
            <View className="flex-row items-start justify-between gap-5">
              <View className="min-w-0 flex-1 gap-0.5">
                <Eyebrow tone="primary">Progres set</Eyebrow>
                <Text className="text-xl font-black tracking-tight text-foreground">
                  {practicedCount} dilatih
                </Text>
              </View>
              <Text className="text-2xl font-black tabular-nums text-foreground">
                {progress}%
              </Text>
            </View>
            <ProgressBar value={progress} max={100} />
            <View className="flex-row items-center justify-between gap-4">
              <Text className="text-sm text-muted-foreground">
                {usableWords.length} kata total
              </Text>
              <Text className="text-sm font-semibold text-primary">
                {readyWords.length} siap sekarang
              </Text>
            </View>
          </View>
        }
        detail="Pengulangan penguasaan tetap tersedia tanpa menghambat kurikulum kamu."
        gameKey="cards"
        onPrimary={beginRound}
        onSecondary={exit}
        primaryLabel={`Mulai latihan · ${readyWords.length} kata`}
        title="Kartu"
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
        eyebrow="Kartu"
        gameKey="cards"
        onPrimary={reviewDueWords.length ? beginRound : () => void exitGame()}
        onSecondary={reviewDueWords.length ? exit : undefined}
        primaryLabel={
          reviewDueWords.length
            ? `Ulangi lagi · ${reviewDueWords.length} kata`
            : "Kembali ke latihan"
        }
        secondaryLabel={reviewDueWords.length ? "Keluar" : undefined}
        title={finishTitle}
        visible={showFinish}
      />
    </View>
  );
}
