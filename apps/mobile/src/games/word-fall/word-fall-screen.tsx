import { displayMeanings } from "@hakgyo/shared";
import { Stack } from "expo-router";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type LayoutChangeEvent,
} from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeOut,
  interpolate,
  FadeInUp,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type FrameInfo,
  type SharedValue,
} from "react-native-reanimated";

import { useAppTheme } from "../../providers/AppThemeProvider";
import type {
  VocabularyAttempt,
  VocabularyAttemptDelivery,
} from "../../lib/use-vocabulary-progress";
import { withOpacity, type ThemeColors } from "../../theme/colors";
import { toolbarIcons } from "../../theme/toolbar-icons";
import { gameIconPalette } from "../game-icons";
import { GameBackToolbar } from "../game-screens";
import { GameResultSheet } from "../game-result";
import type { GameLesson } from "../lesson";
import { START_LEVEL_OPTIONS, useWordFallSettings } from "./word-fall-settings";
import { useGameExitGuard } from "../game-navigation";
import {
  addWordFallReviewItem,
  analyzeTyping,
  blastForCombo,
  SHIP_BLAST,
  answerOptionsForWord,
  answerTextForWord,
  bestTypingAnswer,
  cleanTypingText,
  comboMultiplier,
  destroyedForLevel,
  fallDurationForLevel,
  isWordFallInputEditable,
  levelForDestroyed,
  maximumActiveWords,
  pointsForWord,
  promptTextForWord,
  wordFallResult,
  shotImpulseForLevel,
  selectWordTarget,
  spawnIntervalForLevel,
  type WordFallAnswerMode,
  type WordFallPhase,
  type WordFallPowerUp,
  type WordFallReviewItem,
  type WordFallWord,
} from "./engine";
import {
  addBody,
  createWorld,
  cruiseSpeed,
  fallProgress,
  findBody,
  holdBody,
  knockBack,
  massForAnswer,
  explode,
  removeBody,
  setBodySize,
  stepWorld,
  type WordFallArena,
  type WordFallWorld,
} from "./physics";
import {
  WordFallEffects,
  type Shot,
  type WordFallEffectsHandle,
} from "./word-fall-effects";
import { WordFallBackdrop } from "./word-fall-backdrop";
import { useWordFallSfx } from "./word-fall-sfx";
import { SymbolIcon } from "../../components/ui/symbol-icon";
import type { SymbolName } from "../../components/ui/symbol-names";
import { hapticError, hapticImpact, hapticSuccess } from "../../lib/haptics";

type FallingWord = {
  id: string;
  word: WordFallWord;
  /** The meaning being typed; switches to whichever one the input matches. */
  answer: string;
  matched: number;
  comboAtCompletion?: number;
  completed: boolean;
  powerUp?: WordFallPowerUp;
  /** A word of the warm-up wave: its answer shows in full while it falls. */
  warmup?: boolean;
  /**
   * Its answer was shown at some point of this fall (warm-up, or Intip while
   * it was on screen): typing it is recognising the word, not recalling it.
   */
  answerSeen: boolean;
  /** Intip was used on it: its answer shows for the rest of this fall. */
  revealed?: boolean;
};

type FieldSize = { width: number; height: number };
type WordPosition = {
  id: string;
  x: number;
  y: number;
  halfWidth: number;
  halfHeight: number;
};
/** How often the words' positions are copied to the JS thread. */
const POSITION_SYNC_MS = 66;

const START_Y = -72;
const PLAYER_BOTTOM = 120;
const MISTAKE_PLAYER_LIFT = 34;
const PLAYER_SIZE = 26;
const PLAYER_HEIGHT = PLAYER_SIZE;
const STARTING_HEALTH = 3;
/**
 * A lesson round: each word falls once, slower than level 1 is long, and at
 * most two at a time; a missed word costs no life and counts as wrong.
 */
const LESSON_FALL_MS = 15_000;
const LESSON_MAX_ACTIVE_WORDS = 2;
/**
 * Warm-up: a word's first fall shows its answer in full, so the learner only
 * types it (each letter lights up as it is typed); every later fall hides it.
 * A lesson round drops each word twice, warm-up first, and a game in Latihan
 * warms up each word the first time it falls. A word missed or mistyped while
 * hidden falls again, ahead of the others, at most this many more times.
 */
const MAX_RETRIES = 3;
/** How long a missed word stays up, with its answer, to memorise. */
const MISSED_ANSWER_MS = 4_500;
const MAX_HEALTH = 6;
const FORCE_REWARD_CHARGES = 10;
const MAX_FORCE_CHARGES = 20;
const MAX_REVEAL_CHARGES = 5;

function shuffledWords<T>(items: readonly T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index--) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap]!, copy[index]!];
  }
  return copy;
}

function powerUpForRoll(roll: number): WordFallPowerUp | undefined {
  if (roll >= 0.15) return undefined;
  if (roll < 0.03) return "shield";
  if (roll < 0.06) return "freeze";
  if (roll < 0.09) return "heart";
  if (roll < 0.12) return "force";
  return "reveal";
}

/** A power-up's name, the same on the word, its chip and its button. */
function powerUpLabel(powerUp: WordFallPowerUp) {
  if (powerUp === "shield") return "Perisai";
  if (powerUp === "freeze") return "Beku";
  if (powerUp === "heart") return "Nyawa";
  if (powerUp === "force") return "Tenaga";
  return "Intip";
}

function powerUpColor(powerUp: WordFallPowerUp, colors: ThemeColors) {
  if (powerUp === "shield") return colors.highlightBlueText;
  if (powerUp === "freeze") return colors.chart2;
  if (powerUp === "heart") return colors.destructive;
  if (powerUp === "force") return colors.highlightOrangeText;
  return colors.highlightGreenText;
}

function playerCenterY(field: FieldSize, playerLift = 0) {
  "worklet";
  return Math.max(
    PLAYER_HEIGHT / 2,
    field.height - PLAYER_BOTTOM - playerLift - PLAYER_HEIGHT / 2,
  );
}

/** The field as the physics sees it: the walls, the spawn line and the ship. */
function arenaFor(field: FieldSize, playerLift = 0): WordFallArena {
  "worklet";
  return {
    width: field.width,
    shipX: field.width / 2,
    shipY: playerCenterY(field, playerLift),
    spawnY: START_Y,
  };
}

/** A word turns red and pulses from this far along its fall. */
const DANGER_FROM = 0.72;
/** A word's height before it is measured. */
const ESTIMATED_HALF_HEIGHT = 26;

/**
 * The player's flying saucer, in the colors of the Hujan Kata icon (shades of
 * the theme's primary). The body stays level; only the turret on the dome
 * turns to aim at the locked word.
 */
const Ship = memo(function Ship({
  aim,
}: {
  aim: ReturnType<typeof useAnimatedStyle>;
}) {
  const { colors } = useAppTheme();
  const palette = useMemo(
    () => gameIconPalette(colors.primary),
    [colors.primary],
  );
  return (
    <View style={styles.ship}>
      <Animated.View style={[styles.shipTurret, aim]}>
        <View style={[styles.shipBarrel, { backgroundColor: palette.main }]} />
      </Animated.View>
      <View style={[styles.shipDome, { backgroundColor: palette.light }]} />
      <View style={[styles.shipBody, { backgroundColor: palette.dark }]}>
        <View style={[styles.shipLight, { backgroundColor: palette.light }]} />
        <View style={[styles.shipLight, { backgroundColor: palette.light }]} />
        <View style={[styles.shipLight, { backgroundColor: palette.light }]} />
      </View>
    </View>
  );
});

/**
 * A falling word, drawn where its body is in the physics world. It only
 * re-renders when what it shows changes; the movement is on the UI thread.
 */
