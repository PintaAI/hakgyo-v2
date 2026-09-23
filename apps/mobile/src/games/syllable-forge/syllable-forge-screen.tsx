import { router, Stack, useFocusEffect } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import {
  AccessibilityInfo,
  BackHandler,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StudyAction } from "../../components/study-glass";
import { GlassBox } from "../../components/GlassBox";
import { useAppTheme } from "../../providers/AppThemeProvider";
import { withOpacity } from "../../theme/colors";
import { toolbarIcons } from "../../theme/toolbar-icons";
import { GameModal, GameStartModal } from "../game-modals";
import { GameBackToolbar } from "../game-screens";
import { composeHangul, syllableKeys } from "./hangul-composer";
import { HangeulKeyboard } from "./hangeul-keyboard";
import { SYLLABLE_CHALLENGES } from "./syllable-forge-data";
import { initialSession, syllableSessionReducer } from "./syllable-session";
import { SyllableStage } from "./syllable-stage";

const leave = () => router.dismissTo("/(home)/(tabs)/assessments");

function SyllableHintModal({
  challenge,
  expectedKeys,
  enteredCount,
  visible,
  onClose,
}: {
  challenge: (typeof SYLLABLE_CHALLENGES)[number];
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
            <GlassBox
              isInteractive
              glassEffectStyle="clear"
              tintColor={withOpacity(colors.mutedForeground, 0.12)}
              style={styles.modalCloseGlass}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Tutup petunjuk"
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

          <StudyAction accessibilityLabel="Kembali ke game" onPress={onClose}>
            Kembali ke game
          </StudyAction>
        </View>
      </ScrollView>
    </Modal>
  );
}

export function SyllableForgeScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [session, dispatch] = useReducer(
    syllableSessionReducer,
    initialSession,
  );
  const [showExit, setShowExit] = useState(false);
  const [showHintModal, setShowHintModal] = useState(false);
  const challenge = SYLLABLE_CHALLENGES[session.index]!;
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
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(completed / SYLLABLE_CHALLENGES.length, {
      duration: 280,
    });
  }, [completed, progress]);
  useEffect(() => {
    setShowHintModal(false);
  }, [session.index]);
  useEffect(() => {
    if (session.feedback !== "incorrect") return;
    const timer = setTimeout(() => dispatch({ type: "reject-typo" }), 420);
    return () => clearTimeout(timer);
  }, [session.feedback, session.errors]);
  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  const requestLeave = useCallback(() => {
    if (session.phase === "intro" || session.phase === "complete") leave();
    else setShowExit(true);
  }, [session.phase]);
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
  useFocusEffect(
    useCallback(() => {
      const listener = BackHandler.addEventListener("hardwareBackPress", () => {
        requestLeave();
        return true;
      });
      return () => listener.remove();
    }, [requestLeave]),
  );

  const feedback = correct
    ? `Tepat! ${challenge.target} berhasil terbentuk.`
    : session.feedback === "incorrect"
      ? "Huruf itu belum tepat. Akan dihapus otomatis."
      : "Ketik konsonan, lalu vokal. Huruf menyatu otomatis.";
  useEffect(() => {
    if (correct || session.feedback === "incorrect")
      AccessibilityInfo.announceForAccessibility(feedback);
  }, [correct, session.feedback, feedback]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <GameBackToolbar onPress={requestLeave} />
      {session.phase === "playing" ? (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            accessibilityLabel="Buka petunjuk susun Hangeul"
            disabled={session.feedback === "incorrect"}
            icon={toolbarIcons.hint}
            onPress={openHint}
          />
        </Stack.Toolbar>
      ) : null}
      <Stack.Screen
        options={{
          headerBackButtonDisplayMode: "minimal",
          headerBackVisible: false,
          headerShown: true,
          gestureEnabled: false,
          title: "Susun 한글",
        }}
      />
      <View
        accessibilityRole="progressbar"
        accessibilityLabel="Blok selesai"
        accessibilityValue={{
          min: 0,
          max: SYLLABLE_CHALLENGES.length,
          now: completed,
        }}
        style={[styles.progressTrack, { backgroundColor: colors.border }]}
      >
        <Animated.View
          style={[
            styles.progressFill,
            { backgroundColor: colors.primary },
            progressStyle,
          ]}
        />
      </View>
      <View style={styles.content}>
        <View style={styles.lessonRow}>
          <Text style={[styles.smallLabel, { color: colors.mutedForeground }]}>
            {challenge.family}
          </Text>
          <Text style={[styles.smallLabel, { color: colors.mutedForeground }]}>
            {session.index + 1}/{SYLLABLE_CHALLENGES.length}
          </Text>
        </View>
        <View style={styles.prompt}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>
            SUSUN BLOK INI
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
            session.phase !== "playing" ||
            session.feedback === "incorrect" ||
            showExit
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
            <StudyAction onPress={nextChallenge}>
              {session.index === SYLLABLE_CHALLENGES.length - 1
                ? "Lihat hasil"
                : "Lanjut"}
            </StudyAction>
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
      <GameStartModal
        gameKey="syllable-forge"
        visible={session.phase === "intro"}
        title="Susun 한글"
        detail="Ketik huruf dan lihat mereka menyatu menjadi suku kata. Mulai dari blok sederhana, lalu coba vokal gabungan dan batchim."
        content={
          <Text style={[styles.modalCopy, { color: colors.mutedForeground }]}>
            12 tantangan · Tanpa batas waktu{"\n"}Keyboard Korea dengan bunyi
            bantu Indonesia. Gunakan Shift untuk huruf rangkap, ⌫ untuk
            menghapus, dan petunjuk kapan pun dibutuhkan.
          </Text>
        }
        primaryLabel="Mulai menyusun"
        secondaryLabel="Kembali"
        onPrimary={() => dispatch({ type: "start" })}
        onSecondary={leave}
      />
      <GameModal
        gameKey="syllable-forge"
        visible={session.phase === "complete"}
        eyebrow="LATIHAN SELESAI"
        title="Blok demi blok, bisa!"
        detail={`Kamu berhasil menyusun ${SYLLABLE_CHALLENGES.length} blok Hangeul.`}
        content={
          <View style={styles.result}>
            <Text style={[styles.resultNumber, { color: colors.primary }]}>
              {session.independent}/{SYLLABLE_CHALLENGES.length}
            </Text>
            <Text style={[styles.modalCopy, { color: colors.mutedForeground }]}>
              Tepat pada percobaan pertama tanpa petunjuk.{"\n"}Ulangi latihan
              untuk makin mengenali susunannya.
            </Text>
          </View>
        }
        primaryLabel="Main lagi"
        secondaryLabel="Kembali ke latihan"
        onPrimary={() => dispatch({ type: "start" })}
        onSecondary={leave}
      />
      <GameModal
        gameKey="syllable-forge"
        visible={showExit}
        eyebrow="JEDA SEBENTAR"
        title="Keluar dari latihan?"
        detail="Progres sesi ini belum disimpan. Kamu bisa melanjutkan menyusun atau mulai lagi nanti."
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
    flex: 1,
    padding: 20,
    gap: 14,
    paddingBottom: 24,
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
  },
  lessonRow: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  smallLabel: { fontSize: 12, fontWeight: "600" },
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
  modalCopy: { fontSize: 14, lineHeight: 22, textAlign: "center" },
  result: { alignItems: "center", gap: 10 },
  resultNumber: { fontSize: 46, fontWeight: "800" },
});
