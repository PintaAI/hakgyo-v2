import type { HangeulGameStage } from "@hakgyo/shared/hangeul";
import { Stack } from "expo-router";
import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import {
  AccessibilityInfo,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";

import { useAppTheme } from "../../providers/AppThemeProvider";
import { withOpacity } from "../../theme/colors";
import { toolbarIcons } from "../../theme/toolbar-icons";
import { gameLeaveLabel, type GameSource } from "../game-exit";
import { PressableScale, useOutcomeMotion } from "../game-motion";
import { leaveGame, useGameExitGuard } from "../game-navigation";
import { GameResultSheet } from "../game-result";
import {
  GameActionBar,
  GameRoundHeader,
  type GameBarAction,
} from "../game-round";
import { getWordChallenges } from "./word-builder-data";
import {
  createWordBuilderReducer,
  initialWordBuilderSession,
} from "./word-builder-session";
import { hapticError, hapticSelection, hapticSuccess } from "../../lib/haptics";

/** How long a right answer stays before the next word. */
const AUTO_NEXT_MS = 1500;

export function WordBuilderScreen({
  source,
  stage,
}: {
  source?: GameSource;
  stage?: HangeulGameStage;
}) {
  const { colors } = useAppTheme();
  const words = getWordChallenges(stage?.id);
  const reducer = useMemo(() => createWordBuilderReducer(words), [words]);
  // Starts at once: the tile in Latihan (or the lesson) already said what
  // the game is.
  const [session, dispatch] = useReducer(
    reducer,
    initialWordBuilderSession,
    (initial) => ({ ...initial, phase: "playing" as const }),
  );
  const leave = useCallback(() => leaveGame(source), [source]);
  const leaveLabel = gameLeaveLabel(source);
  const challenge = words[session.index]!;
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

  // Nothing is saved, so leaving needs no confirmation; the guard sends
  // every back action (button, swipe, Android back) to the right place.
  const exit = useGameExitGuard({
    active: session.phase !== "complete",
    locked: false,
    onExit: leave,
  });

  // A right answer moves on by itself after a moment to read its meaning;
  // "Lanjut" skips the wait.
  useEffect(() => {
    if (session.phase !== "correct") return;
    const timer = setTimeout(() => dispatch({ type: "next" }), AUTO_NEXT_MS);
    return () => clearTimeout(timer);
  }, [session.phase, session.index]);

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

  // Once per outcome: only the outcome changes these.
  const [wrongCount, setWrongCount] = useState(0);
  useEffect(() => {
    if (correct) hapticSuccess();
    else if (session.feedback === "incorrect") {
      hapticError();
      setWrongCount((count) => count + 1);
    }
  }, [correct, session.feedback]);
  const answerMotion = useOutcomeMotion({ wrongCount, correct });

  const barActions: GameBarAction[] =
    session.phase === "complete"
      ? []
      : correct
        ? [
            {
              label:
                session.index === words.length - 1 ? "Lihat hasil" : "Lanjut",
              onPress: () => dispatch({ type: "next" }),
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
  const allCorrect = session.independent === words.length;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <GameRoundHeader
        onBack={exit}
        stats={[{ value: `${completed}/${words.length}` }]}
        statsLabel={`${completed} dari ${words.length} kata selesai`}
      >
        <Stack.Toolbar.Button
          accessibilityLabel="Petunjuk"
          disabled={session.phase !== "playing" || session.showHint}
          icon={toolbarIcons.hint}
          onPress={() => dispatch({ type: "hint" })}
        />
      </GameRoundHeader>
      <GameActionBar actions={barActions} />

      <ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.prompt}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>
            {challenge.family.toUpperCase()}
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

        <Animated.View
          style={[
            styles.workspace,
            answerMotion,
            {
              backgroundColor: withOpacity(
                colors.primary,
                correct ? 0.12 : 0.06,
              ),
              borderColor:
                session.feedback === "incorrect"
                  ? colors.destructive
                  : correct
                    ? colors.primary
                    : withOpacity(colors.primary, 0.18),
            },
          ]}
        >
          <View style={styles.answerRow}>
            {challenge.syllables.map((_, index) => {
              const tileIndex = session.selected[index];
              const syllable =
                tileIndex === undefined
                  ? undefined
                  : challenge.tiles[tileIndex];
              return (
                <PressableScale
                  key={index}
                  accessibilityLabel={
                    syllable
                      ? `Posisi ${index + 1}, ${syllable}. Ketuk untuk melepas.`
                      : `Posisi ${index + 1}, kosong`
                  }
                  accessibilityRole="button"
                  disabled={tileIndex === undefined || correct}
                  onPress={() => {
                    if (tileIndex === undefined) return;
                    hapticSelection();
                    dispatch({ type: "remove", tileIndex });
                  }}
                  style={[
                    styles.answerSlot,
                    {
                      backgroundColor: syllable ? colors.primary : colors.card,
                      borderColor: syllable
                        ? colors.primary
                        : withOpacity(colors.primary, 0.3),
                      borderStyle: syllable ? "solid" : "dashed",
                    },
                  ]}
                >
                  {syllable ? (
                    // Keyed by the tile, so each block placed pops in.
                    <Animated.Text
                      key={tileIndex}
                      entering={ZoomIn.springify().damping(13)}
                      style={[
                        styles.answerText,
                        { color: colors.primaryForeground },
                      ]}
                    >
                      {syllable}
                    </Animated.Text>
                  ) : null}
                </PressableScale>
              );
            })}
          </View>
          {correct ? (
            <Animated.Text
              entering={FadeIn.duration(180)}
              style={[styles.pronunciation, { color: colors.primary }]}
            >
              {challenge.word} · {challenge.pronunciation}
            </Animated.Text>
          ) : (
            <Text
              style={[styles.workspaceNote, { color: colors.mutedForeground }]}
            >
              Ketuk blok di atas untuk melepasnya.
            </Text>
          )}
        </Animated.View>

        <View style={styles.tiles}>
          {challenge.tiles.map((syllable, index) => {
            const selected = session.selected.includes(index);
            const highlighted =
              session.showHint && hintTileIndex === index && !correct;
            return (
              <PressableScale
                key={index}
                accessibilityLabel={`Blok ${syllable}${highlighted ? ", petunjuk" : ""}`}
                accessibilityRole="button"
                accessibilityState={{
                  disabled: selected || correct || isFull,
                }}
                disabled={selected || correct || isFull}
                onPress={() => {
                  hapticSelection();
                  dispatch({ type: "add", tileIndex: index });
                }}
                style={[
                  styles.tile,
                  {
                    backgroundColor: selected ? colors.muted : colors.card,
                    borderColor: highlighted ? colors.primary : colors.border,
                    borderWidth: highlighted ? 2 : 1,
                    opacity: selected ? 0.42 : 1,
                  },
                ]}
              >
                <Text style={[styles.tileText, { color: colors.foreground }]}>
                  {syllable}
                </Text>
              </PressableScale>
            );
          })}
        </View>

        <View style={styles.feedbackArea}>
          {session.feedback === "incorrect" ? (
            <Animated.Text
              accessibilityLiveRegion="polite"
              entering={FadeIn.duration(160)}
              style={[styles.feedback, { color: colors.destructive }]}
            >
              Urutan belum tepat. Ketuk blok di atas untuk mengubahnya.
            </Animated.Text>
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
      </ScrollView>

      {session.phase === "complete" ? (
        <GameResultSheet
          best={{
            scope: `word-builder:${stage?.id ?? "all"}`,
            value: session.independent,
            max: words.length,
          }}
          eyebrow="Susun kata"
          title={allCorrect ? "Mantap, semua tepat!" : "Kata demi kata, bisa!"}
          description="Tepat pada percobaan pertama tanpa petunjuk."
          mark={{
            value: `${session.independent}/${words.length}`,
            label: "tepat",
          }}
          done={allCorrect}
          celebrate={allCorrect}
          facts={[
            { icon: "text.word.spacing", text: `${words.length} kata disusun` },
          ]}
          primary={{
            eyebrow: "Main lagi",
            title: `${words.length} kata`,
            meta: "Ulangi dari kata pertama",
            pill: "Mulai",
            onPress: () => dispatch({ type: "start" }),
          }}
          secondary={{ label: leaveLabel, onPress: leave }}
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
});