const FallingWordView = memo(function FallingWordView({
  entity,
  field,
  mode,
  playerLift,
  mistyped,
  targeted,
  onPress,
  world,
  hits,
}: {
  entity: FallingWord;
  field: FieldSize;
  mode: WordFallAnswerMode;
  playerLift: SharedValue<number>;
  mistyped: string;
  /** The word the ship is aiming at. */
  targeted: boolean;
  /** Tapped: the game aims at it, or uses Intip on it. */
  onPress: (id: string) => void;
  world: SharedValue<WordFallWorld>;
  /** How often each word has been hit, by id; a new hit flashes and shakes it. */
  hits: SharedValue<Record<string, number>>;
}) {
  const { colors } = useAppTheme();
  const reducedMotion = useReducedMotion();
  const hit = useSharedValue(0);
  const dangerPulse = useSharedValue(0);
  const entityId = entity.id;
  const entityColor = entity.powerUp
    ? powerUpColor(entity.powerUp, colors)
    : colors.primary;

  // The body collides at the word's real size, not the spawn estimate.
  const onSurfaceLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      world.modify((current) => {
        "worklet";
        setBodySize(current, entityId, width / 2, height / 2);
        return current;
      });
    },
    [entityId, world],
  );

  useAnimatedReaction(
    () => {
      const body = findBody(world.value, entityId);
      return body
        ? fallProgress(body, arenaFor(field, playerLift.value)) > DANGER_FROM
        : false;
    },
    (inDanger, wasInDanger) => {
      if (inDanger === wasInDanger) return;
      if (!inDanger) {
        cancelAnimation(dangerPulse);
        dangerPulse.value = 0;
        return;
      }
      // A steady warning instead of a blinking one under Reduce Motion.
      if (reducedMotion) {
        dangerPulse.value = 0.5;
        return;
      }
      dangerPulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 420, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 420, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      );
    },
  );
  useEffect(() => () => cancelAnimation(dangerPulse), [dangerPulse]);

  const animatedStyle = useAnimatedStyle(() => {
    const body = findBody(world.value, entityId);
    const shake = interpolate(
      hit.value,
      [0, 0.2, 0.4, 0.6, 0.8, 1],
      [0, -2, 2, -3, 3, 0],
    );
    // Not in the world yet (it is added a frame after the view) or already
    // gone from it (it reached the ship): nothing to show.
    return {
      opacity: body ? 1 : 0,
      transform: [
        { translateX: (body ? body.x - field.width / 2 : 0) + shake },
        { translateY: body ? body.y - body.halfHeight : START_Y },
        { rotateZ: `${body && !reducedMotion ? body.angle : 0}rad` },
        // A hit squeezes the word for a moment.
        { scale: 1 - hit.value * 0.06 },
      ],
    };
  });
  // On the UI thread: a hit never re-renders the word.
  useAnimatedReaction(
    () => hits.value[entityId] ?? 0,
    (count, previous) => {
      if (previous === null || count <= previous) return;
      cancelAnimation(hit);
      hit.value = 1;
      hit.value = withTiming(0, {
        duration: 240,
        easing: Easing.out(Easing.quad),
      });
    },
  );
  const hitStyle = useAnimatedStyle(() => ({ opacity: hit.value }));
  const dangerStyle = useAnimatedStyle(() => {
    const body = findBody(world.value, entityId);
    const progress = body
      ? fallProgress(body, arenaFor(field, playerLift.value))
      : 0;
    const proximity = Math.max(
      0,
      Math.min(1, (progress - DANGER_FROM) / (1 - DANGER_FROM)),
    );
    return {
      opacity: proximity * (0.28 + dangerPulse.value * 0.52),
      transform: [
        {
          scale: 1 + proximity * (0.018 + dangerPulse.value * 0.018),
        },
      ],
    };
  });
  const prompt = promptTextForWord(entity.word, mode);
  const answer = entity.answer;
  const answerCharacters = Array.from(answer);
  const revealedAnswer = answerCharacters.slice(0, entity.matched).join("");
  const mistypedLength = Array.from(mistyped).length;
  const hiddenStart = entity.matched + mistypedLength;
  const hiddenAnswer = answerCharacters
    .slice(hiddenStart)
    .map((character) =>
      entity.revealed || entity.warmup || character.trim() === ""
        ? character
        : "•",
    )
    .join("");

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.wordEntity, { width: field.width }, animatedStyle]}
    >
      <Pressable
        accessibilityHint="Ketuk untuk membidik kata ini"
        accessibilityLabel={
          entity.revealed || entity.warmup ? `${prompt}, ${answer}` : prompt
        }
        accessibilityRole="button"
        accessibilityState={{ selected: targeted }}
        hitSlop={8}
        onLayout={onSurfaceLayout}
        onPress={() => onPress(entityId)}
        style={[
          styles.wordSurface,
          {
            backgroundColor: colors.card,
            borderColor: targeted
              ? entityColor
              : entity.powerUp
                ? withOpacity(entityColor, 0.6)
                : colors.border,
            borderWidth: targeted ? 1.5 : StyleSheet.hairlineWidth,
            maxWidth: Math.max(0, field.width - 16),
          },
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.dangerSurface,
            {
              backgroundColor: withOpacity(colors.destructive, 0.14),
              borderColor: colors.destructive,
            },
            dangerStyle,
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.hitSurface,
            {
              backgroundColor: withOpacity(entityColor, 0.18),
              borderColor: entityColor,
            },
            hitStyle,
          ]}
        />
        {entity.powerUp ? (
          <Text style={[styles.powerUpLabel, { color: entityColor }]}>
            {powerUpLabel(entity.powerUp)}
          </Text>
        ) : null}
        <Text
          numberOfLines={mode === "KR" ? 2 : 1}
          style={[styles.term, mode === "KR" && styles.indonesianPrompt]}
        >
          <Text style={{ color: colors.foreground }}>{prompt}</Text>
        </Text>
        <Text
          numberOfLines={1}
          style={[
            styles.definition,
            mode === "KR" && styles.koreanAnswer,
            { color: colors.mutedForeground },
          ]}
        >
          <Text style={{ color: colors.primary }}>{revealedAnswer}</Text>
          {mistyped ? (
            <Text style={{ color: colors.destructive }}>{mistyped}</Text>
          ) : null}
          <Text style={{ color: colors.mutedForeground }}>{hiddenAnswer}</Text>
        </Text>
      </Pressable>
    </Animated.View>
  );
});

/** A power-up in effect, in the header: its icon and how many are left. */
function HeaderBadge({
  powerUp,
  icon,
  count,
}: {
  powerUp: WordFallPowerUp;
  icon: SymbolName;
  count?: number;
}) {
  const { colors } = useAppTheme();
  const color = powerUpColor(powerUp, colors);
  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(180)}
      accessibilityLabel={`${powerUpLabel(powerUp)}${count ? ` ${count}` : ""}`}
      style={styles.headerBadge}
    >
      <SymbolIcon name={icon} size={14} tintColor={color} weight="bold" />
      {count ? (
        <Text style={[styles.headerBadgeCount, { color }]}>{count}</Text>
      ) : null}
    </Animated.View>
  );
}

/** One line that runs out as the countdown does. */
function CountdownBar({ durationMs }: { durationMs: number }) {
  const { colors } = useAppTheme();
  const left = useSharedValue(1);
  useEffect(() => {
    left.value = withTiming(0, { duration: durationMs, easing: Easing.linear });
    return () => cancelAnimation(left);
  }, [durationMs, left]);
  const style = useAnimatedStyle(() => ({
    transform: [{ scaleX: left.value }],
  }));
  return (
    <View style={[styles.countdownTrack, { backgroundColor: colors.border }]}>
      <Animated.View
        style={[
          styles.countdownFill,
          { backgroundColor: colors.primary },
          style,
        ]}
      />
    </View>
  );
}

function levelDetail(level: number) {
  const fallSeconds = Math.round(fallDurationForLevel(level, 0.5) / 1000);
  const maxWords = maximumActiveWords(level);
  return `~${fallSeconds} dtk per kata · maks. ${maxWords} sekaligus`;
}

type GameTimer = {
  callback: () => void;
  /** Milliseconds of play left before it fires. */
  remaining: number;
  startedAt: number;
  handle?: ReturnType<typeof setTimeout>;
};

function armGameTimer(timers: Set<GameTimer>, timer: GameTimer) {
  timer.startedAt = Date.now();
  timer.handle = setTimeout(() => {
    timers.delete(timer);
    timer.callback();
  }, timer.remaining);
}

function haltGameTimer(timer: GameTimer) {
  if (timer.handle === undefined) return;
  clearTimeout(timer.handle);
  timer.handle = undefined;
  timer.remaining = Math.max(
    0,
    timer.remaining - (Date.now() - timer.startedAt),
  );
}

const COUNTDOWN_FROM = 3;
/** How long reaching a new level shows. */
const LEVEL_BANNER_MS = 1_800;
const COUNTDOWN_STEP_MS = 700;

