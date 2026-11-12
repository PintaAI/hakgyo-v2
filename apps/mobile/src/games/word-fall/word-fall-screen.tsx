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
  ZoomIn,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
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
  answerOptionsForWord,
  answerTextForWord,
  bestTypingAnswer,
  cleanTypingText,
  comboMultiplier,
  destroyedForLevel,
  fallDurationForLevel,
  isWordFallInputEditable,
  knockbackDelayMs,
  levelForDestroyed,
  maximumActiveWords,
  pointsForWord,
  promptTextForWord,
  wordFallResult,
  pushStrengthForLevel,
  selectWordTarget,
  spawnIntervalForLevel,
  type WordFallAnswerMode,
  type WordFallPhase,
  type WordFallPowerUp,
  type WordFallReviewItem,
  type WordFallWord,
} from "./engine";
import { SymbolIcon } from "../../components/ui/symbol-icon";
import { hapticError, hapticSuccess } from "../../lib/haptics";

type FallingWord = {
  id: string;
  word: WordFallWord;
  /** The meaning being typed; switches to whichever one the input matches. */
  answer: string;
  spawnX: number;
  duration: number;
  impactAt: number;
  matched: number;
  hitVersion: number;
  knockbackTotal: number;
  comboAtCompletion?: number;
  completed: boolean;
  powerUp?: WordFallPowerUp;
  /** A word of the warm-up wave: its answer shows in full while it falls. */
  warmup?: boolean;
};

type Point = { x: number; y: number };
type FieldSize = { width: number; height: number };
type ProjectileModel = {
  id: number;
  targetId: string;
  character: string;
  color: string;
  from: Point;
  to: Point;
  pushStrength: number;
};
type BurstModel = { id: number; at: Point; color: string };

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
/** How long a missed word shows its answer beside the ship. */
const MISSED_ANSWER_MS = 3_000;
const MAX_HEALTH = 6;
const FORCE_REWARD_CHARGES = 10;
const MAX_FORCE_CHARGES = 20;
const REVEAL_DURATION_MS = 6_000;
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

function powerUpLabel(powerUp: WordFallPowerUp) {
  if (powerUp === "shield") return "SHIELD";
  if (powerUp === "freeze") return "FREEZE";
  if (powerUp === "heart") return "+HEART";
  if (powerUp === "force") return "FORCE";
  return "REVEAL";
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

function entityPosition(
  entity: FallingWord,
  field: FieldSize,
  playerLift = 0,
): Point {
  const elapsed = Date.now() - (entity.impactAt - entity.duration);
  const progress = Math.max(0, Math.min(1, elapsed / entity.duration));
  const player = {
    x: field.width / 2,
    y: playerCenterY(field, playerLift),
  };
  return {
    x: entity.spawnX + (player.x - entity.spawnX) * progress,
    y: START_Y + (player.y - START_Y) * progress,
  };
}

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
    <>
      <Animated.View style={[styles.shipTurret, aim]}>
        <View style={[styles.shipBarrel, { backgroundColor: palette.main }]} />
      </Animated.View>
      <View style={[styles.shipDome, { backgroundColor: palette.light }]} />
      <View style={[styles.shipBody, { backgroundColor: palette.dark }]}>
        <View style={[styles.shipLight, { backgroundColor: palette.light }]} />
        <View style={[styles.shipLight, { backgroundColor: palette.light }]} />
        <View style={[styles.shipLight, { backgroundColor: palette.light }]} />
      </View>
    </>
  );
});

