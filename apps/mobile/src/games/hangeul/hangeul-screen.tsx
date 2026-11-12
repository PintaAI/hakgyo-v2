import type { HangeulGameStage } from "@hakgyo/shared/hangeul";
import { Stack } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeInRight,
  ZoomIn,
} from "react-native-reanimated";

import { Action } from "../../components/learning-ui";
import { useAppTheme } from "../../providers/AppThemeProvider";
import { withOpacity } from "../../theme/colors";
import { gameLeaveLabel, type GameSource } from "../game-exit";
import { GameIconTile } from "../game-icon-tile";
import { PressableScale, useOutcomeMotion } from "../game-motion";
import { leaveGame, useGameExitGuard } from "../game-navigation";
import { GameResultSheet } from "../game-result";
import {
  GameActionBar,
  GameRoundHeader,
  type GameBarAction,
} from "../game-round";
import { GamePage } from "../game-screens";
import {
  getHangeulLetter,
  getQuizOptions,
  HANGEUL_LETTERS,
  type HangeulLetter,
} from "./hangeul-data";
import { hangeulLessonPlan, type HangeulFamilyGroup } from "./hangeul-stage";
import { SymbolIcon } from "../../components/ui/symbol-icon";
import { hapticError, hapticSuccess } from "../../lib/haptics";

type Phase = "learn" | "quiz" | "complete";

/**
 * One letter on a plain card. A native glass view per letter (the cheat sheet
 * shows them all) is the pattern that made long quizzes lag. `enterIndex`
 * staggers the letters in on a lesson step; the cheat sheet leaves it out.
 */
