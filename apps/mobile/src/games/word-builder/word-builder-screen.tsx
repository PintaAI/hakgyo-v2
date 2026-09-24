import { router, Stack, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useReducer, useState } from "react";
import {
  AccessibilityInfo,
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StudyAction } from "../../components/study-glass";
import { useAppTheme } from "../../providers/AppThemeProvider";
import { withOpacity } from "../../theme/colors";
import { GameModal, GameStartModal } from "../game-modals";
import { GameBackToolbar } from "../game-screens";
import { WORD_CHALLENGES } from "./word-builder-data";
import {
  initialWordBuilderSession,
  wordBuilderReducer,
} from "./word-builder-session";

const leave = () => router.dismissTo("/(home)/(tabs)/assessments");

export function WordBuilderScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [session, dispatch] = useReducer(
    wordBuilderReducer,
    initialWordBuilderSession,
  );
  const [showExit, setShowExit] = useState(false);
  const challenge = WORD_CHALLENGES[session.index]!;
  const correct = session.phase === "correct";
  const completed =
    session.index + (correct || session.phase === "complete" ? 1 : 0);
  const answer = session.selected.map((index) => challenge.tiles[index]);
  const isFull = session.selected.length === challenge.syllables.length;
  const hintPosition = challenge.syllables.findIndex(
    (syllable, index) => answer[index] !== syllable,
  );
  const hintSyllable = challenge.syllables[hintPosition];
  const hintTileIndex = challenge.tiles.findIndex(
    (syllable, index) =>
      syllable === hintSyllable && !session.selected.includes(index),
  );

  const requestLeave = useCallback(() => {
    if (session.phase === "intro" || session.phase === "complete") leave();
    else setShowExit(true);
  }, [session.phase]);

  useFocusEffect(
    useCallback(() => {
      const listener = BackHandler.addEventListener("hardwareBackPress", () => {
        requestLeave();
        return true;
      });
      return () => listener.remove();
    }, [requestLeave]),
  );

  useEffect(() => {
    if (correct)
      AccessibilityInfo.announceForAccessibility(
        `Tepat! ${challenge.word}, ${challenge.meaning}.`,
      );
    else if (session.feedback === "incorrect")
      AccessibilityInfo.announceForAccessibility(
        "Urutan belum tepat. Ketuk blok untuk mengubah jawaban.",
      );
  }, [challenge.meaning, challenge.word, correct, session.feedback]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <GameBackToolbar onPress={requestLeave} />
      <Stack.Screen
        options={{
          headerBackButtonDisplayMode: "minimal",
          headerBackVisible: false,
          headerShown: true,
          gestureEnabled: false,
          title: "Susun kata",
        }}
      />
      <View
        accessibilityLabel="Kata selesai"
        accessibilityRole="progressbar"
        accessibilityValue={{
          min: 0,
          max: WORD_CHALLENGES.length,
          now: completed,
        }}
        style={[styles.progressTrack, { backgroundColor: colors.border }]}
      >
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: colors.primary,
              width: `${(completed / WORD_CHALLENGES.length) * 100}%`,
            },
          ]}
        />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(28, insets.bottom + 20) },
        ]}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.lessonRow}>
          <Text style={[styles.smallLabel, { color: colors.mutedForeground }]}>
            {challenge.family}
          </Text>
          <Text style={[styles.smallLabel, { color: colors.mutedForeground }]}>
            {session.index + 1}/{WORD_CHALLENGES.length}
          </Text>
        </View>

        <View style={styles.prompt}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>
            SUSUN KATA KOREA
          </Text>
          <Text style={[styles.meaning, { color: colors.foreground }]}>
            {challenge.meaning}
          </Text>
          <Text
            style={[styles.instructions, { color: colors.mutedForeground }]}
          >
            Ketuk blok suku kata sesuai urutan.
          </Text>
        </View>

        <View
          style={[
            styles.workspace,
            {
              backgroundColor: withOpacity(colors.primary, 0.06),
              borderColor: withOpacity(colors.primary, 0.18),
            },
          ]}
        >
          <Text style={[styles.sectionLabel, { color: colors.primary }]}>
            KATA YANG KAMU SUSUN
          </Text>
          <View style={styles.answerRow}>
            {challenge.syllables.map((_, index) => {
              const tileIndex = session.selected[index];
              const syllable =
                tileIndex === undefined
                  ? undefined
                  : challenge.tiles[tileIndex];
              return (
                <Pressable
                  key={index}
                  accessibilityLabel={
                    syllable
                      ? `Posisi ${index + 1}, ${syllable}. Ketuk untuk melepas.`
                      : `Posisi ${index + 1}, kosong`
                  }
                  accessibilityRole="button"
                  disabled={tileIndex === undefined || correct}
                  onPress={() =>
                    tileIndex !== undefined &&
                    dispatch({ type: "remove", tileIndex })
                  }
                  style={[
                    styles.answerSlot,
                    {
                      backgroundColor: syllable ? colors.primary : colors.card,
                      borderColor: syllable ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.answerText,
                      {
                        color: syllable
                          ? colors.primaryForeground
                          : colors.mutedForeground,
                      },
                    ]}
                  >
                    {syllable ?? "·"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {correct ? (
            <Text style={[styles.pronunciation, { color: colors.primary }]}>
              {challenge.word} · {challenge.pronunciation}
            </Text>
          ) : (
            <Text
              style={[styles.workspaceNote, { color: colors.mutedForeground }]}
            >
              Ketuk blok di atas untuk melepasnya.
            </Text>
          )}
        </View>

        <View style={styles.traySection}>
          <View style={styles.trayHeading}>
            <Text
              style={[styles.sectionLabel, { color: colors.mutedForeground }]}
            >
              PILIH BLOK
            </Text>
            {session.selected.length > 0 && !correct ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => dispatch({ type: "clear" })}
              >
                <Text style={[styles.clearLabel, { color: colors.primary }]}>
                  Hapus semua
                </Text>
              </Pressable>
            ) : null}
          </View>
          <View style={styles.tiles}>
            {challenge.tiles.map((syllable, index) => {
              const selected = session.selected.includes(index);
              const highlighted =
                session.showHint && hintTileIndex === index && !correct;
              return (
                <Pressable
                  key={index}
                  accessibilityLabel={`Blok ${syllable}${highlighted ? ", petunjuk" : ""}`}
                  accessibilityRole="button"
                  accessibilityState={{
                    disabled: selected || correct || isFull,
                  }}
                  disabled={selected || correct || isFull}
                  onPress={() => dispatch({ type: "add", tileIndex: index })}
                  style={({ pressed }) => [
                    styles.tile,
                    {
                      backgroundColor: selected
                        ? colors.muted
                        : pressed
                          ? withOpacity(colors.primary, 0.16)
                          : colors.card,
                      borderColor: highlighted ? colors.primary : colors.border,
                      opacity: selected ? 0.42 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.tileText, { color: colors.foreground }]}>
                    {syllable}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.feedbackArea}>
          {session.feedback === "incorrect" ? (
            <Text
              accessibilityLiveRegion="polite"
              style={[styles.feedback, { color: colors.destructive }]}
            >
              Urutan belum tepat. Ketuk blok di atas untuk mengubahnya.
            </Text>
          ) : correct ? (
            <Text
              accessibilityLiveRegion="polite"
              style={[styles.feedback, { color: colors.primary }]}
            >
              Tepat! {challenge.word} berarti {challenge.meaning}.
            </Text>
          ) : !session.showHint ? (
            <Text style={[styles.feedback, { color: colors.mutedForeground }]}>
              Susun {challenge.syllables.length} blok. Hasil muncul otomatis.
            </Text>
          ) : null}
          {session.showHint && !correct ? (
            <Text
              accessibilityLiveRegion="polite"
              style={[styles.feedback, { color: colors.foreground }]}
            >
              {hintTileIndex >= 0
                ? `Petunjuk: blok ke-${hintPosition + 1} adalah ${hintSyllable}.`
                : `Petunjuk: lepaskan blok di posisi ${hintPosition + 1}, lalu cari ${hintSyllable}.`}
            </Text>
          ) : null}
        </View>

        {correct ? (
          <StudyAction onPress={() => dispatch({ type: "next" })}>
            {session.index === WORD_CHALLENGES.length - 1
              ? "Lihat hasil"
              : "Lanjut"}
          </StudyAction>
        ) : !session.showHint ? (
          <Pressable
            accessibilityRole="button"
            disabled={session.phase !== "playing"}
            onPress={() => dispatch({ type: "hint" })}
            style={styles.hintAction}
          >
            <Text style={[styles.hintLabel, { color: colors.primary }]}>
              Butuh petunjuk?
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <GameStartModal
        gameKey="word-builder"
        visible={session.phase === "intro"}
        title="Susun kata"
        detail="Rangkai blok suku kata Hangeul menjadi kata yang sesuai dengan artinya. Mulai dari dua blok, lalu coba tiga blok."
        content={
          <Text style={[styles.modalCopy, { color: colors.mutedForeground }]}>
            {WORD_CHALLENGES.length} kata · Tanpa batas waktu{"\n"}Ketuk blok
            untuk menyusun. Kamu bisa melepasnya atau meminta petunjuk kapan
            pun.
          </Text>
        }
        primaryLabel="Mulai menyusun"
        onPrimary={() => dispatch({ type: "start" })}
        onSecondary={leave}
      />
      <GameModal
        gameKey="word-builder"
        visible={session.phase === "complete"}
        eyebrow="LATIHAN SELESAI"
        title="Kata demi kata, bisa!"
        detail={`Kamu berhasil menyusun ${WORD_CHALLENGES.length} kata Hangeul.`}
        content={
          <View style={styles.result}>
            <Text style={[styles.resultNumber, { color: colors.primary }]}>
              {session.independent}/{WORD_CHALLENGES.length}
            </Text>
            <Text style={[styles.modalCopy, { color: colors.mutedForeground }]}>
              Tepat pada percobaan pertama tanpa petunjuk.
            </Text>
          </View>
        }
        primaryLabel="Main lagi"
        secondaryLabel="Kembali ke latihan"
        onPrimary={() => dispatch({ type: "start" })}
        onSecondary={leave}
      />
      <GameModal
        gameKey="word-builder"
        visible={showExit}
        eyebrow="JEDA SEBENTAR"
        title="Keluar dari latihan?"
        detail="Progres sesi ini belum disimpan. Kamu bisa melanjutkan atau mulai lagi nanti."
        primaryLabel="Lanjut bermain"
        secondaryLabel="Keluar"
        onPrimary={() => setShowExit(false)}
        onSecondary={leave}
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
  meaning: {
    fontSize: 38,
    lineHeight: 48,
    fontWeight: "800",
    textAlign: "center",
  },
  instructions: { fontSize: 14, lineHeight: 21, textAlign: "center" },
  workspace: {
    borderWidth: 1,
    borderRadius: 24,
    minHeight: 185,
    padding: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  sectionLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 1.5 },
  answerRow: { flexDirection: "row", justifyContent: "center", gap: 10 },
  answerSlot: {
    width: 68,
    height: 70,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  answerText: { fontSize: 34, lineHeight: 42, fontWeight: "700" },
  pronunciation: { fontSize: 16, fontWeight: "700" },
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
  tile: {
    width: 62,
    height: 64,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tileText: { fontSize: 30, lineHeight: 38, fontWeight: "700" },
  feedbackArea: { minHeight: 42, justifyContent: "center" },
  feedback: { fontSize: 13, lineHeight: 20, textAlign: "center" },
  hintAction: { alignItems: "center", paddingVertical: 8 },
  hintLabel: { fontSize: 14, fontWeight: "700" },
  modalCopy: { fontSize: 14, lineHeight: 22, textAlign: "center" },
  result: { alignItems: "center", gap: 10 },
  resultNumber: { fontSize: 46, fontWeight: "800" },
});