const FallingWordView = memo(function FallingWordView({
  entity,
  field,
  mode,
  playerLift,
  mistyped,
  paused,
  revealed,
  onImpact,
}: {
  entity: FallingWord;
  field: FieldSize;
  mode: WordFallAnswerMode;
  playerLift: SharedValue<number>;
  mistyped: string;
  paused: boolean;
  revealed: boolean;
  onImpact: (id: string) => void;
}) {
  const { colors } = useAppTheme();
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(0);
  const hit = useSharedValue(0);
  const dangerPulse = useSharedValue(0);
  const appliedKnockback = useRef(0);
  const playerX = field.width / 2;
  const entityColor = entity.powerUp
    ? powerUpColor(entity.powerUp, colors)
    : colors.primary;

  useEffect(() => {
    if (paused) {
      cancelAnimation(progress);
      return;
    }
    const remaining = Math.max(0, 1 - progress.value);
    progress.value = withTiming(
      1,
      {
        duration: Math.max(1, entity.duration * remaining),
        easing: Easing.linear,
      },
      (finished) => {
        if (finished) runOnJS(onImpact)(entity.id);
      },
    );
    return () => cancelAnimation(progress);
  }, [entity.duration, entity.id, onImpact, paused, progress]);

  useAnimatedReaction(
    () => !paused && progress.value > 0.72,
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

  useEffect(() => {
    const pushDistance = entity.knockbackTotal - appliedKnockback.current;
    appliedKnockback.current = entity.knockbackTotal;
    if (pushDistance <= 0) return;

    const playerY = playerCenterY(field, playerLift.value);
    const pathDistance = Math.max(
      1,
      Math.hypot(playerX - entity.spawnX, playerY - START_Y),
    );
    const pushedProgress = Math.max(
      0,
      progress.value - pushDistance / pathDistance,
    );

    cancelAnimation(progress);
    progress.value = withTiming(
      pushedProgress,
      { duration: 110, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (!finished || paused) return;
        progress.value = withTiming(
          1,
          {
            duration: Math.max(1, entity.duration * (1 - pushedProgress)),
            easing: Easing.linear,
          },
          (reachedPlayer) => {
            if (reachedPlayer) runOnJS(onImpact)(entity.id);
          },
        );
      },
    );
  }, [
    entity.duration,
    entity.id,
    entity.knockbackTotal,
    entity.spawnX,
    field.height,
    onImpact,
    paused,
    playerLift,
    playerX,
    progress,
  ]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX:
          entity.spawnX +
          (playerX - entity.spawnX) * progress.value -
          field.width / 2,
      },
      {
        translateY:
          START_Y +
          (playerCenterY(field, playerLift.value) - START_Y) * progress.value,
      },
      {
        translateX: interpolate(
          hit.value,
          [0, 0.2, 0.4, 0.6, 0.8, 1],
          [0, -1, 1, -2, 2, 0],
        ),
      },
    ],
  }));
  useEffect(() => {
    if (entity.hitVersion === 0) return;
    cancelAnimation(hit);
    hit.value = 1;
    hit.value = withTiming(0, {
      duration: 240,
      easing: Easing.out(Easing.quad),
    });
  }, [entity.hitVersion, hit]);
  const hitStyle = useAnimatedStyle(() => ({ opacity: hit.value }));
  const dangerStyle = useAnimatedStyle(() => {
    const proximity = Math.max(0, Math.min(1, (progress.value - 0.72) / 0.28));
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
    .map((character, offset) =>
      revealed || entity.warmup || character.trim() === "" ? character : "•",
    )
    .join("");

  return (
    <Animated.View
      accessibilityLabel={`${prompt}, ${answer}`}
      style={[styles.wordEntity, { width: field.width }, animatedStyle]}
    >
      <View
        style={[
          styles.wordSurface,
          {
            backgroundColor: colors.card,
            borderColor: entity.powerUp
              ? withOpacity(entityColor, 0.6)
              : colors.border,
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
      </View>
    </Animated.View>
  );
});

const Projectile = memo(function Projectile({
  projectile,
  onDone,
}: {
  projectile: ProjectileModel;
  onDone: (projectile: ProjectileModel) => void;
}) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(
      1,
      { duration: 300, easing: Easing.out(Easing.quad) },
      (finished) => {
        if (finished) runOnJS(onDone)(projectile);
      },
    );
    return () => cancelAnimation(progress);
  }, [onDone, progress, projectile.id]);
  const animatedStyle = useAnimatedStyle(() => {
    const deltaX = projectile.to.x - projectile.from.x;
    const deltaY = projectile.to.y - projectile.from.y;
    const distance = Math.max(1, Math.hypot(deltaX, deltaY));
    const letterLead = interpolate(progress.value, [0, 0.85, 1], [11, 11, 0]);

    return {
      opacity: interpolate(progress.value, [0, 0.8, 1], [1, 1, 0]),
      transform: [
        {
          translateX:
            projectile.from.x +
            deltaX * progress.value +
            (deltaX / distance) * letterLead,
        },
        {
          translateY:
            projectile.from.y +
            deltaY * progress.value +
            (deltaY / distance) * letterLead,
        },
        { scale: interpolate(progress.value, [0, 1], [1, 0.45]) },
      ],
    };
  });
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={styles.projectileLayer}
    >
      <ProjectileBeam
        color={projectile.color}
        length={90}
        opacity={0.24}
        progress={progress}
        projectile={projectile}
        thickness={8}
      />
      <ProjectileBeam
        color={projectile.color}
        length={76}
        opacity={0.9}
        progress={progress}
        projectile={projectile}
        thickness={2}
      />
      <Animated.View style={[styles.projectile, animatedStyle]}>
        <Text style={[styles.projectileText, { color: projectile.color }]}>
          {projectile.character}
        </Text>
      </Animated.View>
    </View>
  );
});