function LetterTile({
  letter,
  enterIndex,
}: {
  letter: HangeulLetter;
  enterIndex?: number;
}) {
  const { colors } = useAppTheme();
  const example = letter.example;
  const exampleIndex = example ? letter.note.indexOf(example) : -1;
  const kindColors =
    letter.kind === "vowel"
      ? {
          backgroundColor: colors.highlightBlueBackground,
          color: colors.highlightBlueText,
        }
      : {
          backgroundColor: colors.highlightOrangeBackground,
          color: colors.highlightOrangeText,
        };

  return (
    <Animated.View
      entering={
        enterIndex === undefined
          ? undefined
          : FadeInDown.delay(enterIndex * 45)
              .springify()
              .damping(16)
      }
      style={styles.letterTileShell}
    >
      <View
        style={[
          styles.letterTile,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.letterTileHeader}>
          <View
            style={[
              styles.letterIcon,
              { backgroundColor: withOpacity(colors.primary, 0.12) },
            ]}
          >
            <Text style={[styles.letterCharacter, { color: colors.primary }]}>
              {letter.character}
            </Text>
          </View>
        </View>
        <View style={styles.letterCopy}>
          <Text style={[styles.letterCue, { color: colors.foreground }]}>
            {letter.cue}
          </Text>
          <Text
            style={[styles.letterNote, { color: colors.mutedForeground }]}
            numberOfLines={2}
          >
            {exampleIndex >= 0 && example ? (
              <>
                {letter.note.slice(0, exampleIndex)}
                <Text style={{ color: colors.primary, fontWeight: "900" }}>
                  {example}
                </Text>
                {letter.note.slice(exampleIndex + example.length)}
              </>
            ) : (
              letter.note
            )}
          </Text>
        </View>
      </View>
      <View
        style={[
          styles.letterKind,
          { backgroundColor: kindColors.backgroundColor },
        ]}
      >
        <Text style={[styles.letterKindText, { color: kindColors.color }]}>
          {letter.kind === "vowel" ? "V" : "K"}
        </Text>
      </View>
    </Animated.View>
  );
}

function OverviewStep() {
  const { colors } = useAppTheme();
  return (
    <View style={styles.stepContent}>
      <View style={styles.heroIcon}>
        <GameIconTile iconKey="stroke-master" size={128} />
      </View>
      <View style={styles.centeredCopy}>
        <Text
          style={[
            styles.eyebrow,
            styles.familyEyebrow,
            { color: colors.primary },
          ]}
        >
          CARA KERJANYA
        </Text>
        <Text
          style={[
            styles.heading,
            styles.familyHeadingText,
            { color: colors.foreground },
          ]}
        >
          Huruf menjadi satu blok
        </Text>
        <Text
          style={[
            styles.body,
            styles.familyBody,
            { color: colors.mutedForeground },
          ]}
        >
          Vokal tidak dapat berdiri sendiri sebagai blok. Jika suku kata dimulai
          dengan vokal, pakai ㅇ tanpa bunyi sebagai konsonan awal.
        </Text>
      </View>
      <View style={styles.equationRow}>
        <EquationTile letter="ㅇ" label="diam" />
        <Text style={[styles.equationSign, { color: colors.mutedForeground }]}>
          +
        </Text>
        <EquationTile letter="ㅏ" label="a" />
        <Text style={[styles.equationSign, { color: colors.mutedForeground }]}>
          =
        </Text>
        <EquationTile highlighted letter="아" label="a" />
      </View>
    </View>
  );
}

function EquationTile({
  highlighted = false,
  label,
  letter,
}: {
  highlighted?: boolean;
  label: string;
  letter: string;
}) {
  const { colors } = useAppTheme();
  const foreground = highlighted ? colors.primaryForeground : colors.foreground;
  return (
    <View
      style={[
        styles.equationTile,
        { backgroundColor: highlighted ? colors.primary : colors.muted },
      ]}
    >
      <Text style={[styles.equationLetter, { color: foreground }]}>
        {letter}
      </Text>
      <Text
        style={[
          styles.equationLabel,
          {
            color: highlighted
              ? colors.primaryForeground
              : colors.mutedForeground,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function FamilyStep({ group }: { group: HangeulFamilyGroup }) {
  const { colors } = useAppTheme();
  const { family, letters } = group;

  return (
    <View style={styles.stepContent}>
      <View style={styles.familyHeading}>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>
          KELUARGA HURUF
        </Text>
        <Text style={[styles.heading, { color: colors.foreground }]}>
          {family.title}
        </Text>
        <Text style={[styles.body, { color: colors.mutedForeground }]}>
          {family.detail}
        </Text>
      </View>
      <View style={styles.letterGrid}>
        {letters.map((letter, index) => (
          <LetterTile key={letter.id} enterIndex={index} letter={letter} />
        ))}
      </View>
    </View>
  );
}

function CheatSheet({ groups }: { groups: HangeulFamilyGroup[] }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.cheatSheet}>
      {groups.map(({ family, letters }) => {
        return (
          <View key={family.id} style={styles.cheatSheetFamilySection}>
            <Text
              style={[styles.cheatSheetFamilyTitle, { color: colors.primary }]}
            >
              {family.title}
            </Text>
            <View style={styles.cheatSheetLetterGrid}>
              {letters.map((letter) => (
                <LetterTile key={letter.id} letter={letter} />
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function HangeulCheatSheetModal({
  groups,
  visible,
  onClose,
}: {
  groups: HangeulFamilyGroup[];
  visible: boolean;
  onClose: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <Modal
      allowSwipeDismissal={false}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="formSheet"
      visible={visible}
    >
      <ScrollView
        contentContainerStyle={styles.cheatSheetModalContent}
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: colors.background }}
      >
        <View style={styles.cheatSheetModalBody}>
          <View style={styles.cheatSheetModalHeader}>
            <View>
              <Text style={[styles.modalHeading, { color: colors.foreground }]}>
                Cheatsheet 한글
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tutup cheat sheet"
              hitSlop={8}
              onPress={onClose}
              style={[
                styles.modalCloseButton,
                { backgroundColor: colors.muted },
              ]}
            >
              <SymbolIcon
                name="xmark"
                size={16}
                tintColor={colors.foreground}
                weight="bold"
              />
            </Pressable>
          </View>
          <CheatSheet groups={groups} />
          <Action onPress={onClose}>Kembali ke kuis</Action>
        </View>
      </ScrollView>
    </Modal>
  );
}

function QuizOption({
  cue,
  selected,
  correct,
  revealed,
  onPress,
}: {
  cue: string;
  selected: boolean;
  correct: boolean;
  revealed: boolean;
  onPress: () => void;
}) {
  const { colorScheme, colors } = useAppTheme();
  // The picked wrong answer shakes; the right one pops once revealed.
  const motion = useOutcomeMotion({
    wrongCount: revealed && selected && !correct ? 1 : 0,
    correct: revealed && correct,
  });
  const borderColor = revealed
    ? correct
      ? colors.primary
      : selected
        ? colors.destructive
        : colors.border
    : colors.border;
  const backgroundColor =
    revealed && correct
      ? withOpacity(colors.primary, colorScheme === "dark" ? 0.35 : 0.16)
      : revealed && selected
        ? withOpacity(colors.destructive, colorScheme === "dark" ? 0.28 : 0.12)
        : colors.card;

  return (
    <Animated.View style={[styles.option, motion]}>
      <PressableScale
        accessibilityRole="button"
        accessibilityState={{ selected, disabled: revealed }}
        disabled={revealed}
        onPress={onPress}
        style={[styles.optionSurface, { backgroundColor, borderColor }]}
      >
        <Text style={[styles.optionText, { color: colors.foreground }]}>
          {cue}
        </Text>
      </PressableScale>
    </Animated.View>
  );
}

function introCopy(plan: ReturnType<typeof hangeulLessonPlan>) {
  const { newLetters, reviewLetters, stage } = plan;
  const vowels = newLetters.filter((letter) => letter.kind === "vowel").length;
  const consonants = newLetters.length - vowels;
  if (!stage) {
    return {
      body: `Pelajari ${vowels} vokal dan ${consonants} konsonan, termasuk bentuk dasar dan ganda, lewat keluarga yang mudah diingat.`,
      detail: `Kenali keluarga bentuk, bunyi bantu Indonesia, dan ${newLetters.length} huruf Hangeul dasar maupun ganda. Huruf yang salah akan muncul lagi sampai kamu bisa.`,
      done: "Kamu sudah mengenali semua vokal dan konsonan dasar maupun ganda pada sesi ini. Ulangi lagi untuk memperkuat ingatan.",
      title: "Kenalan dengan Hangeul",
    };
  }
  if (stage.batchim) {
    return {
      body: `Ulangi semua ${newLetters.length} huruf Hangeul sebelum membaca batchim.`,
      detail: `Ulangi ${newLetters.length} huruf Hangeul lewat keluarga bentuk dan bunyi bantu Indonesia. Huruf yang salah akan muncul lagi sampai kamu bisa.`,
      done: "Kamu sudah mengenali semua huruf Hangeul. Sekarang kamu siap membaca batchim.",
      title: stage.title,
    };
  }
  const letters = newLetters.map((letter) => letter.character).join(" ");
  const review = reviewLetters.length
    ? ` Kuis juga mengulang ${reviewLetters.length} huruf sebelumnya.`
    : "";
  return {
    body: `Pelajari ${newLetters.length} huruf baru: ${letters}.${review}`,
    detail: `Kenali ${newLetters.length} huruf baru (${letters}) lewat keluarga bentuk dan bunyi bantu Indonesia.${review} Huruf yang salah akan muncul lagi sampai kamu bisa.`,
    done: `Kamu sudah mengenali huruf ${letters}. Ulangi lagi untuk memperkuat ingatan.`,
    title: stage.title,
  };
}

/** How long an answer stays before the next letter: right, then wrong. */
const AUTO_NEXT_RIGHT_MS = 800;
const AUTO_NEXT_WRONG_MS = 2200;

export function HangeulScreen({
  source,
  stage,
}: {
  source?: GameSource;
  stage?: HangeulGameStage;
}) {
  const { colors } = useAppTheme();
  const plan = useMemo(() => hangeulLessonPlan(stage), [stage]);
  const copy = introCopy(plan);
  const introStepCount = plan.learnFamilies.length + 1;
  const quizLength = plan.quizIds.length;
  // Starts on the first lesson: the tile in Latihan (or the lesson that
  // opened it) already said what the game is.
  const [phase, setPhase] = useState<Phase>("learn");
  const [lessonIndex, setLessonIndex] = useState(0);
  const [quizQueue, setQuizQueue] = useState(() => plan.quizIds);
  const [masteredIds, setMasteredIds] = useState<Set<string>>(() => new Set());
  const [selectedCue, setSelectedCue] = useState<string>();
  const [quizRound, setQuizRound] = useState(0);
  const [showCheatSheet, setShowCheatSheet] = useState(false);

  const [missedIds, setMissedIds] = useState<Set<string>>(() => new Set());

  const leave = useCallback(() => leaveGame(source), [source]);
  const leaveLabel = gameLeaveLabel(source);
  // Nothing is saved, so leaving needs no confirmation; the guard sends
  // every back action (button, swipe, Android back) to the right place.
  const exit = useGameExitGuard({
    active: phase !== "complete",
    locked: false,
    onExit: leave,
  });
  const currentLetter =
    getHangeulLetter(quizQueue[0] ?? "") ?? plan.pool[0] ?? HANGEUL_LETTERS[0]!;
  const options = useMemo(
    () => getQuizOptions(currentLetter, quizRound, plan.pool),
    [currentLetter, quizRound, plan.pool],
  );
  const answerCorrect = selectedCue === currentLetter.cue;

  const startQuiz = () => {
    setQuizQueue(plan.quizIds);
    setMasteredIds(new Set());
    setMissedIds(new Set());
    setSelectedCue(undefined);
    setQuizRound(0);
    setShowCheatSheet(false);
    setPhase("quiz");
  };

  const continueLearning = () => {
    if (lessonIndex + 1 < introStepCount) {
      setLessonIndex((current) => current + 1);
      return;
    }
    startQuiz();
  };

  const goToPreviousLesson = () => {
    if (lessonIndex > 0) {
      setLessonIndex((current) => current - 1);
    }
  };

  const continueQuiz = () => {
    if (!selectedCue) return;
    const remaining = quizQueue.slice(1);

    if (answerCorrect) {
      const nextMastered = new Set(masteredIds).add(currentLetter.id);
      setMasteredIds(nextMastered);
      if (remaining.length === 0) {
        hapticSuccess();
        setPhase("complete");
        return;
      }
    } else {
      remaining.push(currentLetter.id);
    }

    setQuizQueue(remaining);
    setQuizRound((round) => round + 1);
    setSelectedCue(undefined);
  };

  // An answer moves on by itself: soon when right, after a longer look at
  // the right answer when wrong. "Lanjut" skips the wait.
  const continueQuizRef = useRef(continueQuiz);
  continueQuizRef.current = continueQuiz;
  useEffect(() => {
    if (phase !== "quiz" || !selectedCue) return;
    const timer = setTimeout(
      () => continueQuizRef.current(),
      answerCorrect ? AUTO_NEXT_RIGHT_MS : AUTO_NEXT_WRONG_MS,
    );
    return () => clearTimeout(timer);
  }, [answerCorrect, phase, quizRound, selectedCue]);

  const restart = () => {
    setLessonIndex(0);
    setPhase("learn");
  };

  const lastStep = lessonIndex + 1 === introStepCount;
  const barActions: GameBarAction[] =
    phase === "learn"
      ? [
          {
            label: "Sebelumnya",
            onPress: goToPreviousLesson,
            disabled: lessonIndex === 0,
          },
          {
            label: lastStep ? "Mulai cek ingatan" : "Lanjut",
            onPress: continueLearning,
            prominent: true,
          },
        ]
      : phase === "quiz"
        ? [
            {
              label: "Lanjut",
              accessibilityLabel: selectedCue ? "Lanjut kuis" : "Pilih jawaban",
              onPress: continueQuiz,
              disabled: !selectedCue,
              prominent: true,
            },
          ]
        : [];
  const missedLetters = [...missedIds]
    .map((id) => getHangeulLetter(id))
    .filter((letter): letter is HangeulLetter => Boolean(letter));

  return (
    <View className="flex-1 bg-background">
      <GameRoundHeader
        onBack={exit}
        stats={
          phase === "quiz"
            ? [{ value: `${masteredIds.size}/${quizLength}` }]
            : [
                {
                  value: `${Math.min(lessonIndex + 1, introStepCount)}/${introStepCount}`,
                },
              ]
        }
        statsLabel={
          phase === "quiz"
            ? `${masteredIds.size} dari ${quizLength} huruf dikenali`
            : `Bagian ${lessonIndex + 1} dari ${introStepCount}`
        }
      >
        {phase === "quiz" ? (
          <Stack.Toolbar.Button
            accessibilityLabel="Buka cheat sheet Hangeul"
            onPress={() => setShowCheatSheet(true)}
          >
            Cheat sheet
          </Stack.Toolbar.Button>
        ) : null}
      </GameRoundHeader>
      <GameActionBar actions={barActions} />
      <GamePage>
        {phase === "learn" ? (
          // Keyed by the step, so each step slides in.
          <Animated.View key={lessonIndex} entering={FadeInRight.duration(220)}>
            {lessonIndex === 0 ? (
              <OverviewStep />
            ) : (
              <FamilyStep group={plan.learnFamilies[lessonIndex - 1]!} />
            )}
          </Animated.View>
        ) : null}

        {phase === "quiz" ? (
          <>
            <View style={styles.quizPrompt}>
              <Text
                style={[
                  styles.quizInstruction,
                  { color: colors.mutedForeground },
                ]}
              >
                Pilih bunyi bantu yang paling cocok
              </Text>
              {/* Keyed by the round, so each new letter zooms in. */}
              <Animated.Text
                key={quizRound}
                entering={ZoomIn.springify().damping(14)}
                style={[styles.quizLetter, { color: colors.foreground }]}
              >
                {currentLetter.character}
              </Animated.Text>
            </View>
            <View style={styles.optionGrid}>
              {options.map((cue) => (
                <QuizOption
                  key={`${quizRound}-${cue}`}
                  correct={cue === currentLetter.cue}
                  cue={cue}
                  // One answer per letter; it moves on by itself.
                  onPress={() => {
                    if (selectedCue) return;
                    if (cue === currentLetter.cue) hapticSuccess();
                    else {
                      hapticError();
                      setMissedIds((ids) => new Set(ids).add(currentLetter.id));
                    }
                    setSelectedCue((current) => current ?? cue);
                  }}
                  revealed={Boolean(selectedCue)}
                  selected={selectedCue === cue}
                />
              ))}
            </View>
            {selectedCue ? (
              <Animated.View
                entering={FadeInDown.springify().damping(16)}
                style={[
                  styles.feedback,
                  {
                    backgroundColor: answerCorrect
                      ? withOpacity(colors.primary, 0.1)
                      : withOpacity(colors.destructive, 0.08),
                    borderColor: answerCorrect
                      ? colors.primary
                      : colors.destructive,
                  },
                ]}
              >
                <Text
                  style={[styles.feedbackTitle, { color: colors.foreground }]}
                >
                  {answerCorrect ? "Benar!" : `Jawabannya ${currentLetter.cue}`}
                </Text>
                <Text
                  style={[
                    styles.feedbackCopy,
                    { color: colors.mutedForeground },
                  ]}
                >
                  {currentLetter.note}
                </Text>
              </Animated.View>
            ) : null}
          </>
        ) : null}

        {phase === "complete" ? (
          <View style={styles.heroIcon}>
            <GameIconTile iconKey="stroke-master" size={128} />
          </View>
        ) : null}
      </GamePage>

      {phase === "complete" ? (
        <GameResultSheet
          eyebrow="Hangeul"
          title={stage ? `${stage.title} selesai!` : "Dasar Hangeul lengkap!"}
          description={copy.done}
          mark={{ value: `${quizLength}/${quizLength}`, label: "dikenali" }}
          done
          celebrate={missedLetters.length === 0}
          facts={[
            {
              icon: "character.book.closed.fill",
              text: `${quizLength} huruf dikenali`,
            },
            ...(missedLetters.length
              ? [
                  {
                    icon: "arrow.clockwise" as const,
                    text: `${missedLetters.length} sempat keliru`,
                  },
                ]
              : []),
          ]}
          review={{
            title: "Sempat keliru",
            rows: missedLetters.map((letter) => ({
              key: letter.id,
              title: `${letter.character} · ${letter.cue}`,
              detail: letter.note,
            })),
          }}
          primary={{
            eyebrow: "Ulangi pelajaran",
            title: copy.title,
            meta: `${introStepCount} bagian, lalu cek ingatan`,
            pill: "Mulai",
            onPress: restart,
          }}
          secondary={{ label: leaveLabel, onPress: leave }}
        />
      ) : null}

      <HangeulCheatSheetModal
        groups={plan.sheetFamilies}
        onClose={() => setShowCheatSheet(false)}
        visible={phase === "quiz" && showCheatSheet}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stepContent: { gap: 20 },
  heroIcon: { alignSelf: "center", paddingVertical: 12 },
  centeredCopy: { alignItems: "center", gap: 8 },
  eyebrow: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.5,
    textAlign: "center",
  },
  heading: {
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 34,
    textAlign: "center",
  },
  body: { fontSize: 15, lineHeight: 22, textAlign: "center" },
  equationRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  equationTile: {
    alignItems: "center",
    borderRadius: 18,
    minWidth: 72,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  equationLetter: { fontSize: 38, fontWeight: "900" },
  equationLabel: { fontSize: 11, fontWeight: "700", marginTop: 2 },
  equationSign: { fontSize: 22, fontWeight: "800" },
  letterGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
  },
  letterTileShell: {
    position: "relative",
    width: "48%",
  },
  letterTile: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 136,
    overflow: "hidden",
    padding: 14,
  },
  letterTileHeader: {
    alignItems: "center",
    gap: 7,
  },
  letterIcon: {
    alignItems: "center",
    borderRadius: 999,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  letterCharacter: { fontSize: 34, fontWeight: "900", textAlign: "center" },
  letterKind: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    position: "absolute",
    right: 14,
    top: 14,
  },
  letterKindText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  letterCopy: { alignItems: "center", gap: 1, marginTop: 12 },
  letterCue: { fontSize: 15, fontWeight: "900", textAlign: "center" },
  letterNote: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 4,
    textAlign: "center",
  },
  familyHeading: { gap: 4 },
  familyEyebrow: { textAlign: "left" },
  familyHeadingText: { textAlign: "left" },
  familyBody: { textAlign: "left" },
  quizPrompt: { alignItems: "center", gap: 12, paddingVertical: 12 },
  quizInstruction: { fontSize: 14, fontWeight: "600", textAlign: "center" },
  quizLetter: { fontSize: 104, fontWeight: "900", lineHeight: 118 },
  optionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  option: { width: "48%" },
  optionSurface: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1.5,
    justifyContent: "center",
    minHeight: 62,
    padding: 12,
  },
  optionText: { fontSize: 16, fontWeight: "800", textAlign: "center" },
  feedback: { borderRadius: 18, borderWidth: 1, padding: 16 },
  feedbackTitle: { fontSize: 16, fontWeight: "900" },
  feedbackCopy: { fontSize: 13, lineHeight: 19, marginTop: 4 },
  cheatSheet: { gap: 10 },
  cheatSheetFamilySection: { gap: 8 },
  cheatSheetFamilyTitle: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  cheatSheetLetterGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
  },
  cheatSheetModalContent: { padding: 20, paddingBottom: 36 },
  cheatSheetModalBody: { gap: 18 },
  cheatSheetModalHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalHeading: {
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 30,
    marginTop: 4,
  },
  modalCloseButton: {
    alignItems: "center",
    borderRadius: 999,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
});