export function LevelSelector({
  selected,
  onSelect,
}: {
  selected: number;
  onSelect: (level: number) => void;
}) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.levelSelector}>
      <Text style={[styles.levelSelectorTitle, { color: colors.foreground }]}>
        Level awal
      </Text>
      <ScrollView
        nestedScrollEnabled
        showsVerticalScrollIndicator
        style={[
          styles.levelList,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        {START_LEVEL_OPTIONS.map((option, index) => {
          const active = option === selected;
          const last = index === START_LEVEL_OPTIONS.length - 1;
          return (
            <Pressable
              key={option}
              accessibilityLabel={`Mulai dari level ${option}, ${levelDetail(option)}`}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              onPress={() => onSelect(option)}
              style={({ pressed }) => [
                styles.levelRow,
                {
                  backgroundColor: active
                    ? withOpacity(colors.primary, 0.08)
                    : "transparent",
                  borderBottomColor: colors.border,
                  borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
                  opacity: pressed ? 0.6 : 1,
                },
              ]}
            >
              <View style={styles.levelRowCopy}>
                <Text
                  style={[styles.levelRowTitle, { color: colors.foreground }]}
                >
                  Level {option}
                </Text>
                <Text
                  style={[
                    styles.levelRowDetail,
                    { color: colors.mutedForeground },
                  ]}
                >
                  {levelDetail(option)}
                </Text>
              </View>
              {active ? (
                <SymbolIcon
                  name="checkmark"
                  size={18}
                  weight="bold"
                  tintColor={colors.primary}
                />
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const WordFallHeader = memo(function WordFallHeader({
  combo,
  health,
  level,
  locked,
  onExit,
  onPause,
  phase,
  score,
  lessonTitle,
  shield,
  frozen,
  forceCharges,
}: {
  shield: number;
  frozen: boolean;
  forceCharges: number;
  combo: number;
  health: number;
  level: number;
  locked: boolean;
  onExit: () => void;
  onPause: () => void;
  phase: WordFallPhase;
  score: number;
  /** A lesson round: this title, and no lives or level. */
  lessonTitle?: string;
}) {
  const { colors } = useAppTheme();
  return (
    <>
      <GameBackToolbar disabled={locked} onPress={onExit} />
      <Stack.Screen
        options={{
          gestureEnabled: false,
          headerBackButtonDisplayMode: "minimal",
          headerBackVisible: false,
          headerShadowVisible: false,
          headerShown: true,
          title: lessonTitle ?? "",
        }}
      />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.View hidesSharedBackground>
          <View
            accessibilityLabel={
              lessonTitle
                ? `Skor ${score}, combo ${combo}`
                : `${health} nyawa, skor ${score}, level ${level}, combo ${combo}`
            }
            style={styles.headerStats}
          >
            {shield > 0 ? (
              <HeaderBadge count={shield} icon="shield.fill" powerUp="shield" />
            ) : null}
            {frozen ? <HeaderBadge icon="snowflake" powerUp="freeze" /> : null}
            {forceCharges > 0 ? (
              <HeaderBadge
                count={forceCharges}
                icon="bolt.fill"
                powerUp="force"
              />
            ) : null}
            {lessonTitle ? null : (
              <Text style={[styles.health, { color: colors.destructive }]}>
                {"♥".repeat(health)}
                {"♡".repeat(Math.max(0, STARTING_HEALTH - health))}
              </Text>
            )}
            <Text style={[styles.headerMetric, { color: colors.foreground }]}>
              {score}
            </Text>
            {lessonTitle ? null : (
              <Text
                style={[styles.headerMetric, { color: colors.mutedForeground }]}
              >
                L{level}
              </Text>
            )}
            {combo > 1 ? (
              <Text style={[styles.headerMetric, { color: colors.primary }]}>
                ×{comboMultiplier(combo).toFixed(1)}
              </Text>
            ) : null}
          </View>
        </Stack.Toolbar.View>
        <Stack.Toolbar.Button
          accessibilityLabel="Jeda game"
          disabled={phase !== "running"}
          icon={toolbarIcons.pause}
          onPress={onPause}
        />
      </Stack.Toolbar>
    </>
  );
});

export function WordFallScreen({
  words,
  onExit,
  onComplete,
  onAttempt,
  onSessionStart,
  courseId,
  sourceCourseItemId,
  vocabularySetId,
  sessionXp,
  lesson,
}: {
  words: readonly WordFallWord[];
  onExit: () => void;
  onComplete: () => unknown;
  onAttempt: (
    attempt: VocabularyAttempt,
    delivery: VocabularyAttemptDelivery,
  ) => Promise<void>;
  onSessionStart: () => string;
  courseId?: string;
  sourceCourseItemId?: string;
  /** The set played, which keeps the top score. */
  vocabularySetId?: string;
  /** XP the session has earned (the game route's reporter). */
  sessionXp?: () => number;
  /** Played as a round of a vocabulary lesson. */
  lesson?: GameLesson;
}) {
  const { colors } = useAppTheme();
  const inputRef = useRef<TextInput>(null);
  const entitiesRef = useRef<FallingWord[]>([]);
  const lockedTargetRef = useRef<string | null>(null);
  const healthRef = useRef(STARTING_HEALTH);
  const shieldRef = useRef(0);
  const forceChargesRef = useRef(0);
  const revealChargesRef = useRef(0);
  const comboRef = useRef(0);
  const mistakeActiveRef = useRef(false);
  const mistakeWordIdsRef = useRef(new Set<string>());
  /** Words that have fallen with their answer shown (warmed up). */
  const introducedIdsRef = useRef(new Set<string>());
  /** Words to drop again hidden after a miss or a typo, oldest first. */
  const retryIdsRef = useRef<string[]>([]);
  /** How often each word has been dropped again. */
  const retryCountsRef = useRef(new Map<string, number>());
  /** A lesson round's falls still to come: each word warm, then hidden. */
  const lessonQueueRef = useRef<{ wordId: string; warmup: boolean }[]>([]);
  /** The word the learner tapped: it stays the target until it is gone. */
  const pinnedTargetRef = useRef<string | null>(null);
  /** The last word that reached the ship, shown with its answer for a moment. */
  const [missed, setMissed] = useState<{
    key: string;
    prompt: string;
    answer: string;
  } | null>(null);
  const pendingReportIdsRef = useRef(new Set<string>());
  const progressSessionIdRef = useRef("");
  const completedSessionIdRef = useRef("");
  const mountedRef = useRef(true);
  const idRef = useRef(0);
  const timersRef = useRef(new Set<ReturnType<typeof setTimeout>>());
  const [phase, setPhase] = useState<WordFallPhase>("ready");
  const [field, setField] = useState<FieldSize>({ width: 0, height: 0 });
  const [entities, setEntities] = useState<FallingWord[]>([]);
  const [health, setHealth] = useState(STARTING_HEALTH);
  const [shield, setShield] = useState(0);
  const [forceCharges, setForceCharges] = useState(0);
  const [revealCharges, setRevealCharges] = useState(0);
  /** Intip is armed: the next word tapped shows its answer. */
  const [pickingReveal, setPickingReveal] = useState(false);
  const pickingRevealRef = useRef(false);
  const [score, setScore] = useState(0);
  const [destroyed, setDestroyed] = useState(0);
  const [combo, setCombo] = useState(0);
  const [reviewItems, setReviewItems] = useState<readonly WordFallReviewItem[]>(
    [],
  );
  const [input, setInput] = useState("");
  const [lockedTargetId, setLockedTargetId] = useState<string | null>(null);
  const effectsRef = useRef<WordFallEffectsHandle>(null);
  const [frozen, setFrozen] = useState(false);
  const [pendingReportCount, setPendingReportCount] = useState(0);
  // Chosen in Latihan's source sheet before the game opens; the answer
  // language can change again before "Main lagi".
  const [{ startLevel, answerMode, sound }, updateSettings] =
    useWordFallSettings();
  const playSound = useWordFallSfx(sound);
  const setAnswerMode = useCallback(
    (mode: WordFallAnswerMode) => updateSettings({ answerMode: mode }),
    [updateSettings],
  );
  const playerLift = useSharedValue(0);
  /** Every falling word's position and speed (see `physics.ts`). */
  const world = useSharedValue<WordFallWorld>(createWorld());
  const hits = useSharedValue<Record<string, number>>({});
  const syncClock = useSharedValue(0);
  const playerRecoil = useSharedValue(0);
  const wrongInputPulse = useSharedValue(0);
  const level = levelForDestroyed(destroyed);
  const reducedMotion = useReducedMotion();
  /** The input as last typed, to tell a new letter from a deleted one. */
  const typedRef = useRef("");
  useEffect(() => {
    typedRef.current = input;
  }, [input]);

  // A big blast shakes the field for a moment (not under Reduce Motion).
  const fieldShake = useSharedValue(0);
  const fieldShakeStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: fieldShake.value },
      { translateY: fieldShake.value * -0.5 },
    ],
  }));
  const shakeField = useCallback(() => {
    if (reducedMotion) return;
    cancelAnimation(fieldShake);
    fieldShake.value = withSequence(
      withTiming(6, { duration: 35 }),
      withTiming(-5, { duration: 45 }),
      withTiming(3, { duration: 45 }),
      withTiming(-2, { duration: 45 }),
      withTiming(0, { duration: 60, easing: Easing.out(Easing.quad) }),
    );
  }, [fieldShake, reducedMotion]);

  // Reaching a new level shows it for a moment, with what changes.
  const [levelBanner, setLevelBanner] = useState<number | null>(null);
  const shownLevelRef = useRef(level);
  const playerPositionStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          wrongInputPulse.value,
          [0, 0.25, 0.5, 0.75, 1],
          [0, -1, 1, -2, 0],
        ),
      },
      { translateY: playerRecoil.value - playerLift.value },
    ],
  }));
  const playerShieldPositionStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: playerRecoil.value - playerLift.value }],
  }));

  const usableWords = useMemo(
    () =>
      words
        .map((word) => ({
          ...word,
          term: cleanTypingText(word.term),
          meanings: [
            ...new Set(word.meanings.map(cleanTypingText).filter(Boolean)),
          ],
        }))
        .filter((word) => word.term && word.meanings.length > 0),
    [words],
  );

  const commitEntities = useCallback((next: FallingWord[]) => {
    entitiesRef.current = next;
    setEntities(next);
  }, []);

  const resetCombo = useCallback(() => {
    comboRef.current = 0;
    setCombo(0);
  }, []);

  const registerMistake = useCallback(
    (word?: WordFallWord) => {
      if (mistakeActiveRef.current) return;
      mistakeActiveRef.current = true;
      hapticError();
      playSound("wrong");
      if (word) mistakeWordIdsRef.current.add(word.id);
      if (word)
        setReviewItems((current) =>
          addWordFallReviewItem(current, word, "mistyped"),
        );
      resetCombo();
    },
    [playSound, resetCombo],
  );

  const schedule = useCallback((callback: () => void, delay: number) => {
    const timer = setTimeout(() => {
      timersRef.current.delete(timer);
      callback();
    }, delay);
    timersRef.current.add(timer);
    return timer;
  }, []);

  // Timers of the game itself (a power-up running out, a word bursting, the
  // missed answer leaving): a pause stops their clocks too.
  const gameTimersRef = useRef(new Set<GameTimer>());
  const gamePausedRef = useRef(false);
  const scheduleInGame = useCallback((callback: () => void, delay: number) => {
    const timer: GameTimer = { callback, remaining: delay, startedAt: 0 };
    gameTimersRef.current.add(timer);
    if (!gamePausedRef.current) armGameTimer(gameTimersRef.current, timer);
  }, []);
  useEffect(() => {
    const paused = phase === "paused";
    gamePausedRef.current = paused;
    for (const timer of gameTimersRef.current) {
      if (paused) haltGameTimer(timer);
      else if (timer.handle === undefined)
        armGameTimer(gameTimersRef.current, timer);
    }
  }, [phase]);

  const clearTimers = useCallback(() => {
    for (const timer of gameTimersRef.current) haltGameTimer(timer);
    gameTimersRef.current.clear();
    for (const timer of timersRef.current) clearTimeout(timer);
    timersRef.current.clear();
  }, []);

  useEffect(
    () => () => {
      mountedRef.current = false;
      clearTimers();
    },
    [clearTimers],
  );

  useEffect(() => {
    const previous = shownLevelRef.current;
    if (level === previous) return;
    shownLevelRef.current = level;
    // A lesson has no levels; a new game starting lower is no level-up.
    if (lesson || phase !== "running" || level < previous) return;
    setLevelBanner(level);
    playSound("level");
    schedule(
      () => setLevelBanner((current) => (current === level ? null : current)),
      LEVEL_BANNER_MS,
    );
  }, [lesson, level, phase, playSound, schedule]);

  const exit = useGameExitGuard({
    active: phase === "running",
    locked: pendingReportCount > 0,
    onExit,
  });

  useEffect(() => {
    const sessionId = progressSessionIdRef.current;
    if (
      phase !== "gameover" ||
      pendingReportCount !== 0 ||
      !sessionId ||
      completedSessionIdRef.current === sessionId
    )
      return;
    completedSessionIdRef.current = sessionId;
    void onComplete();
  }, [onComplete, pendingReportCount, phase]);

  const focusInput = useCallback(() => {
    schedule(() => inputRef.current?.focus(), 120);
  }, [schedule]);
  const focusInputOnAndroid = useCallback(() => {
    if (Platform.OS !== "ios") focusInput();
  }, [focusInput]);
  const setLockedTarget = useCallback((id: string | null) => {
    lockedTargetRef.current = id;
    setLockedTargetId(id);
  }, []);

  const lockedTarget = entities.find(
    (entity) => entity.id === lockedTargetId && !entity.completed,
  );
  const unmatchedInput = !lockedTarget && input ? input : "";
  const liftRef = useRef(0);
  useEffect(() => {
    liftRef.current = unmatchedInput ? MISTAKE_PLAYER_LIFT : 0;
    playerLift.value = withTiming(unmatchedInput ? MISTAKE_PLAYER_LIFT : 0, {
      duration: 160,
      easing: Easing.out(Easing.cubic),
    });
    return () => cancelAnimation(playerLift);
  }, [playerLift, unmatchedInput]);
  useEffect(() => {
    if (!unmatchedInput) {
      wrongInputPulse.value = 0;
      return;
    }
    cancelAnimation(wrongInputPulse);
    wrongInputPulse.value = 1;
    wrongInputPulse.value = withTiming(0, {
      duration: 180,
      easing: Easing.out(Easing.quad),
    });
  }, [unmatchedInput, wrongInputPulse]);
  const lockedBodyId = lockedTarget?.id;
  const playerRotationStyle = useAnimatedStyle(() => {
    const arena = arenaFor(field, playerLift.value);
    const body = lockedBodyId ? findBody(world.value, lockedBodyId) : undefined;
    const angle = body
      ? Math.atan2(body.x - arena.shipX, arena.shipY - body.y)
      : 0;
    return { transform: [{ rotateZ: `${angle}rad` }] };
  });
  const lockedTyping = lockedTarget
    ? analyzeTyping(lockedTarget.answer, input, lockedTarget.matched)
    : undefined;
  const mistyped =
    lockedTyping?.mistake && lockedTarget
      ? Array.from(input).slice(lockedTyping.correctCharacters).join("")
      : "";

  /**
   * Where each word was a moment ago, copied from the physics world a few
   * times a second. Reading a shared value from this thread waits for the UI
   * thread; the game logic reads this copy instead, on every key press.
   */
  const positionsRef = useRef(new Map<string, WordPosition>());
  const syncPositions = useCallback((positions: readonly WordPosition[]) => {
    const next = new Map<string, WordPosition>();
    for (const position of positions) next.set(position.id, position);
    // A word spawned since the copy was made keeps where it started.
    for (const entity of entitiesRef.current) {
      const known = positionsRef.current.get(entity.id);
      if (known && !next.has(entity.id)) next.set(entity.id, known);
    }
    positionsRef.current = next;
  }, []);
  const bodyPoint = useCallback(
    (id: string) => positionsRef.current.get(id),
    [],
  );
  /** The ship's place, without asking the UI thread for its lift. */
  const shipPoint = useCallback(
    () => ({
      x: field.width / 2,
      y: playerCenterY(field, liftRef.current),
    }),
    [field],
  );

  /** A shot reached its word: it is knocked back, if it is still falling. */
  const handleHit = useCallback(
    (projectile: Shot) => {
      if (
        !entitiesRef.current.some((entity) => entity.id === projectile.targetId)
      )
        return false;
      hapticImpact("light");
      const { targetId, pushStrength, offset, from, to } = projectile;
      // Pushed the way the shot was going.
      const direction = { x: to.x - from.x, y: to.y - from.y };
      world.modify((current) => {
        "worklet";
        knockBack(current, targetId, pushStrength, direction, offset);
        return current;
      });
      hits.modify((current) => {
        "worklet";
        current[targetId] = (current[targetId] ?? 0) + 1;
        return current;
      });
      return true;
    },
    [hits, world],
  );

  const clearTargetInput = useCallback(
    (id: string) => {
      if (pinnedTargetRef.current === id) pinnedTargetRef.current = null;
      if (lockedTargetRef.current !== id) return;
      setLockedTarget(null);
      setInput("");
    },
    [setLockedTarget],
  );

  const endGame = useCallback(() => {
    setPhase("gameover");
    Keyboard.dismiss();
  }, []);

  /**
   * One attempt per fall. A fall with its answer showing (warm-up, Intip)
   * counts as recognising the word, not recalling it, so it never makes the
   * word learned on its own.
   */
  const reportWord = useCallback(
    (
      entity: FallingWord,
      result: "CORRECT" | "INCORRECT",
      answerShown: boolean,
    ) => {
      const entryId = entity.word.id;
      const sessionId = progressSessionIdRef.current;
      const delivery = {
        attemptId: `${sessionId}:${entryId}:${entity.id}`,
        sessionId,
      };
      pendingReportIdsRef.current.add(delivery.attemptId);
      setPendingReportCount(pendingReportIdsRef.current.size);
      function send() {
        void onAttempt(
          {
            entryId,
            evidence: answerShown ? "RECOGNITION" : "RECALL",
            result,
          },
          delivery,
        )
          .then(() => {
            pendingReportIdsRef.current.delete(delivery.attemptId);
            if (mountedRef.current)
              setPendingReportCount(pendingReportIdsRef.current.size);
          })
          .catch(() => {
            if (
              mountedRef.current &&
              progressSessionIdRef.current === sessionId
            )
              schedule(send, 2_000);
          });
      }
      send();
    },
    [onAttempt, schedule],
  );

  const queueRetry = useCallback(
    (wordId: string) => {
      const count = retryCountsRef.current.get(wordId) ?? 0;
      if (count >= MAX_RETRIES) return;
      retryCountsRef.current.set(wordId, count + 1);
      if (lesson) lessonQueueRef.current.push({ wordId, warmup: false });
      else if (!retryIdsRef.current.includes(wordId))
        retryIdsRef.current.push(wordId);
    },
    [lesson],
  );

  const handleImpact = useCallback(
    (id: string) => {
      const entity = entitiesRef.current.find((item) => item.id === id);
      if (!entity || entity.completed) return;
      // A word that reaches the ship counts as wrong, and blows up on it:
      // the words around are thrown back up, which buys a moment to type.
      hapticError();
      playSound("lost");
      playSound("blast");
      const ship = shipPoint();
      effectsRef.current?.burst(ship, colors.destructive, {
        blast: SHIP_BLAST.radius,
      });
      world.modify((current) => {
        "worklet";
        explode(
          current,
          ship.x,
          ship.y,
          SHIP_BLAST.radius,
          SHIP_BLAST.strength,
        );
        return current;
      });
      commitEntities(entitiesRef.current.filter((item) => item.id !== id));
      clearTargetInput(id);
      setReviewItems((current) =>
        addWordFallReviewItem(current, entity.word, "missed"),
      );
      const answerShown = entity.answerSeen;
      reportWord(entity, "INCORRECT", answerShown);
      if (!entity.warmup) queueRetry(entity.word.id);
      mistakeActiveRef.current = false;
      resetCombo();
      // What the word meant, beside the ship for a moment.
      setMissed({
        key: entity.id,
        prompt: promptTextForWord(entity.word, answerMode),
        answer: entity.answer,
      });
      scheduleInGame(
        () =>
          setMissed((current) => (current?.key === entity.id ? null : current)),
        MISSED_ANSWER_MS,
      );
      if (lesson) return;
      if (shieldRef.current > 0) {
        shieldRef.current -= 1;
        setShield(shieldRef.current);
        return;
      }
      const nextHealth = Math.max(0, healthRef.current - 1);
      healthRef.current = nextHealth;
      setHealth(nextHealth);
      if (nextHealth === 0) endGame();
    },
    [
      answerMode,
      clearTargetInput,
      colors.destructive,
      commitEntities,
      endGame,
      lesson,
      playSound,
      queueRetry,
      reportWord,
      resetCombo,
      scheduleInGame,
      shipPoint,
      world,
    ],
  );

  const applyPowerUp = useCallback(
    (powerUp: WordFallPowerUp | undefined) => {
      if (!powerUp) return;
      playSound("powerup");
      if (powerUp === "shield") {
        shieldRef.current = Math.min(2, shieldRef.current + 1);
        setShield(shieldRef.current);
        return;
      }
      if (powerUp === "heart") {
        healthRef.current = Math.min(MAX_HEALTH, healthRef.current + 1);
        setHealth(healthRef.current);
        return;
      }
      if (powerUp === "force") {
        forceChargesRef.current = Math.min(
          MAX_FORCE_CHARGES,
          forceChargesRef.current + FORCE_REWARD_CHARGES,
        );
        setForceCharges(forceChargesRef.current);
        return;
      }
      if (powerUp === "freeze") {
        setFrozen(true);
        scheduleInGame(() => setFrozen(false), 2_500);
        return;
      }
      if (powerUp === "reveal") {
        revealChargesRef.current = Math.min(
          MAX_REVEAL_CHARGES,
          revealChargesRef.current + 1,
        );
        setRevealCharges(revealChargesRef.current);
        return;
      }
    },
    [playSound, scheduleInGame],
  );

  const setRevealPicking = useCallback((picking: boolean) => {
    pickingRevealRef.current = picking;
    setPickingReveal(picking);
  }, []);
  /** The Intip button: arms it (the next word tapped is shown), or disarms. */
  const toggleReveal = useCallback(() => {
    if (phase !== "running" || revealChargesRef.current <= 0) return;
    setRevealPicking(!pickingRevealRef.current);
    focusInput();
  }, [focusInput, phase, setRevealPicking]);

  /**
   * A word was tapped. With Intip armed it shows its answer for the rest of
   * its fall; otherwise the ship aims at it and stays on it, and tapping it
   * again lets the game pick the target as before.
   */
  const handleWordPress = useCallback(
    (id: string) => {
      if (phase !== "running") return;
      const entity = entitiesRef.current.find((item) => item.id === id);
      if (!entity || entity.completed) return;
      if (pickingRevealRef.current) {
        setRevealPicking(false);
        if (revealChargesRef.current <= 0 || entity.revealed) return;
        revealChargesRef.current -= 1;
        setRevealCharges(revealChargesRef.current);
        commitEntities(
          entitiesRef.current.map((item) =>
            item.id === id
              ? { ...item, revealed: true, answerSeen: true }
              : item,
          ),
        );
        playSound("powerup");
        return;
      }
      hapticImpact("light");
      const unpin = pinnedTargetRef.current === id;
      const previous = lockedTargetRef.current;
      pinnedTargetRef.current = unpin ? null : id;
      mistakeActiveRef.current = false;
      typedRef.current = "";
      setInput("");
      setLockedTarget(unpin ? null : id);
      // What was typed at another word is dropped with the switch.
      if (previous)
        commitEntities(
          entitiesRef.current.map((item) =>
            item.id === previous && !item.completed
              ? { ...item, matched: 0 }
              : item,
          ),
        );
    },
    [commitEntities, phase, playSound, setLockedTarget, setRevealPicking],
  );

  const finishWord = useCallback(
    (id: string) => {
      const entity = entitiesRef.current.find((item) => item.id === id);
      if (!entity) return;
      const at = bodyPoint(id);
      // A streak makes a bigger blast, which throws the words next to it aside.
      const blast = blastForCombo(
        entity.comboAtCompletion,
        Boolean(entity.powerUp),
      );
      if (at)
        effectsRef.current?.burst(
          { x: at.x, y: at.y },
          entity.powerUp
            ? powerUpColor(entity.powerUp, colors)
            : colors.primary,
          { blast: blast.radius },
        );
      playSound(blast.big ? "blastBig" : "blast");
      if (blast.big) {
        hapticImpact("heavy");
        shakeField();
      }
      world.modify((current) => {
        "worklet";
        removeBody(current, id);
        if (at) explode(current, at.x, at.y, blast.radius, blast.strength);
        return current;
      });
      commitEntities(entitiesRef.current.filter((item) => item.id !== id));
      const points = pointsForWord(
        entity.answer,
        level,
        entity.comboAtCompletion,
      );
      setScore((current) => current + points);
      // What it was worth, rising from where it was.
      if (at)
        effectsRef.current?.burst(
          { x: at.x, y: at.y - at.halfHeight },
          colors.foreground,
          { points },
        );
      setDestroyed((current) => current + 1);
      const result = wordFallResult(
        mistakeWordIdsRef.current.has(entity.word.id),
      );
      const answerShown = entity.answerSeen;
      reportWord(entity, result, answerShown);
      if (result === "INCORRECT" && !entity.warmup) queueRetry(entity.word.id);
      else if (result === "CORRECT" && !answerShown)
        retryIdsRef.current = retryIdsRef.current.filter(
          (id) => id !== entity.word.id,
        );
      applyPowerUp(entity.powerUp);
    },
    [
      answerMode,
      applyPowerUp,
      bodyPoint,
      shakeField,
      colors,
      commitEntities,
      level,
      queueRetry,
      reportWord,
      world,
    ],
  );

  const spawnWord = useCallback(() => {
    if (!field.width || !field.height || usableWords.length === 0) return;
    const current = entitiesRef.current;
    if (
      current.length >=
      (lesson ? LESSON_MAX_ACTIVE_WORDS : maximumActiveWords(level))
    )
      return;
    const onScreen = (wordId: string) =>
      current.some((entity) => entity.word.id === wordId);
    const byId = (wordId: string) =>
      usableWords.find((candidate) => candidate.id === wordId);
    let word: WordFallWord | undefined;
    let warmup: boolean;
    if (lesson) {
      // The next fall in line whose word is not on screen already.
      const queue = lessonQueueRef.current;
      const index = queue.findIndex((fall) => !onScreen(fall.wordId));
      if (index < 0) return;
      const [fall] = queue.splice(index, 1);
      word = byId(fall!.wordId);
      warmup = fall!.warmup;
    } else {
      // A word to try again first, then any word not on screen.
      const retryId = retryIdsRef.current.find((id) => !onScreen(id));
      if (retryId) {
        retryIdsRef.current = retryIdsRef.current.filter(
          (id) => id !== retryId,
        );
        word = byId(retryId);
      } else {
        const unused = usableWords.filter(
          (candidate) => !onScreen(candidate.id),
        );
        const pool = unused.length > 0 ? unused : usableWords;
        word = pool[Math.floor(Math.random() * pool.length)];
      }
      warmup = Boolean(word && !introducedIdsRef.current.has(word.id));
    }
    if (!word) return;
    if (warmup) introducedIdsRef.current.add(word.id);
    // A fresh fall: a typo on an earlier fall of this word no longer counts.
    mistakeWordIdsRef.current.delete(word.id);
    const duration = lesson ? LESSON_FALL_MS : fallDurationForLevel(level);
    const prompt = promptTextForWord(word, answerMode);
    const answer = answerTextForWord(word, answerMode);
    const estimatedWidth = Math.min(
      field.width - 16,
      Math.max(
        32,
        Array.from(prompt).length * (answerMode === "ID" ? 20 : 12),
        Array.from(answer).length * (answerMode === "KR" ? 14 : 7),
      ),
    );
    const half = estimatedWidth / 2 + 4;
    const availableWidth = Math.max(0, field.width - half * 2);
    const entity: FallingWord = {
      id: `word-${++idRef.current}`,
      word,
      answer,
      matched: 0,
      completed: false,
      powerUp: powerUpForRoll(Math.random()),
      warmup,
      answerSeen: warmup,
    };
    const body = {
      id: entity.id,
      x: half + Math.random() * availableWidth,
      y: START_Y,
      halfWidth: estimatedWidth / 2,
      halfHeight: ESTIMATED_HALF_HEIGHT,
      mass: massForAnswer(Array.from(answer).length),
      cruise: cruiseSpeed(arenaFor(field), duration),
    };
    positionsRef.current.set(body.id, body);
    world.modify((current) => {
      "worklet";
      addBody(current, body);
      return current;
    });
    commitEntities([...current, entity]);
  }, [answerMode, commitEntities, field, lesson, level, usableWords, world]);

  useEffect(() => {
    if (phase !== "running" || frozen || !field.width || !field.height) return;
    spawnWord();
    const timer = setInterval(spawnWord, spawnIntervalForLevel(level));
    return () => clearInterval(timer);
  }, [field.height, field.width, frozen, level, phase, spawnWord]);

  // The words move only while this runs: a pause or Beku stops the world
  // where it is, and it goes on from there.
  // Memoized: a new callback is registered again, which drops a frame.
  const stepFrame = useCallback(
    (frame: FrameInfo) => {
      "worklet";
      const elapsed = frame.timeSincePreviousFrame;
      if (elapsed === null) return;
      const arena = arenaFor(field, playerLift.value);
      syncClock.value += elapsed;
      const sync = syncClock.value >= POSITION_SYNC_MS;
      if (sync) syncClock.value = 0;
      world.modify((current) => {
        "worklet";
        stepWorld(current, elapsed / 1000, arena);
        if (sync || current.impacted.length > 0)
          runOnJS(syncPositions)(
            current.bodies.map((body) => ({
              id: body.id,
              x: body.x,
              y: body.y,
              halfWidth: body.halfWidth,
              halfHeight: body.halfHeight,
            })),
          );
        for (const id of current.impacted) runOnJS(handleImpact)(id);
        return current;
      });
    },
    [field, handleImpact, playerLift, syncClock, syncPositions, world],
  );
  const simulation = useFrameCallback(stepFrame, false);
  const simulating =
    phase === "running" && !frozen && field.width > 0 && field.height > 0;
  useEffect(() => {
    simulation.setActive(simulating);
  }, [simulating, simulation]);

  const resetGame = useCallback(() => {
    clearTimers();
    cancelAnimation(playerRecoil);
    playerRecoil.value = 0;
    entitiesRef.current = [];
    world.value = createWorld();
    positionsRef.current = new Map();
    lockedTargetRef.current = null;
    healthRef.current = STARTING_HEALTH;
    shieldRef.current = 0;
    forceChargesRef.current = 0;
    revealChargesRef.current = 0;
    comboRef.current = 0;
    mistakeActiveRef.current = false;
    mistakeWordIdsRef.current.clear();
    introducedIdsRef.current.clear();
    retryIdsRef.current = [];
    retryCountsRef.current.clear();
    pinnedTargetRef.current = null;
    pickingRevealRef.current = false;
    // A lesson drops every word with its answer first, then each hidden.
    lessonQueueRef.current = lesson
      ? [
          ...usableWords.map((word) => ({ wordId: word.id, warmup: true })),
          ...shuffledWords(usableWords).map((word) => ({
            wordId: word.id,
            warmup: false,
          })),
        ]
      : [];
    setMissed(null);
    setLevelBanner(null);
    setEntities([]);
    effectsRef.current?.clear();
    hits.value = {};
    setHealth(STARTING_HEALTH);
    setShield(0);
    setForceCharges(0);
    setRevealCharges(0);
    setPickingReveal(false);
    setScore(0);
    setDestroyed(destroyedForLevel(startLevel));
    setCombo(0);
    setReviewItems([]);
    setInput("");
    setLockedTargetId(null);
    setFrozen(false);
    progressSessionIdRef.current = onSessionStart();
    setPhase("running");
    focusInputOnAndroid();
  }, [
    clearTimers,
    focusInputOnAndroid,
    lesson,
    onSessionStart,
    playerRecoil,
    startLevel,
    usableWords,
    world,
  ]);

  const pauseGame = useCallback(() => {
    if (phase !== "running") return;
    setPhase("paused");
    Keyboard.dismiss();
  }, [phase]);

  const resumeGame = useCallback(() => {
    setPhase("running");
    focusInputOnAndroid();
  }, [focusInputOnAndroid]);

  // Resuming or playing again from the sheet: it is still closing on iOS,
  // so the input takes focus once it is gone.
  const fromSheet = useCallback(
    (action: () => void) => () => {
      action();
      if (Platform.OS === "ios") schedule(() => inputRef.current?.focus(), 500);
    },
    [schedule],
  );
  const answered = Math.max(0, destroyed - destroyedForLevel(startLevel));

  // A lesson round starts at once. Opened from Latihan (whose source sheet
  // took the settings), words start falling after a 3-2-1.
  const [countdown, setCountdown] = useState<number | null>(
    lesson ? 0 : COUNTDOWN_FROM,
  );
  const fieldMeasured = field.width > 0 && field.height > 0;
  useEffect(() => {
    if (countdown === null) return;
    // Words fall toward the ship, which needs the field's size: wait for it
    // (a lesson round starts at once, while the last round's keyboard moves).
    if (countdown === 0 && !fieldMeasured) return;
    if (countdown > 0) {
      const timer = setTimeout(
        () => setCountdown((current) => (current ? current - 1 : 0)),
        COUNTDOWN_STEP_MS,
      );
      return () => clearTimeout(timer);
    }
    setCountdown(null);
    resetGame();
    if (Platform.OS === "ios") focusInput();
  }, [countdown, fieldMeasured, focusInput, resetGame]);

  // It ends once every word has fallen and been shot down or missed, and
  // every answer is saved.
  const lessonDone = useRef(false);
  useEffect(() => {
    if (
      !lesson ||
      lessonDone.current ||
      phase !== "running" ||
      lessonQueueRef.current.length > 0 ||
      entities.length > 0 ||
      pendingReportCount > 0
    )
      return;
    lessonDone.current = true;
    Keyboard.dismiss();
    void onComplete();
    lesson.onRoundComplete();
  }, [entities.length, lesson, onComplete, pendingReportCount, phase]);

  const handleInput = useCallback(
    (value: string) => {
      if (phase !== "running") return;
      // The nearest matching word is the target.
      const shipY = shipPoint().y;
      const targetId =
        lockedTargetRef.current ??
        selectWordTarget(
          entitiesRef.current
            .filter((entity) => !entity.completed)
            .flatMap((entity) =>
              answerOptionsForWord(entity.word, answerMode).map((answer) => ({
                id: entity.id,
                answer,
                distance: shipY - (bodyPoint(entity.id)?.y ?? START_Y),
              })),
            ),
          value,
        );
      const target = entitiesRef.current.find(
        (entity) => entity.id === targetId && !entity.completed,
      );
      if (!target) {
        setInput(value);
        pinnedTargetRef.current = null;
        if (value) registerMistake();
        else {
          mistakeActiveRef.current = false;
          setLockedTarget(null);
        }
        return;
      }
      const answer = bestTypingAnswer(
        answerOptionsForWord(target.word, answerMode),
        value,
        target.answer,
      );
      const analysis = analyzeTyping(answer, value, target.matched);
      setInput(value);
      // A tapped target stays the target with nothing typed.
      if (value.length > 0 || pinnedTargetRef.current === target.id)
        setLockedTarget(target.id);
      else setLockedTarget(null);
      if (analysis.mistake) registerMistake(target.word);
      else mistakeActiveRef.current = false;

      // A new wrong letter flies at the word and glances off it.
      const typedLonger =
        Array.from(value).length > Array.from(typedRef.current).length;
      typedRef.current = value;
      if (analysis.mistake && typedLonger) {
        const from = { x: field.width / 2, y: shipY };
        const hit = bodyPoint(target.id);
        const offset = Math.random() * 1.6 - 0.8;
        const miss: Shot = {
          targetId: target.id,
          character: Array.from(value).at(-1) ?? "",
          color: colors.destructive,
          from,
          to: hit
            ? {
                x: hit.x + offset * hit.halfWidth * 0.7,
                y: hit.y + hit.halfHeight * 0.6,
              }
            : from,
          pushStrength: 0,
          offset,
          miss: true,
        };
        effectsRef.current?.shoot([miss]);
      }

      if (
        (analysis.correctCharacters !== target.matched ||
          answer !== target.answer) &&
        !analysis.mistake
      ) {
        const next = entitiesRef.current.map((entity) =>
          entity.id === target.id
            ? { ...entity, answer, matched: analysis.correctCharacters }
            : entity,
        );
        commitEntities(next);
      }

      if (analysis.gainedCharacters > 0) {
        const answerCharacters = Array.from(answer);
        const gainedCharacters = answerCharacters.slice(
          target.matched,
          analysis.correctCharacters,
        );
        const from = { x: field.width / 2, y: shipY };
        const hit = bodyPoint(target.id);
        const boostedShots = Math.min(
          forceChargesRef.current,
          gainedCharacters.length,
        );
        if (boostedShots > 0) {
          forceChargesRef.current -= boostedShots;
          setForceCharges(forceChargesRef.current);
        }
        const recoilDistance = Math.min(
          9,
          4 +
            Math.max(0, gainedCharacters.length - 1) +
            (boostedShots > 0 ? 2 : 0),
        );
        cancelAnimation(playerRecoil);
        playerRecoil.value = withSequence(
          withTiming(recoilDistance, {
            duration: 50,
            easing: Easing.out(Easing.quad),
          }),
          withTiming(0, {
            duration: 150,
            easing: Easing.out(Easing.cubic),
          }),
        );
        const shots = gainedCharacters.map((character, index) => {
          // Each letter hits somewhere along the word, so it rocks unevenly.
          const offset = Math.random() * 1.8 - 0.9;
          return {
            targetId: target.id,
            character,
            color: target.powerUp
              ? powerUpColor(target.powerUp, colors)
              : colors.primary,
            from,
            to: hit
              ? { x: hit.x + offset * hit.halfWidth * 0.8, y: hit.y }
              : from,
            pushStrength: shotImpulseForLevel(level, index < boostedShots),
            offset,
          };
        });
        effectsRef.current?.shoot(shots);
        playSound("shot");
      }

      if (analysis.completed) {
        hapticSuccess();
        const nextCombo = comboRef.current + 1;
        comboRef.current = nextCombo;
        setCombo(nextCombo);
        const next = entitiesRef.current.map((entity) =>
          entity.id === target.id
            ? {
                ...entity,
                answer,
                matched: Array.from(answer).length,
                comboAtCompletion: nextCombo,
                completed: true,
              }
            : entity,
        );
        commitEntities(next);
        if (pinnedTargetRef.current === target.id)
          pinnedTargetRef.current = null;
        // It stops where it was hit until it bursts.
        const completedId = target.id;
        world.modify((current) => {
          "worklet";
          holdBody(current, completedId);
          return current;
        });
        setInput("");
        setLockedTarget(null);
        scheduleInGame(() => finishWord(target.id), 540);
      }
    },
    [
      answerMode,
      bodyPoint,
      commitEntities,
      colors,
      field,
      finishWord,
      level,
      phase,
      playerLift,
      playerRecoil,
      registerMistake,
      scheduleInGame,
      setLockedTarget,
      world,
    ],
  );

  // The app draws edge to edge, so Android does not resize the window for
  // the keyboard: the board shrinks above it here, as on iOS. The keyboard's
  // top comes in window coordinates and the avoiding view's frame relative to
  // this screen, which starts below the status bar and header on Android.
  const screenRef = useRef<View>(null);
  const [keyboardVerticalOffset, setKeyboardVerticalOffset] = useState(0);
  const measureScreenOffset = useCallback(() => {
    if (Platform.OS !== "android") return;
    screenRef.current?.measureInWindow((_x, y) => {
      setKeyboardVerticalOffset((current) =>
        Math.abs(current - y) < 1 ? current : y,
      );
    });
  }, []);

  const onFieldLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setField((current) =>
      Math.abs(current.width - width) < 1 &&
      Math.abs(current.height - height) < 1
        ? current
        : { width, height },
    );
  }, []);

  return (
    <View
      ref={screenRef}
      collapsable={false}
      onLayout={measureScreenOffset}
      style={[styles.screen, { backgroundColor: colors.background }]}
    >
      <KeyboardAvoidingView
        behavior="padding"
        keyboardVerticalOffset={keyboardVerticalOffset}
        style={styles.screen}
      >
        <WordFallHeader
          combo={combo}
          health={health}
          level={level}
          locked={pendingReportCount > 0}
          onExit={exit}
          onPause={pauseGame}
          phase={phase}
          score={score}
          lessonTitle={lesson?.title}
          shield={shield}
          frozen={frozen}
          forceCharges={forceCharges}
        />
        <TextInput
          ref={inputRef}
          accessibilityLabel={`Ketik ${answerMode === "ID" ? "arti dalam bahasa Indonesia" : "kata Koreanya"}`}
          autoCapitalize="none"
          autoCorrect={false}
          caretHidden
          editable={isWordFallInputEditable(phase)}
          onChangeText={handleInput}
          spellCheck={false}
          submitBehavior="submit"
          style={styles.hiddenInput}
          value={input}
        />

        <Animated.View
          onLayout={onFieldLayout}
          style={[styles.field, fieldShakeStyle]}
        >
          <WordFallBackdrop
            color={colors.foreground}
            height={field.height}
            lineBottom={PLAYER_BOTTOM + PLAYER_SIZE / 2}
            lineColor={withOpacity(colors.primary, 0.3)}
            moving={simulating}
            width={field.width}
          />
          {entities.map((entity) => (
            <FallingWordView
              key={entity.id}
              entity={entity}
              field={field}
              mode={answerMode}
              mistyped={entity.id === lockedTargetId ? mistyped : ""}
              playerLift={playerLift}
              hits={hits}
              onPress={handleWordPress}
              targeted={entity.id === lockedTargetId && !entity.completed}
              world={world}
            />
          ))}
          <WordFallEffects onHit={handleHit} ref={effectsRef} />

          {/* The word that got through, at the top where nothing is typed. */}
          <View pointerEvents="none" style={styles.missedRow}>
            {missed ? (
              <Animated.View
                key={missed.key}
                entering={FadeInUp.duration(240)}
                exiting={FadeOut.duration(320)}
                accessibilityLiveRegion="polite"
                accessibilityLabel={`Hafalkan: ${missed.prompt} artinya ${missed.answer}`}
                style={[
                  styles.missedCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: withOpacity(colors.destructive, 0.5),
                  },
                ]}
              >
                <Text
                  style={[styles.missedLabel, { color: colors.destructive }]}
                >
                  Hafalkan ini
                </Text>
                <Text
                  numberOfLines={1}
                  style={[styles.missedPrompt, { color: colors.foreground }]}
                >
                  {missed.prompt}
                </Text>
                <Text
                  numberOfLines={2}
                  style={[styles.missedText, { color: colors.mutedForeground }]}
                >
                  {missed.answer}
                </Text>
              </Animated.View>
            ) : null}
          </View>
          {/* Centred by layout, not by the measured field, so the ship sits
            bottom centre even before (or without) a fresh measurement. */}
          <View pointerEvents="box-none" style={styles.playerRow}>
            <Animated.View
              accessibilityLabel="Pemain"
              style={[styles.player, playerPositionStyle]}
            >
              <Ship aim={playerRotationStyle} />
              {unmatchedInput ? (
                <Text
                  numberOfLines={1}
                  style={[styles.unmatchedInput, { color: colors.destructive }]}
                >
                  {unmatchedInput}
                </Text>
              ) : null}
            </Animated.View>
          </View>
          {shield > 0 ? (
            <View pointerEvents="none" style={styles.playerShieldRow}>
              <Animated.View
                style={[
                  styles.playerShield,
                  { borderColor: powerUpColor("shield", colors) },
                  playerShieldPositionStyle,
                ]}
              />
            </View>
          ) : null}
          {revealCharges > 0 && phase === "running" ? (
            <Pressable
              accessibilityHint="Lalu ketuk kata yang jawabannya ingin kamu lihat"
              accessibilityLabel={`Intip jawaban, sisa ${revealCharges}`}
              accessibilityRole="button"
              accessibilityState={{ selected: pickingReveal }}
              onPress={toggleReveal}
              style={({ pressed }) => [
                styles.revealButton,
                {
                  backgroundColor: pickingReveal
                    ? powerUpColor("reveal", colors)
                    : withOpacity(powerUpColor("reveal", colors), 0.16),
                  borderColor: powerUpColor("reveal", colors),
                  opacity: pressed ? 0.6 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.revealButtonText,
                  {
                    color: pickingReveal
                      ? colors.background
                      : powerUpColor("reveal", colors),
                  },
                ]}
              >
                {pickingReveal
                  ? "Ketuk sebuah kata"
                  : `${powerUpLabel("reveal")} ×${revealCharges}`}
              </Text>
            </Pressable>
          ) : null}
        </Animated.View>

        {levelBanner ? (
          <View pointerEvents="none" style={styles.levelBanner}>
            <Animated.View
              key={levelBanner}
              entering={FadeInUp.duration(260)}
              exiting={FadeOut.duration(320)}
              accessibilityLiveRegion="polite"
              accessibilityLabel={`Naik ke level ${levelBanner}`}
              style={[
                styles.levelPill,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.levelPillTitle, { color: colors.primary }]}>
                Level {levelBanner}
              </Text>
              <Text
                style={[
                  styles.levelPillDetail,
                  { color: colors.mutedForeground },
                ]}
              >
                {levelDetail(levelBanner)}
              </Text>
            </Animated.View>
          </View>
        ) : null}

        {countdown ? (
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(200)}
            pointerEvents="none"
            style={styles.countdown}
          >
            {/* Keyed by the number: one fades out as the next fades in. */}
            <View style={styles.countdownNumberBox}>
              <Animated.Text
                key={countdown}
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(140)}
                style={[styles.countdownNumber, { color: colors.foreground }]}
              >
                {countdown}
              </Animated.Text>
            </View>
            <CountdownBar durationMs={COUNTDOWN_FROM * COUNTDOWN_STEP_MS} />
            <Text
              style={[styles.countdownHint, { color: colors.mutedForeground }]}
            >
              {answerMode === "ID"
                ? "Ketik arti kata yang jatuh"
                : "Ketik kata Korea dari arti yang jatuh"}
            </Text>
          </Animated.View>
        ) : null}
        {/* Pausing opens the same sheet the round ends on. Closing it any way
          but "Keluar" goes on with the round. */}
        {phase === "paused" ? (
          <GameResultSheet
            eyebrow="Hujan kata"
            title="Dijeda"
            mark={{ value: String(score), label: "poin" }}
            facts={[
              { icon: "flame.fill", text: `Level ${level}` },
              {
                icon: sound ? "speaker.fill" : "speaker.slash.fill",
                text: sound ? "Suara: nyala" : "Suara: mati",
                accessibilityHint: "Nyalakan atau matikan efek suara",
                onPress: () => updateSettings({ sound: !sound }),
              },
            ]}
            primary={{
              eyebrow: "Lanjutkan",
              title: "Kembali ke permainan",
              meta: "Kata yang sedang jatuh menunggumu",
              pill: "Lanjut",
              onPress: fromSheet(resumeGame),
            }}
            secondary={{
              label: "Keluar",
              onPress: exit,
              disabled: pendingReportCount > 0,
            }}
            onDismiss={fromSheet(resumeGame)}
          />
        ) : null}
        {/* In Latihan the round ends on the sheet; a lesson goes on instead. */}
        {phase === "gameover" && !lesson ? (
          <GameResultSheet
            courseId={courseId}
            courseItemId={sourceCourseItemId}
            xp={sessionXp?.()}
            // Endless: the top score on this set is the record to beat.
            best={
              vocabularySetId
                ? { scope: `word-fall:${vocabularySetId}`, value: score }
                : undefined
            }
            eyebrow="Hujan kata"
            title={`Sampai level ${level}`}
            mark={{ value: String(score), label: "poin" }}
            facts={[
              { icon: "checkmark.seal.fill", text: `${answered} kata dijawab` },
              {
                icon: "keyboard.fill",
                text: answerMode === "ID" ? "Jawab: Indonesia" : "Jawab: Korea",
                accessibilityHint: "Ganti bahasa jawaban ronde berikutnya",
                onPress: () => setAnswerMode(answerMode === "ID" ? "KR" : "ID"),
              },
            ]}
            review={{
              title: "Perlu diulang",
              rows: reviewItems.map((item) => ({
                key: item.word.id,
                title: item.word.term,
                detail: displayMeanings(item.word.meanings),
                trailing: (
                  <Text className="text-right text-[10px] font-extrabold text-destructive">
                    {item.reasons
                      .map((reason) =>
                        reason === "missed" ? "Terlewat" : "Salah ketik",
                      )
                      .join(" · ")}
                  </Text>
                ),
              })),
            }}
            primary={{
              eyebrow: "Main lagi",
              title: `Mulai dari level ${startLevel}`,
              meta:
                answerMode === "ID"
                  ? "Lihat kata Korea, ketik artinya"
                  : "Lihat arti Indonesia, ketik kata Koreanya",
              pill: "Mulai",
              onPress: fromSheet(resetGame),
            }}
            secondary={{ label: "Selesai", onPress: exit }}
          />
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  countdown: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  levelBanner: {
    alignItems: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 96,
  },
  levelPill: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  levelPillTitle: {
    fontSize: 13,
    fontVariant: ["tabular-nums"],
    fontWeight: "800",
  },
  levelPillDetail: { fontSize: 12, fontWeight: "500" },
  countdownNumberBox: {
    alignItems: "center",
    height: 72,
    justifyContent: "center",
    width: 120,
  },
  countdownNumber: {
    fontSize: 56,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
    position: "absolute",
  },
  countdownTrack: {
    borderRadius: 1.5,
    height: 3,
    marginTop: 10,
    overflow: "hidden",
    width: 96,
  },
  countdownFill: {
    borderRadius: 1.5,
    height: 3,
    transformOrigin: "left center",
    width: 96,
  },
  countdownHint: { fontSize: 14, fontWeight: "500", marginTop: 16 },
  screen: { flex: 1 },
  field: { flex: 1, overflow: "hidden" },
  headerStats: { alignItems: "center", flexDirection: "row", gap: 9 },
  health: { fontSize: 14, fontWeight: "800" },
  headerMetric: {
    fontSize: 13,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
  },
  hiddenInput: {
    height: 1,
    opacity: 0,
    position: "absolute",
    width: 1,
  },
  wordEntity: {
    alignItems: "center",
    left: 0,
    position: "absolute",
    top: 0,
  },
  // A small card, so a word reads over any background. No overflow clipping:
  // it would cut the shadow, and the overlays round their own corners.
  wordSurface: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 2,
    gap: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  hitSurface: {
    bottom: 0,
    borderRadius: 12,
    borderWidth: 1,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  dangerSurface: {
    bottom: 0,
    borderRadius: 12,
    borderWidth: 1,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  powerUpLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  term: { fontSize: 20, fontWeight: "800", textAlign: "center" },
  indonesianPrompt: { fontSize: 16, lineHeight: 20 },
  definition: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.4,
    textAlign: "center",
  },
  koreanAnswer: { fontSize: 14, letterSpacing: 0, lineHeight: 18 },
  playerRow: {
    alignItems: "center",
    bottom: PLAYER_BOTTOM,
    left: 0,
    position: "absolute",
    right: 0,
  },
  // Left of the ship, right-aligned up to it, bottom-aligned with it.
  missedRow: {
    alignItems: "center",
    left: 16,
    position: "absolute",
    right: 16,
    top: 10,
    zIndex: 5,
  },
  missedCard: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    gap: 1,
    maxWidth: "100%",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  missedLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  missedPrompt: { fontSize: 17, fontWeight: "800" },
  missedText: { fontSize: 14, fontWeight: "600", textAlign: "center" },
  player: {
    alignItems: "center",
    height: PLAYER_SIZE,
    justifyContent: "center",
    width: PLAYER_SIZE,
  },
  // The ship, drawn inside the player's square and spilling past its sides.
  ship: { height: PLAYER_SIZE, width: PLAYER_SIZE },
  shipTurret: {
    height: 28,
    left: PLAYER_SIZE / 2 - 14,
    position: "absolute",
    top: -6,
    width: 28,
  },
  shipBarrel: {
    borderRadius: 3,
    height: 13,
    left: 11,
    position: "absolute",
    top: 1,
    width: 6,
  },
  shipDome: {
    borderTopLeftRadius: 9,
    borderTopRightRadius: 9,
    height: 11,
    left: PLAYER_SIZE / 2 - 9,
    position: "absolute",
    top: 4,
    width: 18,
  },
  shipBody: {
    alignItems: "center",
    borderRadius: 7,
    flexDirection: "row",
    gap: 6,
    height: 12,
    justifyContent: "center",
    left: PLAYER_SIZE / 2 - 20,
    position: "absolute",
    top: 13,
    width: 40,
  },
  shipLight: { borderRadius: 2, height: 4, width: 4 },
  unmatchedInput: {
    fontSize: 13,
    fontWeight: "800",
    left: -(140 - PLAYER_SIZE) / 2,
    position: "absolute",
    textAlign: "center",
    top: PLAYER_SIZE + 5,
    width: 140,
  },
  playerShieldRow: {
    alignItems: "center",
    bottom: PLAYER_BOTTOM - 6,
    height: 38,
    left: 0,
    position: "absolute",
    right: 0,
  },
  playerShield: {
    borderRadius: 20,
    borderWidth: 2,
    height: 38,
    width: 40,
  },
  headerBadge: { alignItems: "center", flexDirection: "row", gap: 2 },
  headerBadgeCount: {
    fontSize: 12,
    fontVariant: ["tabular-nums"],
    fontWeight: "800",
  },
  revealButton: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    bottom: PLAYER_BOTTOM + 48,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 18,
    position: "absolute",
    right: 12,
    zIndex: 10,
  },
  revealButtonText: { fontSize: 14, fontWeight: "800" },
  levelSelector: { gap: 10 },
  levelSelectorTitle: { fontSize: 14, fontWeight: "800" },
  levelList: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    maxHeight: 264,
    overflow: "hidden",
  },
  levelRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    minHeight: 60,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  levelRowCopy: { flex: 1, gap: 2 },
  levelRowTitle: { fontSize: 16, fontWeight: "700" },
  levelRowDetail: { fontSize: 12, lineHeight: 17 },
});