function ProjectileBeam({
  color,
  length,
  opacity,
  progress,
  projectile,
  thickness,
}: {
  color: string;
  length: number;
  opacity: number;
  progress: SharedValue<number>;
  projectile: ProjectileModel;
  thickness: number;
}) {
  const deltaX = projectile.to.x - projectile.from.x;
  const deltaY = projectile.to.y - projectile.from.y;
  const distance = Math.max(1, Math.hypot(deltaX, deltaY));
  const unitX = deltaX / distance;
  const unitY = deltaY / distance;
  const angle = `${Math.atan2(deltaY, deltaX)}rad`;
  const animatedStyle = useAnimatedStyle(() => {
    const currentX = projectile.from.x + deltaX * progress.value;
    const currentY = projectile.from.y + deltaY * progress.value;
    const visibleLength = Math.min(length, distance * progress.value);
    const centerX = currentX - (unitX * visibleLength) / 2;
    const centerY = currentY - (unitY * visibleLength) / 2;
    const startFade = Math.min(1, progress.value / 0.12);
    const endFade = Math.min(1, (1 - progress.value) / 0.12);

    return {
      opacity: opacity * startFade * endFade,
      transform: [
        { translateX: centerX - length / 2 },
        { translateY: centerY - thickness / 2 },
        { rotateZ: angle },
        { scaleX: visibleLength / length },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.projectileBeam,
        {
          backgroundColor: color,
          borderRadius: thickness / 2,
          height: thickness,
          width: length,
        },
        animatedStyle,
      ]}
    />
  );
}

const Burst = memo(function Burst({
  burst,
  onDone,
}: {
  burst: BurstModel;
  onDone: (id: number) => void;
}) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(1, { duration: 360 }, (finished) => {
      if (finished) runOnJS(onDone)(burst.id);
    });
    return () => cancelAnimation(progress);
  }, [burst.id, onDone, progress]);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [
      { translateX: burst.at.x - 18 },
      { translateY: burst.at.y - 18 },
      { scale: interpolate(progress.value, [0, 1], [0.35, 2.4]) },
    ],
  }));
  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[styles.burst, { borderColor: burst.color }, animatedStyle]}
      />
      {SPARK_ANGLES.map((angle) => (
        <Spark
          key={angle}
          angle={angle}
          at={burst.at}
          color={burst.color}
          progress={progress}
        />
      ))}
    </>
  );
});

/** Six sparks thrown out of a burst, one every 60°, offset a little. */
const SPARK_ANGLES = [15, 75, 135, 195, 255, 315];
const SPARK_SIZE = 5;
const SPARK_DISTANCE = 30;

function Spark({
  angle,
  at,
  color,
  progress,
}: {
  angle: number;
  at: Point;
  color: string;
  progress: SharedValue<number>;
}) {
  const radians = (angle * Math.PI) / 180;
  const style = useAnimatedStyle(() => {
    // Ease-out: fast from the burst, slowing as it fades.
    const t = progress.value;
    const travel = (1 - (1 - t) * (1 - t)) * SPARK_DISTANCE;
    return {
      opacity: 1 - progress.value,
      transform: [
        { translateX: at.x - SPARK_SIZE / 2 + Math.cos(radians) * travel },
        { translateY: at.y - SPARK_SIZE / 2 + Math.sin(radians) * travel },
        { scale: 1 - progress.value * 0.5 },
      ],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.spark, { backgroundColor: color }, style]}
    />
  );
}

function levelDetail(level: number) {
  const fallSeconds = Math.round(fallDurationForLevel(level, 0.5) / 1000);
  const maxWords = maximumActiveWords(level);
  return `~${fallSeconds} dtk per kata · maks. ${maxWords} sekaligus`;
}

