import { Stack } from "expo-router";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withSpring,
  type SharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { useAppTheme } from "../../providers/AppThemeProvider";
import { GameBackToolbar } from "../game-screens";
import { GameModal, GameStartModal, GameJourneyFooter } from "../game-modals";
import { useGameExitGuard } from "../game-navigation";
import { withOpacity } from "../../theme/colors";
import type { VocabularyAttempt } from "../../lib/use-vocabulary-progress";
import {
  createVocabularyMatchSession,
  isVocabularyMatch,
  pointsForVocabularyMatch,
  vocabularyMatchResult,
  type VocabularyMatchWord,
} from "./engine";
import {
  chainLinksForRope,
  createRopeState,
  MAX_CHAIN_LINK_COUNT,
  stepRope,
  type ChainLinkLayout,
} from "./rope";

type Phase = "ready" | "running" | "complete";
type Size = { width: number; height: number };
type Point = { x: number; y: number };

const BOARD_PADDING = 14;
const BOARD_TOP = 12;
const CENTER_GAP = 66;

function boardCardWidth(width: number) {
  "worklet";
  return Math.max(
    104,
    Math.min(168, (width - BOARD_PADDING * 2 - CENTER_GAP) / 2),
  );
}

function rowCenter(height: number, count: number, index: number) {
  "worklet";
  const usableHeight = Math.max(1, height - BOARD_TOP * 2);
  return BOARD_TOP + (usableHeight / Math.max(1, count)) * (index + 0.5);
}

function nearestRow(y: number, height: number, count: number) {
  "worklet";
  if (count <= 0) return -1;
  const slot = Math.max(1, (height - BOARD_TOP * 2) / count);
  const index = Math.max(
    0,
    Math.min(count - 1, Math.floor((y - BOARD_TOP) / slot)),
  );
  return Math.abs(y - rowCenter(height, count, index)) <= slot * 0.42
    ? index
    : -1;
}

function cardHeight(height: number, count: number) {
  const slot = Math.max(1, (height - BOARD_TOP * 2) / Math.max(1, count));
  return Math.max(48, Math.min(72, slot - 12));
}

function ChainLink({
  index,
  chain,
  colors,
  activeTermIndex,
}: {
  index: number;
  chain: SharedValue<ChainLinkLayout[]>;
  colors: readonly string[];
  activeTermIndex: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    const link = chain.value[index];
    if (!link) return { opacity: 0 };
    const colorIndex = Math.max(
      0,
      Math.min(colors.length - 1, activeTermIndex.value),
    );
    return {
      borderColor: colors[colorIndex] ?? colors[0],
      left: link.x - link.length / 2,
      opacity: 1,
      top: link.y - 4.5,
      width: link.length,
      transform: [
        { rotateZ: `${link.angle}rad` },
        { scaleY: index % 2 === 0 ? 1 : 0.48 },
      ],
    };
  });
  return (
    <Animated.View pointerEvents="none" style={[styles.chainLink, style]} />
  );
}

const LiveChain = memo(function LiveChain({
  chain,
  active,
  colors,
  activeTermIndex,
}: {
  chain: SharedValue<ChainLinkLayout[]>;
  active: SharedValue<number>;
  colors: readonly string[];
  activeTermIndex: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => ({ opacity: active.value }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, style]}
    >
      {Array.from({ length: MAX_CHAIN_LINK_COUNT }, (_, index) => (
        <ChainLink
          activeTermIndex={activeTermIndex}
          chain={chain}
          colors={colors}
          index={index}
          key={index}
        />
      ))}
    </Animated.View>
  );
});

