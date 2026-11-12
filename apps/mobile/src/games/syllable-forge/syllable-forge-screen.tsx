import type { HangeulGameStage } from "@hakgyo/shared/hangeul";
import { Stack } from "expo-router";
import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import {
  AccessibilityInfo,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Action } from "../../components/learning-ui";
import { useAppTheme } from "../../providers/AppThemeProvider";
import { withOpacity } from "../../theme/colors";
import { toolbarIcons } from "../../theme/toolbar-icons";
import { gameLeaveLabel, type GameSource } from "../game-exit";
import { leaveGame, useGameExitGuard } from "../game-navigation";
import { GameResultSheet } from "../game-result";
import { GameRoundHeader } from "../game-round";
import { composeHangul, syllableKeys } from "./hangul-composer";
import { HangeulKeyboard } from "./hangeul-keyboard";
import {
  getSyllableChallenges,
  type SyllableChallenge,
} from "./syllable-forge-data";
import {
  createSyllableSessionReducer,
  initialSession,
} from "./syllable-session";
import { SyllableStage } from "./syllable-stage";
import { SymbolIcon } from "../../components/ui/symbol-icon";
import { hapticError, hapticSuccess } from "../../lib/haptics";

function SyllableHintModal({
  challenge,
  expectedKeys,
  enteredCount,
  visible,
  onClose,
}: {
  challenge: SyllableChallenge;
  expectedKeys: string[];
  enteredCount: number;
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
        contentContainerStyle={styles.hintModalContent}
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: colors.background }}
      >
        <View style={styles.hintModalBody}>
          <View style={styles.hintModalHeader}>
            <Text style={[styles.modalHeading, { color: colors.foreground }]}>
              Petunjuk 한글
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tutup petunjuk"
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

          <View style={styles.hintTarget}>
            <Text
              style={[styles.hintTargetGlyph, { color: colors.foreground }]}
            >
              {challenge.target}
            </Text>
            <Text style={[styles.hintTargetCue, { color: colors.primary }]}>
              {challenge.cue}
            </Text>
            <Text
              style={[
                styles.hintFamilyLabel,
                { color: colors.mutedForeground },
              ]}
            >
              {challenge.family}
            </Text>
          </View>

          <View
            style={[
              styles.hintInstruction,
              {
                backgroundColor: withOpacity(colors.primary, 0.07),
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.hintText, { color: colors.foreground }]}>
              {challenge.instruction}
            </Text>
          </View>

          <View style={styles.hintSequenceSection}>
            <Text style={[styles.hintSequenceTitle, { color: colors.primary }]}>
              URUTAN TOMBOL
            </Text>
            <View style={styles.hintKeys}>
              {expectedKeys.map((key, index) => (
                <View
                  key={index}
                  style={[
                    styles.hintKey,
                    {
                      backgroundColor: withOpacity(
                        colors.primary,
                        index < enteredCount ? 0.25 : 0.08,
                      ),
                      borderColor:
                        index === enteredCount ? colors.primary : "transparent",
                    },
                  ]}
                >
                  <Text
                    style={[styles.hintLetter, { color: colors.foreground }]}
                  >
                    {key}
                  </Text>
                </View>
              ))}
            </View>
            <Text
              style={[
                styles.hintSequenceNote,
                { color: colors.mutedForeground },
              ]}
            >
              Tombol berikutnya tetap ditandai setelah petunjuk ditutup.
            </Text>
          </View>

          <Action onPress={onClose}>Kembali ke game</Action>
        </View>
      </ScrollView>
    </Modal>
  );
}

/** How long a right block stays before the next one. */
const AUTO_NEXT_MS = 1200;