const COUNTDOWN_FROM = 3;
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
}: {
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
            {lessonTitle ? null : (
              <Text style={[styles.health, { color: colors.destructive }]}>
                {"♥".repeat(health)}
                {"♡".repeat(MAX_HEALTH - health)}
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
  const revealedRef = useRef(false);
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
  const effectIdRef = useRef(0);
  const timersRef = useRef(new Set<ReturnType<typeof setTimeout>>());
  const [phase, setPhase] = useState<WordFallPhase>("ready");
  const [field, setField] = useState<FieldSize>({ width: 0, height: 0 });
  const [entities, setEntities] = useState<FallingWord[]>([]);
  const [health, setHealth] = useState(STARTING_HEALTH);
  const [shield, setShield] = useState(0);
  const [forceCharges, setForceCharges] = useState(0);
  const [revealCharges, setRevealCharges] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [destroyed, setDestroyed] = useState(0);
  const [combo, setCombo] = useState(0);
  const [reviewItems, setReviewItems] = useState<readonly WordFallReviewItem[]>(
    [],
  );
  const [input, setInput] = useState("");
  const [lockedTargetId, setLockedTargetId] = useState<string | null>(null);
  const [projectiles, setProjectiles] = useState<ProjectileModel[]>([]);
  const [bursts, setBursts] = useState<BurstModel[]>([]);
  const [frozen, setFrozen] = useState(false);
  const [pendingReportCount, setPendingReportCount] = useState(0);
  // Chosen in Latihan's source sheet before the game opens; the answer
  // language can change again before "Main lagi".
  const [{ startLevel, answerMode }, updateSettings] = useWordFallSettings();
  const setAnswerMode = useCallback(
    (mode: WordFallAnswerMode) => updateSettings({ answerMode: mode }),
    [updateSettings],
  );
  const playerLift = useSharedValue(0);
  const playerRecoil = useSharedValue(0);
  const wrongInputPulse = useSharedValue(0);
  const level = levelForDestroyed(destroyed);
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
      if (word) mistakeWordIdsRef.current.add(word.id);
      if (word)
        setReviewItems((current) =>
          addWordFallReviewItem(current, word, "mistyped"),
        );
      resetCombo();
    },
    [resetCombo],
  );

  const schedule = useCallback((callback: () => void, delay: number) => {
    const timer = setTimeout(() => {
      timersRef.current.delete(timer);
      callback();
    }, delay);
    timersRef.current.add(timer);
    return timer;
  }, []);

  const clearTimers = useCallback(() => {
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
  useEffect(() => {
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
  const targetSpawnX = lockedTarget?.spawnX ?? field.width / 2;
  const playerRotationStyle = useAnimatedStyle(() => {
    const playerY = playerCenterY(field, playerLift.value);
    const horizontalDistance = targetSpawnX - field.width / 2;
    const verticalDistance = playerY - START_Y;
    const angle = Math.atan2(horizontalDistance, verticalDistance);
    return { transform: [{ rotateZ: `${angle}rad` }] };
  });
  const lockedTyping = lockedTarget
    ? analyzeTyping(lockedTarget.answer, input, lockedTarget.matched)
    : undefined;
  const mistyped =
    lockedTyping?.mistake && lockedTarget
      ? Array.from(input).slice(lockedTyping.correctCharacters).join("")
      : "";

  const addBurst = useCallback((at: Point, color: string) => {
    const burst = { id: ++effectIdRef.current, at, color };
    setBursts((current) => [...current, burst]);
  }, []);

  const handleProjectileDone = useCallback(
    (projectile: ProjectileModel) => {
      setProjectiles((current) =>
        current.filter((item) => item.id !== projectile.id),
      );
      if (
        !entitiesRef.current.some((entity) => entity.id === projectile.targetId)
      )
        return;
      const playerY = playerCenterY(field, playerLift.value);
      commitEntities(
        entitiesRef.current.map((entity) => {
          if (entity.id !== projectile.targetId) return entity;

          const pathDistance = Math.max(
            1,
            Math.hypot(field.width / 2 - entity.spawnX, playerY - START_Y),
          );
          const elapsed = Date.now() - (entity.impactAt - entity.duration);
          const currentProgress = Math.max(
            0,
            Math.min(1, elapsed / entity.duration),
          );
          const appliedPush = Math.min(
            projectile.pushStrength,
            pathDistance * currentProgress,
          );

          return {
            ...entity,
            hitVersion: entity.hitVersion + 1,
            impactAt:
              entity.impactAt +
              knockbackDelayMs(entity.duration, pathDistance, appliedPush),
            knockbackTotal: entity.knockbackTotal + appliedPush,
          };
        }),
      );
    },
    [commitEntities, field, playerLift],
  );

  const removeBurst = useCallback((id: number) => {
    setBursts((current) => current.filter((item) => item.id !== id));
  }, []);

  const clearTargetInput = useCallback(
    (id: string) => {
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
   * One attempt per fall. A fall with its answer showing (warm-up, Reveal)
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
      // A word that reaches the ship counts as wrong.
      hapticError();
      commitEntities(entitiesRef.current.filter((item) => item.id !== id));
      clearTargetInput(id);
      setReviewItems((current) =>
        addWordFallReviewItem(current, entity.word, "missed"),
      );
      const answerShown = Boolean(entity.warmup) || revealedRef.current;
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
      schedule(
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
      commitEntities,
      endGame,
      lesson,
      queueRetry,
      reportWord,
      resetCombo,
      schedule,
    ],
  );

  const applyPowerUp = useCallback(
    (powerUp: WordFallPowerUp | undefined) => {
      if (!powerUp) return;
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
        schedule(() => setFrozen(false), 2_500);
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
    [schedule],
  );

  const activateReveal = useCallback(() => {
    if (phase !== "running" || revealed) return;
    if (revealChargesRef.current <= 0) return;
    revealChargesRef.current -= 1;
    setRevealCharges(revealChargesRef.current);
    setRevealed(true);
    revealedRef.current = true;
    schedule(() => {
      setRevealed(false);
      revealedRef.current = false;
    }, REVEAL_DURATION_MS);
    focusInput();
  }, [focusInput, phase, revealed, schedule]);

  const finishWord = useCallback(
    (id: string) => {
      const entity = entitiesRef.current.find((item) => item.id === id);
      if (!entity) return;
      addBurst(
        entityPosition(entity, field, playerLift.value),
        entity.powerUp ? powerUpColor(entity.powerUp, colors) : colors.primary,
      );
      commitEntities(entitiesRef.current.filter((item) => item.id !== id));
      setScore(
        (current) =>
          current +
          pointsForWord(
            entity.word,
            level,
            entity.comboAtCompletion,
            answerMode,
            entity.answer,
          ),
      );
      setDestroyed((current) => current + 1);
      const result = wordFallResult(
        mistakeWordIdsRef.current.has(entity.word.id),
      );
      const answerShown = Boolean(entity.warmup) || revealedRef.current;
      reportWord(entity, result, answerShown);
      if (result === "INCORRECT" && !entity.warmup) queueRetry(entity.word.id);
      else if (result === "CORRECT" && !answerShown)
        retryIdsRef.current = retryIdsRef.current.filter(
          (id) => id !== entity.word.id,
        );
      applyPowerUp(entity.powerUp);
    },
    [
      addBurst,
      answerMode,
      applyPowerUp,
      colors,
      commitEntities,
      field,
      level,
      playerLift,
      queueRetry,
      reportWord,
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
      spawnX: half + Math.random() * availableWidth,
      duration,
      impactAt: Date.now() + duration,
      matched: 0,
      hitVersion: 0,
      knockbackTotal: 0,
      completed: false,
      powerUp: powerUpForRoll(Math.random()),
      warmup,
    };
    commitEntities([...current, entity]);
  }, [answerMode, commitEntities, field, lesson, level, usableWords]);

  useEffect(() => {
    if (phase !== "running" || frozen || !field.width || !field.height) return;
    spawnWord();
    const timer = setInterval(spawnWord, spawnIntervalForLevel(level));
    return () => clearInterval(timer);
  }, [field.height, field.width, frozen, level, phase, spawnWord]);

  const resetGame = useCallback(() => {
    clearTimers();
    cancelAnimation(playerRecoil);
    playerRecoil.value = 0;
    entitiesRef.current = [];
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
    revealedRef.current = false;
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
    setEntities([]);
    setProjectiles([]);
    setBursts([]);
    setHealth(STARTING_HEALTH);
    setShield(0);
    setForceCharges(0);
    setRevealCharges(0);
    setRevealed(false);
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
      const targetId =
        lockedTargetRef.current ??
        selectWordTarget(
          entitiesRef.current
            .filter((entity) => !entity.completed)
            .flatMap((entity) =>
              answerOptionsForWord(entity.word, answerMode).map((answer) => ({
                id: entity.id,
                answer,
                impactAt: entity.impactAt,
              })),
            ),
          value,
        );
      const target = entitiesRef.current.find(
        (entity) => entity.id === targetId && !entity.completed,
      );
      if (!target) {
        setInput(value);
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
      if (value.length > 0) setLockedTarget(target.id);
      else setLockedTarget(null);
      if (analysis.mistake) registerMistake(target.word);
      else mistakeActiveRef.current = false;

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
        const to = entityPosition(target, field, playerLift.value);
        const from = {
          x: field.width / 2,
          y: playerCenterY(field, playerLift.value),
        };
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
        const shots = gainedCharacters.map((character, index) => ({
          id: ++effectIdRef.current,
          targetId: target.id,
          character,
          color: target.powerUp
            ? powerUpColor(target.powerUp, colors)
            : colors.primary,
          from,
          to: { x: to.x + index * 3, y: to.y },
          pushStrength: pushStrengthForLevel(level, index < boostedShots),
        }));
        setProjectiles((current) => [...current, ...shots]);
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
        setInput("");
        setLockedTarget(null);
        schedule(() => finishWord(target.id), 540);
      }
    },
    [
      answerMode,
      commitEntities,
      colors,
      field,
      finishWord,
      level,
      phase,
      playerLift,
      playerRecoil,
      registerMistake,
      schedule,
      setLockedTarget,
    ],
  );

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
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.screen, { backgroundColor: colors.background }]}
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

      <View onLayout={onFieldLayout} style={styles.field}>
        {shield > 0 || frozen || forceCharges > 0 || revealed ? (
          <View style={styles.activePowerUps}>
            {shield > 0 ? (
              <View
                style={[
                  styles.statusChip,
                  {
                    backgroundColor: withOpacity(
                      powerUpColor("shield", colors),
                      0.14,
                    ),
                    borderColor: powerUpColor("shield", colors),
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusChipText,
                    { color: powerUpColor("shield", colors) },
                  ]}
                >
                  Shield ×{shield}
                </Text>
              </View>
            ) : null}
            {frozen ? (
              <View
                style={[
                  styles.statusChip,
                  {
                    backgroundColor: withOpacity(
                      powerUpColor("freeze", colors),
                      0.14,
                    ),
                    borderColor: powerUpColor("freeze", colors),
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusChipText,
                    { color: powerUpColor("freeze", colors) },
                  ]}
                >
                  Beku
                </Text>
              </View>
            ) : null}
            {forceCharges > 0 ? (
              <View
                style={[
                  styles.statusChip,
                  {
                    backgroundColor: withOpacity(
                      powerUpColor("force", colors),
                      0.14,
                    ),
                    borderColor: powerUpColor("force", colors),
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusChipText,
                    { color: powerUpColor("force", colors) },
                  ]}
                >
                  Force ×{forceCharges}
                </Text>
              </View>
            ) : null}
            {revealed ? (
              <View
                style={[
                  styles.statusChip,
                  {
                    backgroundColor: withOpacity(
                      powerUpColor("reveal", colors),
                      0.14,
                    ),
                    borderColor: powerUpColor("reveal", colors),
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusChipText,
                    { color: powerUpColor("reveal", colors) },
                  ]}
                >
                  Membuka
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {entities.map((entity) => (
          <FallingWordView
            key={entity.id}
            entity={entity}
            field={field}
            mode={answerMode}
            mistyped={entity.id === lockedTargetId ? mistyped : ""}
            onImpact={handleImpact}
            paused={phase !== "running" || frozen || entity.completed}
            playerLift={playerLift}
            revealed={revealed}
          />
        ))}
        {projectiles.map((projectile) => (
          <Projectile
            key={projectile.id}
            onDone={handleProjectileDone}
            projectile={projectile}
          />
        ))}
        {bursts.map((burst) => (
          <Burst burst={burst} key={burst.id} onDone={removeBurst} />
        ))}

        {/* Out of the ship's row, so its width never moves the ship. */}
        <View pointerEvents="none" style={styles.missedSide}>
          {missed ? (
            <Animated.View
              key={missed.key}
              entering={FadeIn.duration(160)}
              exiting={FadeOut.duration(240)}
              accessibilityLiveRegion="polite"
              accessibilityLabel={`Terlewat: ${missed.prompt}, ${missed.answer}`}
              style={[
                styles.missedAnswer,
                {
                  backgroundColor: withOpacity(colors.destructive, 0.12),
                  borderColor: withOpacity(colors.destructive, 0.5),
                },
              ]}
            >
              <Text
                numberOfLines={1}
                style={[styles.missedPrompt, { color: colors.foreground }]}
              >
                {missed.prompt}
              </Text>
              <Text
                numberOfLines={2}
                style={[styles.missedText, { color: colors.destructive }]}
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
            accessibilityLabel={`Aktifkan bantuan, sisa ${revealCharges}`}
            accessibilityRole="button"
            accessibilityState={{ disabled: revealed }}
            disabled={revealed}
            onPress={activateReveal}
            style={({ pressed }) => [
              styles.revealButton,
              {
                backgroundColor: withOpacity(
                  powerUpColor("reveal", colors),
                  revealed ? 0.07 : 0.16,
                ),
                borderColor: powerUpColor("reveal", colors),
                opacity: pressed || revealed ? 0.6 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.revealButtonText,
                { color: powerUpColor("reveal", colors) },
              ]}
            >
              Reveal ×{revealCharges}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {countdown ? (
        <Animated.View
          entering={FadeIn.duration(160)}
          exiting={FadeOut.duration(160)}
          pointerEvents="none"
          style={styles.countdown}
        >
          <Text
            style={[styles.countdownLabel, { color: colors.mutedForeground }]}
          >
            Bersiap
          </Text>
          {/* Keyed by the number, so each one pops in. */}
          <Animated.Text
            key={countdown}
            entering={ZoomIn.springify().damping(12)}
            style={[styles.countdownNumber, { color: colors.foreground }]}
          >
            {countdown}
          </Animated.Text>
        </Animated.View>
      ) : null}
      {/* Pausing opens the same sheet the round ends on. Closing it any way
          but "Keluar" goes on with the round. */}
      {phase === "paused" ? (
        <GameResultSheet
          eyebrow="Hujan kata"
          title="Dijeda"
          mark={{ value: String(score), label: "poin" }}
          facts={[{ icon: "flame.fill", text: `Level ${level}` }]}
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
  countdownLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  countdownNumber: {
    fontSize: 64,
    fontVariant: ["tabular-nums"],
    fontWeight: "800",
  },
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
  powerUpLabel: { fontSize: 8, fontWeight: "900", letterSpacing: 1 },
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
  missedSide: {
    alignItems: "flex-end",
    bottom: PLAYER_BOTTOM,
    left: 12,
    paddingRight: PLAYER_SIZE / 2 + 12,
    position: "absolute",
    right: "50%",
  },
  missedAnswer: {
    borderRadius: 12,
    borderWidth: 1,
    maxWidth: "100%",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  missedPrompt: { fontSize: 13, fontWeight: "800" },
  missedText: { fontSize: 13, fontWeight: "700" },
  player: {
    alignItems: "center",
    height: PLAYER_SIZE,
    justifyContent: "center",
    width: PLAYER_SIZE,
  },
  // The ship, drawn inside the player's square and spilling past its sides.
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
  projectile: {
    alignItems: "center",
    height: 24,
    justifyContent: "center",
    left: -12,
    position: "absolute",
    top: -12,
    width: 24,
  },
  projectileLayer: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  projectileText: { fontSize: 17, fontWeight: "900", textAlign: "center" },
  projectileBeam: {
    left: 0,
    position: "absolute",
    top: 0,
  },
  spark: {
    borderRadius: SPARK_SIZE / 2,
    height: SPARK_SIZE,
    left: 0,
    position: "absolute",
    top: 0,
    width: SPARK_SIZE,
  },
  burst: {
    borderRadius: 18,
    borderWidth: 2,
    height: 36,
    left: 0,
    position: "absolute",
    top: 0,
    width: 36,
  },
  activePowerUps: {
    flexDirection: "row",
    gap: 8,
    left: 12,
    position: "absolute",
    top: 12,
    zIndex: 10,
  },
  statusChip: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusChipText: { fontSize: 11, fontWeight: "800" },
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