function StaticChain({
  from,
  to,
  color,
}: {
  from: Point;
  to: Point;
  color: string;
}) {
  const segments = 10;
  const sag = Math.min(38, 14 + Math.abs(to.x - from.x) * 0.07);
  const points = Array.from({ length: segments + 1 }, (_, index) => {
    const progress = index / segments;
    return {
      x: from.x + (to.x - from.x) * progress,
      y:
        from.y +
        (to.y - from.y) * progress +
        4 * sag * progress * (1 - progress),
    };
  });
  const x = points.map((point) => point.x);
  const y = points.map((point) => point.y);
  const links = chainLinksForRope({
    x,
    y,
    previousX: x,
    previousY: y,
  });
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {links.map((link, index) => (
        <View
          key={index}
          style={[
            styles.chainLink,
            {
              borderColor: color,
              left: link.x - link.length / 2,
              top: link.y - 4.5,
              width: link.length,
              transform: [
                { rotateZ: `${link.angle}rad` },
                { scaleY: index % 2 === 0 ? 1 : 0.48 },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

export function VocabularyMatchScreen({
  words,
  onExit,
  onComplete,
  onAttempt,
  onSessionStart,
  courseId,
  sourceCourseItemId,
}: {
  words: readonly VocabularyMatchWord[];
  onExit: () => void;
  onComplete: () => unknown;
  onAttempt: (attempt: VocabularyAttempt) => Promise<void>;
  onSessionStart: () => void;
  courseId?: string;
  sourceCourseItemId?: string;
}) {
  const { colors, colorScheme } = useAppTheme();
  const session = useMemo(() => createVocabularyMatchSession(words), [words]);
  const [phase, setPhase] = useState<Phase>("ready");
  const [roundIndex, setRoundIndex] = useState(0);
  const [matches, setMatches] = useState<Record<string, true>>({});
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [mistakeIds, setMistakeIds] = useState<readonly string[]>([]);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [pendingResults, setPendingResults] = useState<
    Record<string, "CORRECT" | "INCORRECT">
  >({});
  const [board, setBoard] = useState<Size>({ width: 0, height: 0 });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const round = session.rounds[roundIndex] ?? session.rounds[0];
  const rowCount = round?.terms.length ?? 0;
  const ropeColors = useMemo(
    () => [
      colors.chart1,
      colors.chart2,
      colors.chart3,
      colors.chart4,
      colors.chart5,
    ],
    [colors.chart1, colors.chart2, colors.chart3, colors.chart4, colors.chart5],
  );
  const termRopeColors = useMemo(
    () =>
      round?.terms.map((_, index) => ropeColors[index % ropeColors.length]!) ??
      [],
    [ropeColors, round],
  );
  const completedBefore = session.rounds
    .slice(0, roundIndex)
    .reduce((total, item) => total + item.terms.length, 0);

  const boardWidth = useSharedValue(0);
  const boardHeight = useSharedValue(0);
  const active = useSharedValue(0);
  const dragging = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const tipX = useSharedValue(0);
  const tipY = useSharedValue(0);
  const activeTermIndex = useSharedValue(-1);
  const rope = useSharedValue(createRopeState({ x: 0, y: 0 }, { x: 1, y: 0 }));
  const chain = useSharedValue<ChainLinkLayout[]>([]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const exit = useGameExitGuard({
    active: phase === "running",
    locked: saving,
    onExit,
  });

  useFrameCallback(
    useCallback(
      (frame) => {
        "worklet";
        if (active.value === 0) return;
        const elapsed = frame.timeSincePreviousFrame;
        if (elapsed === null) return;
        const nextRope = stepRope(
          rope.value,
          { x: startX.value, y: startY.value },
          { x: tipX.value, y: tipY.value },
          elapsed / 1000,
        );
        rope.value = nextRope;
        chain.value = chainLinksForRope(nextRope);
      },
      [active, chain, rope, startX, startY, tipX, tipY],
    ),
  );

  const clearLiveRope = useCallback(() => {
    active.value = 0;
    dragging.value = 0;
    activeTermIndex.value = -1;
  }, [active, activeTermIndex, dragging]);

  const beginRope = useCallback(
    (termIndex: number, end?: Point) => {
      if (!round || matches[round.terms[termIndex]!.id]) return;
      const width = boardWidth.value;
      const height = boardHeight.value;
      const from = {
        x: BOARD_PADDING + boardCardWidth(width),
        y: rowCenter(height, rowCount, termIndex),
      };
      const to = end ?? { x: width / 2, y: from.y };
      startX.value = from.x;
      startY.value = from.y;
      tipX.value = to.x;
      tipY.value = to.y;
      const nextRope = createRopeState(from, to);
      rope.value = nextRope;
      chain.value = chainLinksForRope(nextRope);
      activeTermIndex.value = termIndex;
      active.value = 1;
    },
    [
      active,
      activeTermIndex,
      boardHeight,
      boardWidth,
      chain,
      matches,
      rope,
      round,
      rowCount,
      startX,
      startY,
      tipX,
      tipY,
    ],
  );

  const resetGame = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    clearLiveRope();
    setRoundIndex(0);
    setMatches({});
    setSelectedTermId(null);
    setScore(0);
    setStreak(0);
    setMistakeIds([]);
    setWrongId(null);
    setSaving(false);
    setSaveError(false);
    setPendingResults({});
    onSessionStart();
    setPhase("running");
  }, [clearLiveRope, onSessionStart]);

  const finishRound = useCallback(() => {
    timerRef.current = setTimeout(() => {
      clearLiveRope();
      setSelectedTermId(null);
      setWrongId(null);
      setMatches({});
      if (roundIndex + 1 < session.rounds.length) setRoundIndex(roundIndex + 1);
      else {
        setPhase("complete");
        void onComplete();
      }
    }, 520);
  }, [clearLiveRope, onComplete, roundIndex, session.rounds.length]);

  const handleAttempt = useCallback(
    (termId: string, definitionId: string) => {
      if (phase !== "running" || !round || matches[termId] || saving) return;
      if (!definitionId || !isVocabularyMatch(termId, definitionId)) {
        setStreak(0);
        setWrongId(definitionId || termId);
        if (!pendingResults[termId]) {
          setMistakeIds((current) =>
            current.includes(termId) ? current : [...current, termId],
          );
        }
        timerRef.current = setTimeout(() => setWrongId(null), 320);
        return;
      }

      clearLiveRope();
      setSelectedTermId(null);
      setWrongId(null);
      setSaving(true);
      setSaveError(false);
      const result =
        pendingResults[termId] ??
        vocabularyMatchResult(mistakeIds.includes(termId));
      setPendingResults((current) => ({ ...current, [termId]: result }));
      void onAttempt({
        entryId: termId,
        evidence: "RECOGNITION",
        result,
      })
        .then(() => {
          const nextStreak = streak + 1;
          const nextMatches = { ...matches, [termId]: true as const };
          setStreak(nextStreak);
          setScore((current) => current + pointsForVocabularyMatch(nextStreak));
          setMatches(nextMatches);
          setPendingResults((current) => {
            const next = { ...current };
            delete next[termId];
            return next;
          });
          if (Object.keys(nextMatches).length === round.terms.length)
            finishRound();
        })
        .catch(() => setSaveError(true))
        .finally(() => setSaving(false));
    },
    [
      clearLiveRope,
      finishRound,
      matches,
      mistakeIds,
      onAttempt,
      pendingResults,
      phase,
      round,
      saving,
      streak,
    ],
  );

  const termIds = useMemo(
    () => round?.terms.map((word) => word.id) ?? [],
    [round],
  );
  const definitionIds = useMemo(
    () => round?.definitions.map((word) => word.id) ?? [],
    [round],
  );
  const matchedTermIds = useMemo(() => Object.keys(matches), [matches]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(phase === "running" && rowCount > 0 && !saving)
        .shouldCancelWhenOutside(false)
        .maxPointers(1)
        .minDistance(3)
        .onBegin((event) => {
          const width = boardWidth.value;
          const height = boardHeight.value;
          const index = nearestRow(event.y, height, rowCount);
          const endOfCard = BOARD_PADDING + boardCardWidth(width);
          if (
            index < 0 ||
            event.x > endOfCard + 20 ||
            matchedTermIds.includes(termIds[index] ?? "")
          )
            return;
          const from = { x: endOfCard, y: rowCenter(height, rowCount, index) };
          const to = { x: event.x, y: event.y };
          startX.value = from.x;
          startY.value = from.y;
          tipX.value = to.x;
          tipY.value = to.y;
          const nextRope = createRopeState(from, to);
          rope.value = nextRope;
          chain.value = chainLinksForRope(nextRope);
          activeTermIndex.value = index;
          dragging.value = 1;
          active.value = 1;
        })
        .onUpdate((event) => {
          if (dragging.value === 0) return;
          tipX.value = Math.max(0, Math.min(boardWidth.value, event.x));
          tipY.value = Math.max(0, Math.min(boardHeight.value, event.y));
        })
        .onEnd((event) => {
          if (dragging.value === 0) return;
          dragging.value = 0;
          const termIndex = activeTermIndex.value;
          const targetIndex =
            event.x >= boardWidth.value * 0.55
              ? nearestRow(event.y, boardHeight.value, rowCount)
              : -1;
          const termId = termIds[termIndex] ?? "";
          const definitionId = definitionIds[targetIndex] ?? "";
          if (termId && definitionId && termId === definitionId) {
            tipX.value =
              boardWidth.value -
              BOARD_PADDING -
              boardCardWidth(boardWidth.value);
            tipY.value = rowCenter(boardHeight.value, rowCount, targetIndex);
            scheduleOnRN(handleAttempt, termId, definitionId);
            return;
          }
          if (termId) scheduleOnRN(handleAttempt, termId, definitionId);
          tipX.value = withSpring(startX.value, {
            damping: 22,
            stiffness: 320,
          });
          tipY.value = withSpring(
            startY.value,
            { damping: 22, stiffness: 320 },
            (finished) => {
              if (finished) active.value = 0;
            },
          );
        })
        .onFinalize(() => {
          dragging.value = 0;
        }),
    [
      active,
      activeTermIndex,
      boardHeight,
      boardWidth,
      chain,
      definitionIds,
      dragging,
      handleAttempt,
      matchedTermIds,
      phase,
      rope,
      rowCount,
      saving,
      startX,
      startY,
      termIds,
      tipX,
      tipY,
    ],
  );

  const onBoardLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      boardWidth.value = width;
      boardHeight.value = height;
      setBoard((current) =>
        Math.abs(current.width - width) < 1 &&
        Math.abs(current.height - height) < 1
          ? current
          : { width, height },
      );
    },
    [boardHeight, boardWidth],
  );

  if (!round) return null;
  const width = boardCardWidth(board.width);
  const height = cardHeight(board.height, rowCount);
  const rightX = board.width - BOARD_PADDING - width;
  const progress = completedBefore + Object.keys(matches).length;
  const reviewWords = session.rounds
    .flatMap((item) => item.terms)
    .filter((word) => mistakeIds.includes(word.id));

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <GameBackToolbar disabled={saving} onPress={exit} />
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
            accessibilityLabel={`${progress} of ${session.wordCount} matched, score ${score}, streak ${streak}`}
            style={styles.headerStats}
          >
            <Text
              style={[styles.headerMetric, { color: colors.mutedForeground }]}
            >
              {progress}/{session.wordCount}
            </Text>
            <Text style={[styles.headerMetric, { color: colors.foreground }]}>
              {score}
            </Text>
            {streak > 1 ? (
              <Text style={[styles.headerMetric, { color: colors.primary }]}>
                ×{streak}
              </Text>
            ) : null}
          </View>
        </Stack.Toolbar.View>
      </Stack.Toolbar>

      <View style={styles.instructionRow}>
        <Text style={[styles.instruction, { color: colors.mutedForeground }]}>
          {saveError
            ? "Could not save that match. Connect and try it again."
            : saving
              ? "Saving match…"
              : "Pull a chain from word to meaning"}
        </Text>
      </View>

      <GestureDetector gesture={pan}>
        <View collapsable={false} onLayout={onBoardLayout} style={styles.board}>
          {round.terms.flatMap((term, termIndex) => {
            if (!matches[term.id]) return [];
            const definitionIndex = round.definitions.findIndex(
              (definition) => definition.id === term.id,
            );
            return [
              <StaticChain
                color={withOpacity(termRopeColors[termIndex]!, 0.78)}
                from={{
                  x: BOARD_PADDING + width,
                  y: rowCenter(board.height, rowCount, termIndex),
                }}
                key={term.id}
                to={{
                  x: rightX,
                  y: rowCenter(board.height, rowCount, definitionIndex),
                }}
              />,
            ];
          })}
          <LiveChain
            active={active}
            activeTermIndex={activeTermIndex}
            chain={chain}
            colors={termRopeColors}
          />

          {round.terms.map((word, index) => {
            const matched = Boolean(matches[word.id]);
            const selected = selectedTermId === word.id;
            const wrong = wrongId === word.id;
            const ropeColor = termRopeColors[index] ?? colors.primary;
            return (
              <Pressable
                accessibilityLabel={`${word.term}, drag to its meaning`}
                accessibilityRole="button"
                accessibilityState={{ disabled: matched, selected }}
                disabled={matched || phase !== "running"}
                key={word.id}
                onPress={() => {
                  setSelectedTermId(word.id);
                  beginRope(index);
                }}
                style={[
                  styles.card,
                  {
                    backgroundColor: wrong
                      ? withOpacity(colors.destructive, 0.1)
                      : selected
                        ? withOpacity(colors.primary, 0.12)
                        : colors.card,
                    borderColor: wrong
                      ? colors.destructive
                      : selected
                        ? ropeColor
                        : colors.border,
                    height,
                    left: BOARD_PADDING,
                    opacity: matched ? 0.34 : 1,
                    shadowOpacity: colorScheme === "dark" ? 0.26 : 0.12,
                    top: rowCenter(board.height, rowCount, index) - height / 2,
                    width,
                  },
                ]}
              >
                <Text
                  numberOfLines={2}
                  style={[styles.term, { color: colors.foreground }]}
                >
                  {word.term}
                </Text>
                <View
                  style={[
                    styles.anchor,
                    styles.rightAnchor,
                    { backgroundColor: ropeColor },
                  ]}
                />
              </Pressable>
            );
          })}

          {round.definitions.map((word, index) => {
            const matched = Boolean(matches[word.id]);
            const wrong = wrongId === word.id;
            const termIndex = round.terms.findIndex(
              (term) => term.id === word.id,
            );
            const ropeColor = termRopeColors[termIndex] ?? colors.primary;
            return (
              <Pressable
                accessibilityLabel={`Meaning: ${word.definition}`}
                accessibilityRole="button"
                accessibilityState={{ disabled: matched }}
                disabled={matched || phase !== "running"}
                key={word.id}
                onPress={() => {
                  if (!selectedTermId) return;
                  tipX.value = rightX;
                  tipY.value = rowCenter(board.height, rowCount, index);
                  handleAttempt(selectedTermId, word.id);
                }}
                style={[
                  styles.card,
                  {
                    backgroundColor: wrong
                      ? withOpacity(colors.destructive, 0.1)
                      : colors.card,
                    borderColor: wrong ? colors.destructive : colors.border,
                    height,
                    left: rightX,
                    opacity: matched ? 0.34 : 1,
                    shadowOpacity: colorScheme === "dark" ? 0.26 : 0.12,
                    top: rowCenter(board.height, rowCount, index) - height / 2,
                    width,
                  },
                ]}
              >
                <View
                  style={[
                    styles.anchor,
                    styles.leftAnchor,
                    { backgroundColor: matched ? ropeColor : colors.primary },
                  ]}
                />
                <Text
                  numberOfLines={3}
                  style={[styles.definition, { color: colors.foreground }]}
                >
                  {word.definition}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </GestureDetector>

      <GameStartModal
        detail="Connect each word to its meaning. Drag from the left, or tap one card on each side."
        gameKey="match"
        onPrimary={resetGame}
        onSecondary={exit}
        title="Vocabulary Match"
        visible={phase === "ready"}
      />
      <GameModal
        content={
          <View style={styles.finishContent}>
            {reviewWords.length > 0 ? (
              <View style={[styles.review, { borderColor: colors.border }]}>
                <Text
                  style={[
                    styles.reviewTitle,
                    { color: colors.mutedForeground },
                  ]}
                >
                  Review
                </Text>
                {reviewWords.slice(0, 4).map((word) => (
                  <Text
                    key={word.id}
                    style={[styles.reviewWord, { color: colors.foreground }]}
                  >
                    {word.term} · {word.definition}
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
        detail={`Final score ${score} · ${session.wordCount} words matched`}
        eyebrow="Vocabulary match"
        gameKey="match"
        onPrimary={resetGame}
        onSecondary={exit}
        primaryLabel="Play again"
        primaryDisabled={saving}
        secondaryLabel="Exit"
        secondaryDisabled={saving}
        title="Round complete"
        visible={phase === "complete"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  instructionRow: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  instruction: { fontSize: 12, fontWeight: "600", letterSpacing: 0.2 },
  board: { flex: 1, overflow: "hidden" },
  headerStats: { alignItems: "center", flexDirection: "row", gap: 12 },
  headerMetric: {
    fontSize: 13,
    fontVariant: ["tabular-nums"],
    fontWeight: "800",
  },
  card: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    paddingHorizontal: 12,
    position: "absolute",
    elevation: 4,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  term: { fontSize: 18, fontWeight: "800", textAlign: "center" },
  definition: { fontSize: 13, fontWeight: "600", textAlign: "center" },
  anchor: { borderRadius: 5, height: 10, position: "absolute", width: 10 },
  leftAnchor: { left: -5 },
  rightAnchor: { right: -5 },
  chainLink: {
    backgroundColor: "transparent",
    borderRadius: 5,
    borderWidth: 2.25,
    height: 9,
    position: "absolute",
  },
  review: {
    alignSelf: "stretch",
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 5,
    paddingTop: 12,
  },
  reviewTitle: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  reviewWord: { fontSize: 13, fontWeight: "600" },
  finishContent: { alignSelf: "stretch", gap: 12 },
});