export function SyllableForgeScreen({
  source,
  stage,
}: {
  source?: GameSource;
  stage?: HangeulGameStage;
}) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const challenges = getSyllableChallenges(stage?.id);
  const reducer = useMemo(
    () => createSyllableSessionReducer(challenges),
    [challenges],
  );
  // Starts at once: the tile in Latihan (or the lesson) already said what
  // the game is.
  const [session, dispatch] = useReducer(
    reducer,
    initialSession,
    (initial) => ({
      ...initial,
      phase: "playing" as const,
    }),
  );
  const [showHintModal, setShowHintModal] = useState(false);
  const leave = useCallback(() => leaveGame(source), [source]);
  const leaveLabel = gameLeaveLabel(source);
  const challenge = challenges[session.index]!;
  const blocks = useMemo(() => composeHangul(session.keys), [session.keys]);
  const expectedKeys = useMemo(
    () => syllableKeys(challenge.target),
    [challenge.target],
  );
  const matchesHint = session.keys.every(
    (key, index) => expectedKeys[index] === key,
  );
  const correct = session.phase === "correct";
  const completed =
    session.index + (correct || session.phase === "complete" ? 1 : 0);
  useEffect(() => {
    setShowHintModal(false);
  }, [session.index]);
  useEffect(() => {
    if (session.feedback !== "incorrect") return;
    const timer = setTimeout(() => dispatch({ type: "reject-typo" }), 420);
    return () => clearTimeout(timer);
  }, [session.feedback, session.errors]);

  // Nothing is saved, so leaving needs no confirmation; the guard sends
  // every back action (button, swipe, Android back) to the right place.
  const exit = useGameExitGuard({
    active: session.phase !== "complete",
    locked: false,
    onExit: leave,
  });

  // A right block moves on by itself after a moment; "Lanjut" skips the
  // wait.
  useEffect(() => {
    if (session.phase !== "correct") return;
    const timer = setTimeout(() => dispatch({ type: "next" }), AUTO_NEXT_MS);
    return () => clearTimeout(timer);
  }, [session.phase, session.index]);
  const openHint = useCallback(() => {
    if (!session.showHint) dispatch({ type: "hint" });
    setShowHintModal(true);
  }, [session.showHint]);
  const enterKey = useCallback(
    (key: string) => dispatch({ type: "key", key }),
    [],
  );
  const deleteKey = useCallback(() => dispatch({ type: "delete" }), []);
  const nextChallenge = useCallback(() => dispatch({ type: "next" }), []);

  const feedback = correct
    ? `Tepat! ${challenge.target} berhasil terbentuk.`
    : session.feedback === "incorrect"
      ? "Huruf itu belum tepat. Akan dihapus otomatis."
      : "Ketik konsonan, lalu vokal. Huruf menyatu otomatis.";
  useEffect(() => {
    if (correct || session.feedback === "incorrect")
      AccessibilityInfo.announceForAccessibility(feedback);
  }, [correct, session.feedback, feedback]);

  // Once per outcome: only the outcome changes these.
  useEffect(() => {
    if (correct) hapticSuccess();
    else if (session.feedback === "incorrect") hapticError();
  }, [correct, session.feedback]);
  const allCorrect = session.independent === challenges.length;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <GameRoundHeader
        onBack={exit}
        stats={[{ value: `${completed}/${challenges.length}` }]}
        statsLabel={`${completed} dari ${challenges.length} blok selesai`}
      >
        <Stack.Toolbar.Button
          accessibilityLabel="Buka petunjuk susun Hangeul"
          disabled={
            session.phase !== "playing" || session.feedback === "incorrect"
          }
          icon={toolbarIcons.hint}
          onPress={openHint}
        />
      </GameRoundHeader>
      <View style={styles.content}>
        <View style={styles.prompt}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>
            {challenge.family.toUpperCase()}
          </Text>
          <View style={styles.targetRow}>
            <Text
              accessibilityLabel={`Target ${challenge.target}`}
              style={[styles.target, { color: colors.foreground }]}
            >
              {challenge.target}
            </Text>
            <View style={styles.targetCopy}>
              <Text style={[styles.cue, { color: colors.foreground }]}>
                {challenge.cue}
              </Text>
              <Text
                style={[styles.targetNote, { color: colors.mutedForeground }]}
              >
                Bunyi bantu
              </Text>
            </View>
          </View>
        </View>
        <SyllableStage
          blocks={blocks}
          correct={correct}
          errorCount={session.errors}
        />
        <Text
          accessibilityLiveRegion="polite"
          style={[
            styles.feedback,
            {
              color:
                session.feedback === "incorrect"
                  ? colors.destructive
                  : correct
                    ? colors.primary
                    : colors.mutedForeground,
            },
          ]}
        >
          {feedback}
        </Text>
      </View>
      <View
        style={[
          styles.controls,
          {
            paddingBottom: Math.max(56, insets.bottom + 52),
            borderTopColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <HangeulKeyboard
          onKey={enterKey}
          onDelete={deleteKey}
          disabled={
            session.phase !== "playing" || session.feedback === "incorrect"
          }
          empty={!session.keys.length}
          suggestedKey={
            session.showHint && matchesHint
              ? expectedKeys[session.keys.length]
              : undefined
          }
        />
        <View style={styles.nextActionSlot}>
          {correct ? (
            <Action onPress={nextChallenge}>
              {session.index === challenges.length - 1
                ? "Lihat hasil"
                : "Lanjut"}
            </Action>
          ) : null}
        </View>
      </View>
      <SyllableHintModal
        challenge={challenge}
        enteredCount={
          session.feedback === "incorrect"
            ? Math.max(0, session.keys.length - 1)
            : session.keys.length
        }
        expectedKeys={expectedKeys}
        onClose={() => setShowHintModal(false)}
        visible={session.phase === "playing" && showHintModal}
      />
      {session.phase === "complete" ? (
        <GameResultSheet
          best={{
            scope: `syllable-forge:${stage?.id ?? "all"}`,
            value: session.independent,
            max: challenges.length,
          }}
          eyebrow="Susun 한글"
          title={allCorrect ? "Mantap, semua tepat!" : "Blok demi blok, bisa!"}
          description="Tepat pada percobaan pertama tanpa petunjuk. Ulangi untuk makin mengenali susunannya."
          mark={{
            value: `${session.independent}/${challenges.length}`,
            label: "tepat",
          }}
          done={allCorrect}
          celebrate={allCorrect}
          facts={[
            {
              icon: "character.book.closed.fill",
              text: `${challenges.length} blok disusun`,
            },
          ]}
          primary={{
            eyebrow: "Main lagi",
            title: `${challenges.length} blok`,
            meta: "Ulangi dari blok pertama",
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
    flex: 1,
    padding: 20,
    gap: 14,
    paddingBottom: 24,
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
  },
  prompt: { alignItems: "center", gap: 6 },
  eyebrow: { fontSize: 10, letterSpacing: 2, fontWeight: "800" },
  targetRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  target: { fontSize: 48, lineHeight: 62, fontWeight: "600" },
  targetCopy: { gap: 2 },
  cue: { fontSize: 21, fontWeight: "700" },
  targetNote: { fontSize: 12, lineHeight: 18 },
  feedback: {
    textAlign: "center",
    fontSize: 13,
    lineHeight: 20,
    minHeight: 40,
  },
  hintText: { fontSize: 14, lineHeight: 21 },
  hintKeys: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  hintKey: {
    minWidth: 40,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
  },
  hintLetter: { fontSize: 22 },
  hintModalContent: { padding: 20, paddingBottom: 36 },
  hintModalBody: { gap: 20 },
  hintModalHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalHeading: { fontSize: 24, fontWeight: "900", lineHeight: 30 },
  modalCloseButton: {
    alignItems: "center",
    borderRadius: 999,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  hintTarget: { alignItems: "center", gap: 4 },
  hintTargetGlyph: { fontSize: 72, fontWeight: "600", lineHeight: 86 },
  hintTargetCue: { fontSize: 20, fontWeight: "800" },
  hintFamilyLabel: { fontSize: 12, fontWeight: "600" },
  hintInstruction: { borderRadius: 18, borderWidth: 1, padding: 16 },
  hintSequenceSection: { alignItems: "center", gap: 12 },
  hintSequenceTitle: { fontSize: 11, fontWeight: "900", letterSpacing: 1.5 },
  hintSequenceNote: { fontSize: 12, lineHeight: 18, textAlign: "center" },
  controls: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    paddingHorizontal: 8,
    gap: 12,
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
  },
  nextActionSlot: { minHeight: 48 },
});
