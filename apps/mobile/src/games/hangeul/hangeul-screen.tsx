import { router, Stack } from "expo-router";
import { Asset } from "expo-asset";
import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { GlassBox } from "../../components/GlassBox";
import { StudyAction } from "../../components/study-glass";
import { useAppTheme } from "../../providers/AppThemeProvider";
import { withOpacity } from "../../theme/colors";
import { GameStartModal } from "../game-modals";
import { GameBackToolbar, GamePage } from "../game-screens";
import {
  getHangeulLetter,
  getQuizOptions,
  HANGEUL_FAMILIES,
  HANGEUL_LETTERS,
  type HangeulLetter,
} from "./hangeul-data";

const introImage = require("../../../assets/games/hangeul-intro.png");
const introImageAsset = Asset.fromModule(introImage);
void introImageAsset.downloadAsync().catch(() => undefined);
const INTRO_STEP_COUNT = HANGEUL_FAMILIES.length + 1;
const VOWEL_COUNT = HANGEUL_LETTERS.filter(
  (letter) => letter.kind === "vowel",
).length;
const CONSONANT_COUNT = HANGEUL_LETTERS.length - VOWEL_COUNT;

type Phase = "intro" | "learn" | "quiz" | "complete";

function ProgressBar({ progress }: { progress: number }) {
  const { colors } = useAppTheme();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
      style={[styles.progressTrack, { backgroundColor: colors.muted }]}
    >
      <View
        style={[
          styles.progressFill,
          {
            backgroundColor: colors.primary,
            width: `${Math.max(4, progress * 100)}%`,
          },
        ]}
      />
    </View>
  );
}

function LetterTile({ letter }: { letter: HangeulLetter }) {
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
    <View style={styles.letterTileShell}>
      <GlassBox
        isInteractive={false}
        glassEffectStyle="clear"
        style={styles.letterTile}
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
      </GlassBox>
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
    </View>
  );
}

function OverviewStep() {
  const { colors } = useAppTheme();
  return (
    <View style={styles.stepContent}>
      <Image
        cachePolicy="memory-disk"
        contentFit="contain"
        priority="high"
        source={introImage}
        style={styles.heroImage}
        transition={0}
      />
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
        <View style={[styles.equationTile, { backgroundColor: colors.muted }]}>
          <Text style={[styles.equationLetter, { color: colors.foreground }]}>
            ㅇ
          </Text>
          <Text
            style={[styles.equationLabel, { color: colors.mutedForeground }]}
          >
            diam
          </Text>
        </View>
        <Text style={[styles.equationSign, { color: colors.mutedForeground }]}>
          +
        </Text>
        <View style={[styles.equationTile, { backgroundColor: colors.muted }]}>
          <Text style={[styles.equationLetter, { color: colors.foreground }]}>
            ㅏ
          </Text>
          <Text
            style={[styles.equationLabel, { color: colors.mutedForeground }]}
          >
            a
          </Text>
        </View>
        <Text style={[styles.equationSign, { color: colors.mutedForeground }]}>
          =
        </Text>
        <View
          style={[styles.equationTile, { backgroundColor: colors.primary }]}
        >
          <Text
            style={[styles.equationLetter, { color: colors.primaryForeground }]}
          >
            아
          </Text>
          <Text
            style={[styles.equationLabel, { color: colors.primaryForeground }]}
          >
            a
          </Text>
        </View>
      </View>
    </View>
  );
}

function FamilyStep({ index }: { index: number }) {
  const { colors } = useAppTheme();
  const family = HANGEUL_FAMILIES[index]!;
  const letters = family.letterIds
    .map(getHangeulLetter)
    .filter((letter): letter is HangeulLetter => Boolean(letter));

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
        {letters.map((letter) => (
          <LetterTile key={letter.id} letter={letter} />
        ))}
      </View>
    </View>
  );
}

