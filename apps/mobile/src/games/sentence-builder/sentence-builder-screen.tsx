import { Stack } from "expo-router";
import { useCallback, useEffect, useReducer, useState } from "react";
import {
  AccessibilityInfo,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StudyAction } from "../../components/study-glass";
import type { VocabularyAttempt } from "../../lib/use-vocabulary-progress";
import { useAppTheme } from "../../providers/AppThemeProvider";
import { withOpacity } from "../../theme/colors";
import { GameJourneyFooter, GameModal, GameStartModal } from "../game-modals";
import { useGameExitGuard } from "../game-navigation";
import { GameBackToolbar } from "../game-screens";
import {
  createSentenceChallenges,
  initialSentenceBuilderSession,
  sentenceAttemptResult,
  sentenceBuilderReducer,
  sentenceHint,
  type SentenceSourceWord,
} from "./engine";

export function SentenceBuilderScreen({
  words,
  onExit,
  onComplete,
  onAttempt,
  onSessionStart,
  courseId,
  sourceCourseItemId,
}: {
  words: readonly SentenceSourceWord[];
  onExit: () => void;
  onComplete: () => unknown;
  onAttempt: (attempt: VocabularyAttempt) => Promise<void>;
  onSessionStart: () => void;
  courseId?: string;
  sourceCourseItemId?: string;
}) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [session, dispatch] = useReducer(
    sentenceBuilderReducer,
    initialSentenceBuilderSession,
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
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
    if (session.phase === "complete") void onComplete();
  }, [onComplete, session.phase]);

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

  const reviewChallenges = session.challenges.filter((item) =>
    session.reviewIds.includes(item.id),
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <GameBackToolbar disabled={saving} onPress={exit} />
      <Stack.Screen
        options={{
          headerBackButtonDisplayMode: "minimal",
          headerBackVisible: false,
          headerShown: true,
          gestureEnabled: false,
          title: "Susun makna",
        }}
      />
      <View
        accessibilityLabel="Kalimat selesai"
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: Math.max(1, total), now: completed }}
        style={[styles.progressTrack, { backgroundColor: colors.border }]}
      >
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: colors.primary,
              width: `${total ? (completed / total) * 100 : 0}%`,
            },
          ]}
        />
      </View>

      {challenge ? (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Math.max(28, insets.bottom + 20) },
          ]}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.lessonRow}>
            <Text
              style={[styles.smallLabel, { color: colors.mutedForeground }]}
            >
              Contoh kalimat
            </Text>
            <Text
              style={[styles.smallLabel, { color: colors.mutedForeground }]}
            >
              {session.index + 1}/{total}
            </Text>
          </View>

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
              {challenge.definition}
            </Text>
          </View>

          <View
            style={[
              styles.workspace,
              {
                backgroundColor: withOpacity(colors.primary, 0.06),
                borderColor:
                  session.feedback === "incorrect"
                    ? colors.destructive
                    : withOpacity(colors.primary, 0.18),
              },
            ]}
          >
            <Text style={[styles.sectionLabel, { color: colors.primary }]}>
              KALIMAT YANG KAMU SUSUN
            </Text>
            {correct ? (
              <Text
                accessibilityLiveRegion="polite"
                style={[styles.solvedSentence, { color: colors.foreground }]}
              >
                {challenge.sentence}
              </Text>
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
                      <View
                        key={index}
                        accessibilityLabel={`Posisi ${index + 1}, kosong`}
                        style={[
                          styles.emptySlot,
                          { borderColor: withOpacity(colors.primary, 0.3) },
                        ]}
                      />
                    );
                  return (
                    <Pressable
                      key={index}
                      accessibilityLabel={`Posisi ${index + 1}, ${word}. Ketuk untuk melepas.`}
                      accessibilityRole="button"
                      onPress={() =>
                        dispatch({ type: "remove", tileIndex: tileIndex! })
                      }
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
                    </Pressable>
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
          </View>

          {!correct ? (
            <View style={styles.traySection}>
              <View style={styles.trayHeading}>
                <Text
                  style={[
                    styles.sectionLabel,
                    { color: colors.mutedForeground },
                  ]}
                >
                  PILIH KATA
                </Text>
                {session.selected.length > 0 ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => dispatch({ type: "clear" })}
                  >
                    <Text
                      style={[styles.clearLabel, { color: colors.primary }]}
                    >
                      Hapus semua
                    </Text>
                  </Pressable>
                ) : null}
              </View>
              <View style={styles.tiles}>
                {challenge.tiles.map((word, index) => {
                  const selected = session.selected.includes(index);
                  const highlighted =
                    session.showHint && hint?.tileIndex === index;
                  return (
                    <Pressable
                      key={index}
                      accessibilityLabel={`Kata ${word}${highlighted ? ", petunjuk" : ""}`}
                      accessibilityRole="button"
                      accessibilityState={{ disabled: selected || isFull }}
                      disabled={selected || isFull}
                      onPress={() =>
                        dispatch({ type: "add", tileIndex: index })
                      }
                      style={({ pressed }) => [
                        styles.chip,
                        {
                          backgroundColor: selected
                            ? colors.muted
                            : pressed
                              ? withOpacity(colors.primary, 0.16)
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
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          <View style={styles.feedbackArea}>
            {session.feedback === "incorrect" ? (
              <Text
                accessibilityLiveRegion="polite"
                style={[styles.feedback, { color: colors.destructive }]}
              >
                Urutan belum tepat. Ketuk kata di atas untuk mengubahnya.
              </Text>
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

          {correct ? (
            saveError ? (
              <StudyAction disabled={saving} onPress={save}>
                Coba simpan lagi
              </StudyAction>
            ) : (
              <StudyAction
                disabled={!saved}
                onPress={() => dispatch({ type: "next" })}
              >
                {session.index === total - 1 ? "Lihat hasil" : "Lanjut"}
              </StudyAction>
            )
          ) : !session.showHint ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => dispatch({ type: "hint" })}
              style={styles.hintAction}
            >
              <Text style={[styles.hintLabel, { color: colors.primary }]}>
                Butuh petunjuk?
              </Text>
            </Pressable>
          ) : null}
        </ScrollView>
      ) : null}

      <GameStartModal
        gameKey="sentences"
        visible={session.phase === "intro"}
        title="Susun makna"
        detail="Susun kata-kata menjadi contoh kalimat dari kosakata yang kamu pelajari."
        content={
          <Text style={[styles.modalCopy, { color: colors.mutedForeground }]}>
            Tanpa batas waktu{"\n"}Ketuk kata untuk menyusun. Kamu bisa
            melepasnya atau meminta petunjuk kapan pun.
          </Text>
        }
        primaryLabel="Mulai menyusun"
        onPrimary={start}
        onSecondary={exit}
      />
      <GameModal
        gameKey="sentences"
        visible={session.phase === "complete"}
        eyebrow="LATIHAN SELESAI"
        title="Kalimat demi kalimat, bisa!"
        detail={`Kamu berhasil menyusun ${total} kalimat.`}
        content={
          <View style={styles.finishContent}>
            <View style={styles.result}>
              <Text style={[styles.resultNumber, { color: colors.primary }]}>
                {session.independent}/{total}
              </Text>
              <Text
                style={[styles.modalCopy, { color: colors.mutedForeground }]}
              >
                Tepat pada percobaan pertama tanpa petunjuk.
              </Text>
            </View>
            {reviewChallenges.length > 0 ? (
              <View style={[styles.review, { borderColor: colors.border }]}>
                <Text
                  style={[
                    styles.reviewTitle,
                    { color: colors.mutedForeground },
                  ]}
                >
                  Ulangi lagi
                </Text>
                {reviewChallenges.slice(0, 4).map((item) => (
                  <Text
                    key={item.id}
                    style={[
                      styles.reviewSentence,
                      { color: colors.foreground },
                    ]}
                  >
                    {item.sentence}
                  </Text>
                ))}
              </View>
            ) : null}
            <GameJourneyFooter
              courseId={courseId}
              courseItemId={sourceCourseItemId}
              scrollable={false}
            />
          </View>
        }
        primaryLabel="Main lagi"
        secondaryLabel="Kembali ke latihan"
        onPrimary={start}
        onSecondary={exit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  progressTrack: { height: 4, overflow: "hidden" },
  progressFill: { height: "100%" },
  content: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
    padding: 20,
    gap: 20,
  },
  lessonRow: { flexDirection: "row", justifyContent: "space-between" },
  smallLabel: { fontSize: 12, fontWeight: "600" },
  prompt: { alignItems: "center", gap: 5, paddingTop: 12 },
  eyebrow: { fontSize: 10, letterSpacing: 2, fontWeight: "800" },
  term: {
    fontSize: 34,
    lineHeight: 44,
    fontWeight: "800",
    textAlign: "center",
  },
  definition: { fontSize: 15, lineHeight: 22, textAlign: "center" },
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
  trayHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  clearLabel: { fontSize: 12, fontWeight: "700" },
  tiles: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
  },
  feedbackArea: { minHeight: 42, justifyContent: "center" },
  feedback: { fontSize: 13, lineHeight: 20, textAlign: "center" },
  hintAction: { alignItems: "center", paddingVertical: 8 },
  hintLabel: { fontSize: 14, fontWeight: "700" },
  modalCopy: { fontSize: 14, lineHeight: 22, textAlign: "center" },
  finishContent: { alignSelf: "stretch", gap: 16 },
  result: { alignItems: "center", gap: 10 },
  resultNumber: { fontSize: 46, fontWeight: "800" },
  review: {
    alignSelf: "stretch",
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 6,
    paddingTop: 12,
  },
  reviewTitle: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  reviewSentence: { fontSize: 14, fontWeight: "600" },
});
