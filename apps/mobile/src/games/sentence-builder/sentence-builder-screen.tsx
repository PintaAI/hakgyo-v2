import { Stack } from "expo-router";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  LinearTransition,
  ZoomIn,
  ZoomOut,
} from "react-native-reanimated";

import type { VocabularyAttempt } from "../../lib/use-vocabulary-progress";
import { useAppTheme } from "../../providers/AppThemeProvider";
import { withOpacity } from "../../theme/colors";
import { toolbarIcons } from "../../theme/toolbar-icons";
import { PressableScale, useOutcomeMotion } from "../game-motion";
import { useGameExitGuard } from "../game-navigation";
import { GameResultSheet } from "../game-result";
import {
  GameActionBar,
  GameRoundHeader,
  type GameBarAction,
} from "../game-round";
import type { GameLesson } from "../lesson";
import {
  createSentenceChallenges,
  initialSentenceBuilderSession,
  sentenceAttemptResult,
  sentenceBuilderReducer,
  sentenceHint,
  type SentenceSourceWord,
} from "./engine";
import { hapticError, hapticSelection, hapticSuccess } from "../../lib/haptics";

export function SentenceBuilderScreen({
  words,
  onExit,
  onComplete,
  onAttempt,
  onSessionStart,
  courseId,
  sourceCourseItemId,
  lesson,
}: {
  words: readonly SentenceSourceWord[];
  onExit: () => void;
  onComplete: () => unknown;
  onAttempt: (attempt: VocabularyAttempt) => Promise<void>;
  onSessionStart: () => void;
  courseId?: string;
  sourceCourseItemId?: string;
  /** Played as a round of a vocabulary lesson. */
  lesson?: GameLesson;
}) {
  const { colors } = useAppTheme();
  const [session, dispatch] = useReducer(
    sentenceBuilderReducer,
    initialSentenceBuilderSession,
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  // No example of these words fits the length limits: nothing to build.
  const total = session.challenges.length;
  const challenge = session.challenges[session.index];
  const correct = session.phase === "correct";
  const completed =
    session.index + (correct || session.phase === "complete" ? 1 : 0);
  const isFull =
    !!challenge && session.selected.length === challenge.words.length;
  const hint = challenge ? sentenceHint(challenge, session.selected) : null;
  const saved = !!challenge && savedId === challenge.id;

  const exit = useGameExitGuard({
    active: session.phase === "playing" || session.phase === "correct",
    locked: saving,
    onExit,
  });

  const start = useCallback(() => {
    const challenges = createSentenceChallenges(words);
    if (challenges.length === 0) return;
    setSaving(false);
    setSaveError(false);
    setSavedId(null);
    onSessionStart();
    dispatch({ type: "start", challenges });
  }, [onSessionStart, words]);

  const result = sentenceAttemptResult(session);
  const save = useCallback(() => {
    if (!challenge || saving) return;
    setSaving(true);
    setSaveError(false);
    void onAttempt({
      entryId: challenge.entryId,
      evidence: "APPLICATION",
      result,
    })
      .then(() => setSavedId(challenge.id))
      .catch(() => setSaveError(true))
      .finally(() => setSaving(false));
  }, [challenge, onAttempt, result, saving]);

  // Save once per solved sentence; a failed save waits for the retry button.
  useEffect(() => {
    if (correct && !saved && !saving && !saveError) save();
  }, [correct, save, saveError, saved, saving]);

  useEffect(() => {
    if (session.phase !== "complete") return;
    void onComplete();
    lesson?.onRoundComplete();
  }, [lesson, onComplete, session.phase]);

  // Starts at once: Latihan's source sheet (or the lesson) already showed
  // what the game is.
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    start();
  }, [start]);

  useEffect(() => {
    if (!challenge) return;
    if (correct)
      AccessibilityInfo.announceForAccessibility(
        `Tepat! ${challenge.sentence}`,
      );
    else if (session.feedback === "incorrect")
      AccessibilityInfo.announceForAccessibility(
        "Urutan belum tepat. Ketuk kata untuk mengubah jawaban.",
      );
  }, [challenge, correct, session.feedback]);

  // Once per outcome: only the outcome changes these. Each wrong order also
  // shakes the answer row.
  const [wrongCount, setWrongCount] = useState(0);
  useEffect(() => {
    if (correct) hapticSuccess();
    else if (session.feedback === "incorrect") {
      hapticError();
      setWrongCount((count) => count + 1);
    }
  }, [correct, session.feedback]);
  const answerMotion = useOutcomeMotion({ wrongCount, correct });

  const reviewChallenges = session.challenges.filter((item) =>
    session.reviewIds.includes(item.id),
  );

  const allCorrect = session.independent === total;

  // The round moves on from the bottom toolbar, as in Kartu: clearing while
  // building, then "Lanjut" once the solved sentence is saved.
  const barActions: GameBarAction[] = !challenge
    ? []
    : correct
      ? [
          saveError
            ? {
                label: "Coba simpan lagi",
                onPress: save,
                disabled: saving,
                prominent: true,
              }
            : {
                label: session.index === total - 1 ? "Lihat hasil" : "Lanjut",
                onPress: () => dispatch({ type: "next" }),
                disabled: !saved,
                prominent: true,
              },
        ]
      : [
          {
            label: "Hapus semua",
            onPress: () => dispatch({ type: "clear" }),
            disabled: session.selected.length === 0,
          },
        ];

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <GameRoundHeader
        title={lesson?.title}
        onBack={exit}
        backDisabled={saving}
        stats={[{ value: `${completed}/${total}` }]}
        statsLabel={`${completed} dari ${total} kalimat selesai`}
      >
        <Stack.Toolbar.Button
          accessibilityLabel="Petunjuk"
          disabled={!challenge || correct || session.showHint}
          icon={toolbarIcons.hint}
          onPress={() => dispatch({ type: "hint" })}
        />
      </GameRoundHeader>
      <GameActionBar actions={barActions} />

      {challenge ? (
        <ScrollView
          contentContainerStyle={styles.content}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.prompt}>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>
              SUSUN KALIMAT DENGAN
            </Text>
            <Text style={[styles.term, { color: colors.foreground }]}>
              {challenge.term}
            </Text>
            <Text
              style={[styles.definition, { color: colors.mutedForeground }]}
            >
              {challenge.meaning}
            </Text>
            {/* The meaning to build: the example's own translation. */}
            {challenge.translation ? (
              <Text
                accessibilityLabel={`Artinya: ${challenge.translation}`}
                style={[styles.translation, { color: colors.foreground }]}
              >
                “{challenge.translation}”
              </Text>
            ) : null}
          </View>

          <Animated.View
            style={[
              styles.workspace,
              answerMotion,
              {
                backgroundColor: correct
                  ? withOpacity(colors.primary, 0.12)
                  : withOpacity(colors.primary, 0.06),
                borderColor:
                  session.feedback === "incorrect"
                    ? colors.destructive
                    : correct
                      ? colors.primary
                      : withOpacity(colors.primary, 0.18),
              },
            ]}
          >
            <Text style={[styles.sectionLabel, { color: colors.primary }]}>
              KALIMAT YANG KAMU SUSUN
            </Text>
            {correct ? (
              <Animated.Text
                accessibilityLiveRegion="polite"
                entering={ZoomIn.springify().damping(14)}
                style={[styles.solvedSentence, { color: colors.foreground }]}
              >
                {challenge.sentence}
              </Animated.Text>
            ) : (
              <View style={styles.answerRow}>
                {challenge.words.map((_, index) => {
                  const tileIndex = session.selected[index];
                  const word =
                    tileIndex === undefined
                      ? undefined
                      : challenge.tiles[tileIndex];
                  if (!word)
                    return (
                      <Animated.View
                        key={`slot-${index}`}
                        accessibilityLabel={`Posisi ${index + 1}, kosong`}
                        layout={LinearTransition.springify().damping(18)}
                        style={[
                          styles.emptySlot,
                          { borderColor: withOpacity(colors.primary, 0.3) },
                        ]}
                      />
                    );
                  return (
                    <Animated.View
                      key={`tile-${tileIndex}`}
                      entering={ZoomIn.springify().damping(13)}
                      exiting={ZoomOut.duration(120)}
                      layout={LinearTransition.springify().damping(18)}
                    >
                      <PressableScale
                        accessibilityLabel={`Posisi ${index + 1}, ${word}. Ketuk untuk melepas.`}
                        accessibilityRole="button"
                        onPress={() => {
                          hapticSelection();
                          dispatch({ type: "remove", tileIndex: tileIndex! });
                        }}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: colors.primary,
                            borderColor: colors.primary,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            { color: colors.primaryForeground },
                          ]}
                        >
                          {word}
                        </Text>
                      </PressableScale>
                    </Animated.View>
                  );
                })}
              </View>
            )}
            {!correct ? (
              <Text
                style={[
                  styles.workspaceNote,
                  { color: colors.mutedForeground },
                ]}
              >
                Ketuk kata di atas untuk melepasnya.
              </Text>
            ) : null}
          </Animated.View>

          {!correct ? (
            <View style={styles.traySection}>
              <Text
                style={[styles.sectionLabel, { color: colors.mutedForeground }]}
              >
                PILIH KATA
              </Text>
              <View style={styles.tiles}>
                {challenge.tiles.map((word, index) => {
                  const selected = session.selected.includes(index);
                  const highlighted =
                    session.showHint && hint?.tileIndex === index;
                  return (
                    <PressableScale
                      key={index}
                      accessibilityLabel={`Kata ${word}${highlighted ? ", petunjuk" : ""}`}
                      accessibilityRole="button"
                      accessibilityState={{ disabled: selected || isFull }}
                      disabled={selected || isFull}
                      onPress={() => {
                        hapticSelection();
                        dispatch({ type: "add", tileIndex: index });
                      }}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: selected
                            ? colors.muted
                            : colors.card,
                          borderColor: highlighted
                            ? colors.primary
                            : colors.border,
                          borderWidth: highlighted ? 2 : 1,
                          opacity: selected ? 0.42 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[styles.chipText, { color: colors.foreground }]}
                      >
                        {word}
                      </Text>
                    </PressableScale>
                  );
                })}
              </View>
            </View>
          ) : null}

          <View style={styles.feedbackArea}>
            {session.feedback === "incorrect" ? (
              <Animated.Text
                accessibilityLiveRegion="polite"
                entering={FadeIn.duration(160)}
                style={[styles.feedback, { color: colors.destructive }]}
              >
                Urutan belum tepat. Ketuk kata di atas untuk mengubahnya.
              </Animated.Text>
            ) : correct ? (
              <Text
                accessibilityLiveRegion="polite"
                style={[
                  styles.feedback,
                  { color: saveError ? colors.destructive : colors.primary },
                ]}
              >
                {saveError
                  ? "Hasil belum tersimpan. Coba simpan lagi."
                  : saving
                    ? "Menyimpan hasil…"
                    : `Tepat! Kalimat ini memakai ${challenge.term}.`}
              </Text>
            ) : !session.showHint ? (
              <Text
                style={[styles.feedback, { color: colors.mutedForeground }]}
              >
                Susun {challenge.words.length} kata. Hasil muncul otomatis.
              </Text>
            ) : null}
            {session.showHint && !correct && hint ? (
              <Text
                accessibilityLiveRegion="polite"
                style={[styles.feedback, { color: colors.foreground }]}
              >
                {hint.tileIndex >= 0
                  ? `Petunjuk: kata ke-${hint.position + 1} adalah ${hint.word}.`
                  : `Petunjuk: lepaskan kata di posisi ${hint.position + 1}, lalu cari ${hint.word}.`}
              </Text>
            ) : null}
          </View>
        </ScrollView>
      ) : null}
      {session.phase === "complete" && !lesson ? (
        <GameResultSheet
          courseId={courseId}
          courseItemId={sourceCourseItemId}
          eyebrow="Susun makna"
          title={
            allCorrect ? "Mantap, semua tepat!" : "Kalimat demi kalimat, bisa!"
          }
          description="Tepat pada percobaan pertama tanpa petunjuk."
          mark={{ value: `${session.independent}/${total}`, label: "tepat" }}
          done={allCorrect}
          celebrate={allCorrect}
          facts={[
            { icon: "text.word.spacing", text: `${total} kalimat disusun` },
            ...(reviewChallenges.length
              ? [
                  {
                    icon: "arrow.clockwise" as const,
                    text: `${reviewChallenges.length} perlu diulang`,
                  },
                ]
              : []),
          ]}
          review={{
            title: "Perlu diulang",
            rows: reviewChallenges.map((item) => ({
              key: item.id,
              title: item.sentence,
              detail: item.translation ?? undefined,
            })),
          }}
          primary={{
            eyebrow: "Main lagi",
            title: `${total} kalimat`,
            meta: "Ronde baru dengan contoh kalimat acak",
            pill: "Mulai",
            onPress: start,
          }}
          secondary={{ label: "Selesai", onPress: exit }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
    padding: 20,
    gap: 20,
  },
  prompt: { alignItems: "center", gap: 5, paddingTop: 12 },
  eyebrow: { fontSize: 10, letterSpacing: 2, fontWeight: "800" },
  term: {
    fontSize: 34,
    lineHeight: 44,
    fontWeight: "800",
    textAlign: "center",
  },
  definition: { fontSize: 15, lineHeight: 22, textAlign: "center" },
  translation: {
    fontSize: 17,
    fontWeight: "600",
    lineHeight: 24,
    marginTop: 6,
    textAlign: "center",
  },
  workspace: {
    borderWidth: 1,
    borderRadius: 24,
    minHeight: 165,
    padding: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  sectionLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 1.5 },
  answerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  emptySlot: {
    width: 56,
    height: 46,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
  },
  chip: {
    minHeight: 46,
    minWidth: 46,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: { fontSize: 20, lineHeight: 28, fontWeight: "700" },
  solvedSentence: {
    fontSize: 24,
    lineHeight: 34,
    fontWeight: "700",
    textAlign: "center",
  },
  workspaceNote: { fontSize: 12, textAlign: "center" },
  traySection: { gap: 12 },
  tiles: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
  },
  feedbackArea: { minHeight: 42, justifyContent: "center" },
  feedback: { fontSize: 13, lineHeight: 20, textAlign: "center" },
});