function CheatSheet() {
  const { colors } = useAppTheme();
  return (
    <View style={styles.cheatSheet}>
      {HANGEUL_FAMILIES.map((family) => {
        const letters = family.letterIds
          .map(getHangeulLetter)
          .filter((letter): letter is HangeulLetter => Boolean(letter));
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
  visible,
  onClose,
}: {
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
            <GlassBox
              isInteractive
              glassEffectStyle="clear"
              tintColor={withOpacity(colors.mutedForeground, 0.12)}
              style={styles.modalCloseGlass}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Tutup cheat sheet"
                onPress={onClose}
                style={styles.modalCloseButton}
              >
                <SymbolView
                  fallback={
                    <Text
                      style={[
                        styles.modalCloseFallback,
                        { color: colors.foreground },
                      ]}
                    >
                      ×
                    </Text>
                  }
                  name="xmark"
                  size={16}
                  tintColor={colors.foreground}
                  weight="bold"
                />
              </Pressable>
            </GlassBox>
          </View>
          <CheatSheet />
          <StudyAction accessibilityLabel="Kembali ke kuis" onPress={onClose}>
            Kembali ke kuis
          </StudyAction>
        </View>
      </ScrollView>
    </Modal>
  );
}

function HangeulCheatSheetTrigger({ onPress }: { onPress: () => void }) {
  const { colorScheme, colors } = useAppTheme();
  const trigger = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Buka cheat sheet Hangeul"
      onPress={onPress}
      style={styles.toolbarTrigger}
    >
      <Text
        style={[styles.toolbarTriggerText, { color: colors.primaryForeground }]}
      >
        Cheat sheet
      </Text>
    </Pressable>
  );
  return (
    <View style={styles.toolbarTriggerContainer}>
      <GlassBox
        isInteractive
        tintColor={withOpacity(
          colors.primary,
          colorScheme === "dark" ? 1 : 0.72,
        )}
        glassEffectStyle="clear"
        style={styles.toolbarGlass}
      >
        {trigger}
      </GlassBox>
    </View>
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
  const borderColor = revealed
    ? correct
      ? colors.primary
      : selected
        ? colors.destructive
        : colors.border
    : selected
      ? colors.primary
      : colors.border;
  const tintColor =
    revealed && correct
      ? withOpacity(colors.primary, colorScheme === "dark" ? 0.35 : 0.18)
      : revealed && selected
        ? withOpacity(colors.destructive, colorScheme === "dark" ? 0.28 : 0.14)
        : withOpacity(
            colors.primary,
            selected ? (colorScheme === "dark" ? 0.35 : 0.18) : 0.06,
          );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      disabled={revealed}
      onPress={onPress}
      style={styles.option}
    >
      <GlassBox
        isInteractive
        glassEffectStyle="clear"
        tintColor={tintColor}
        style={[styles.optionGlass, { borderColor }]}
      >
        <Text style={[styles.optionText, { color: colors.foreground }]}>
          {cue}
        </Text>
      </GlassBox>
    </Pressable>
  );
}

export function HangeulScreen() {
  const { colors } = useAppTheme();
  const [phase, setPhase] = useState<Phase>("intro");
  const [lessonIndex, setLessonIndex] = useState(0);
  const [quizQueue, setQuizQueue] = useState(() =>
    HANGEUL_LETTERS.map((letter) => letter.id),
  );
  const [masteredIds, setMasteredIds] = useState<Set<string>>(() => new Set());
  const [selectedCue, setSelectedCue] = useState<string>();
  const [quizRound, setQuizRound] = useState(0);
  const [showCheatSheet, setShowCheatSheet] = useState(false);

  const leave = () => router.dismissTo("/(home)/(tabs)/assessments");
  const currentLetter =
    getHangeulLetter(quizQueue[0] ?? "") ?? HANGEUL_LETTERS[0]!;
  const options = useMemo(
    () => getQuizOptions(currentLetter, quizRound),
    [currentLetter, quizRound],
  );
  const answerCorrect = selectedCue === currentLetter.cue;

  const startQuiz = () => {
    setQuizQueue(HANGEUL_LETTERS.map((letter) => letter.id));
    setMasteredIds(new Set());
    setSelectedCue(undefined);
    setQuizRound(0);
    setShowCheatSheet(false);
    setPhase("quiz");
  };

  const continueLearning = () => {
    if (lessonIndex + 1 < INTRO_STEP_COUNT) {
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

  const restart = () => {
    setLessonIndex(0);
    setPhase("learn");
  };

  return (
    <View className="flex-1 bg-background">
      <GameBackToolbar onPress={leave} />
      {phase === "quiz" ? (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.View hidesSharedBackground>
            <HangeulCheatSheetTrigger onPress={() => setShowCheatSheet(true)} />
          </Stack.Toolbar.View>
        </Stack.Toolbar>
      ) : null}
      <Stack.Screen
        options={{
          headerBackButtonDisplayMode: "minimal",
          headerBackVisible: false,
          headerShown: true,
          title: "Hangeul",
        }}
      />
      <GamePage>
        {phase === "intro" ? (
          <View style={styles.stepContent}>
            <Image
              cachePolicy="memory-disk"
              contentFit="contain"
              priority="high"
              source={introImage}
              style={styles.heroImageLarge}
              transition={0}
            />
            <View style={styles.centeredCopy}>
              <Text style={[styles.eyebrow, { color: colors.primary }]}>
                한글
              </Text>
              <Text style={[styles.heading, { color: colors.foreground }]}>
                Kenalan dengan Hangeul
              </Text>
              <Text style={[styles.body, { color: colors.mutedForeground }]}>
                Pelajari {VOWEL_COUNT} vokal dan {CONSONANT_COUNT} konsonan,
                termasuk bentuk dasar dan ganda, lewat keluarga yang mudah
                diingat.
              </Text>
            </View>
          </View>
        ) : null}

        {phase === "learn" ? (
          <>
            <ProgressBar progress={(lessonIndex + 1) / INTRO_STEP_COUNT} />
            <View style={styles.progressHeader}>
              <Text
                style={[
                  styles.progressLabel,
                  { color: colors.mutedForeground },
                ]}
              >
                Belajar
              </Text>
              <Text
                style={[
                  styles.progressLabel,
                  { color: colors.mutedForeground },
                ]}
              >
                {lessonIndex + 1}/{INTRO_STEP_COUNT}
              </Text>
            </View>
            {lessonIndex === 0 ? (
              <OverviewStep />
            ) : (
              <FamilyStep index={lessonIndex - 1} />
            )}
            <View
              style={[
                styles.lessonActions,
                lessonIndex === 0 && styles.lessonActionsSingle,
              ]}
            >
              {lessonIndex > 0 ? (
                <View style={styles.lessonAction}>
                  <StudyAction
                    accessibilityLabel="Bagian sebelumnya"
                    onPress={goToPreviousLesson}
                    secondary
                  >
                    Sebelumnya
                  </StudyAction>
                </View>
              ) : null}
              <View
                style={
                  lessonIndex === 0
                    ? styles.lessonActionSingle
                    : styles.lessonAction
                }
              >
                <StudyAction
                  accessibilityLabel={
                    lessonIndex + 1 === INTRO_STEP_COUNT
                      ? "Mulai cek ingatan"
                      : "Bagian selanjutnya"
                  }
                  onPress={continueLearning}
                >
                  {lessonIndex + 1 === INTRO_STEP_COUNT
                    ? "Mulai cek ingatan"
                    : "Lanjut"}
                </StudyAction>
              </View>
            </View>
          </>
        ) : null}

        {phase === "quiz" ? (
          <>
            <ProgressBar progress={masteredIds.size / HANGEUL_LETTERS.length} />
            <View style={styles.progressHeader}>
              <Text
                style={[
                  styles.progressLabel,
                  { color: colors.mutedForeground },
                ]}
              >
                Cek ingatan
              </Text>
              <Text
                style={[
                  styles.progressLabel,
                  { color: colors.mutedForeground },
                ]}
              >
                {masteredIds.size}/{HANGEUL_LETTERS.length}
              </Text>
            </View>
            <View style={styles.quizPrompt}>
              <Text
                style={[
                  styles.quizInstruction,
                  { color: colors.mutedForeground },
                ]}
              >
                Pilih bunyi bantu yang paling cocok
              </Text>
              <Text style={[styles.quizLetter, { color: colors.foreground }]}>
                {currentLetter.character}
              </Text>
            </View>
            <View style={styles.optionGrid}>
              {options.map((cue) => (
                <QuizOption
                  key={cue}
                  correct={cue === currentLetter.cue}
                  cue={cue}
                  onPress={() => setSelectedCue(cue)}
                  revealed={Boolean(selectedCue)}
                  selected={selectedCue === cue}
                />
              ))}
            </View>
            {selectedCue ? (
              <View
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
              </View>
            ) : null}
            <StudyAction
              accessibilityLabel={selectedCue ? "Lanjut kuis" : "Pilih jawaban"}
              disabled={!selectedCue}
              onPress={continueQuiz}
            >
              {selectedCue ? "Lanjut" : "Pilih jawaban"}
            </StudyAction>
          </>
        ) : null}

        {phase === "complete" ? (
          <View style={styles.stepContent}>
            <Image
              cachePolicy="memory-disk"
              contentFit="contain"
              priority="high"
              source={introImage}
              style={styles.heroImage}
              transition={0}
            />
            <View style={styles.centeredCopy}>
              <Text style={[styles.eyebrow, { color: colors.primary }]}>
                {HANGEUL_LETTERS.length}/{HANGEUL_LETTERS.length} DIKENALI
              </Text>
              <Text style={[styles.heading, { color: colors.foreground }]}>
                Dasar Hangeul lengkap!
              </Text>
              <Text style={[styles.body, { color: colors.mutedForeground }]}>
                Kamu sudah mengenali semua vokal dan konsonan dasar maupun ganda
                pada sesi ini. Ulangi lagi untuk memperkuat ingatan.
              </Text>
            </View>
            <StudyAction
              accessibilityLabel="Ulangi pelajaran"
              onPress={restart}
            >
              Ulangi pelajaran
            </StudyAction>
            <StudyAction
              accessibilityLabel="Kembali ke latihan"
              onPress={leave}
              secondary
            >
              Kembali ke latihan
            </StudyAction>
          </View>
        ) : null}
      </GamePage>

      <HangeulCheatSheetModal
        onClose={() => setShowCheatSheet(false)}
        visible={phase === "quiz" && showCheatSheet}
      />

      <GameStartModal
        detail={`Kenali keluarga bentuk, bunyi bantu Indonesia, dan ${HANGEUL_LETTERS.length} huruf Hangeul dasar maupun ganda. Huruf yang salah akan muncul lagi sampai kamu bisa.`}
        gameKey="stroke-master"
        onPrimary={() => setPhase("learn")}
        onSecondary={leave}
        primaryLabel="Mulai belajar"
        secondaryLabel="Kembali"
        title="Kenalan dengan Hangeul"
        visible={phase === "intro"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressLabel: { fontSize: 12, fontWeight: "700" },
  progressTrack: {
    borderRadius: 999,
    height: 8,
    marginBottom: -16,
    marginTop: -20,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 999 },
  stepContent: { gap: 20 },
  lessonActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  lessonAction: { alignItems: "stretch", width: "49%" },
  lessonActionsSingle: { flexDirection: "column" },
  lessonActionSingle: { alignItems: "stretch", width: "100%" },
  heroImage: { alignSelf: "center", height: 190, width: "78%" },
  heroImageLarge: { alignSelf: "center", height: 280, width: "100%" },
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
  optionGlass: {
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
  cheatSheetLetterCard: {
    alignItems: "center",
    borderRadius: 16,
    minHeight: 112,
    padding: 12,
    width: "48%",
  },
  cheatSheetLetter: { fontSize: 32, fontWeight: "900", textAlign: "center" },
  cheatSheetLetters: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 20,
    textAlign: "center",
  },
  cheatSheetNote: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 3,
    textAlign: "center",
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
  modalCloseGlass: {
    alignItems: "center",
    borderRadius: 999,
    height: 40,
    justifyContent: "center",
    overflow: "hidden",
    width: 40,
  },
  modalCloseButton: {
    alignItems: "center",
    height: "100%",
    justifyContent: "center",
    width: "100%",
  },
  modalCloseFallback: { fontSize: 22, fontWeight: "700", lineHeight: 24 },
  toolbarTrigger: {
    alignItems: "center",
    borderRadius: 999,
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  toolbarTriggerText: { fontSize: 12, fontWeight: "800" },
  toolbarTriggerContainer: { alignItems: "flex-end" },
  toolbarGlass: { borderRadius: 9999, maxWidth: 176 },
});
