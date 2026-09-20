import { Stack } from "expo-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
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
  interpolate,
  runOnJS,
  useAnimatedStyle,
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
import { GameBackToolbar } from "../game-screens";
import { GameModal, GameStartModal, GameJourneyFooter } from "../game-modals";
import { useGameExitGuard } from "../game-navigation";
import {
  addWordFallReviewItem,
  analyzeTyping,
  answerTextForWord,
  cleanTypingText,
  comboMultiplier,
  fallDurationForLevel,
  isWordFallInputEditable,
  knockbackDelayMs,
  levelForDestroyed,
  maximumActiveWords,
  pointsForWord,
  wordFallResult,
  pushStrengthForLevel,
  selectWordTarget,
  spawnIntervalForLevel,
  type WordFallPhase,
  type WordFallPowerUp,
  type WordFallReviewItem,
  type WordFallWord,
} from "./engine";

type FallingWord = {
  id: string;
  word: WordFallWord;
  spawnX: number;
  duration: number;
  impactAt: number;
  matched: number;
  hitVersion: number;
  knockbackTotal: number;
  comboAtCompletion?: number;
  completed: boolean;
  powerUp?: WordFallPowerUp;
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
const MAX_HEALTH = 6;
const FORCE_REWARD_CHARGES = 10;
const MAX_FORCE_CHARGES = 20;

function powerUpForRoll(roll: number): WordFallPowerUp | undefined {
  if (roll >= 0.15) return undefined;
  if (roll < 0.03) return "shield";
  if (roll < 0.06) return "freeze";
  if (roll < 0.09) return "heart";
  if (roll < 0.12) return "force";
  return "blast";
}

function powerUpLabel(powerUp: WordFallPowerUp) {
  if (powerUp === "shield") return "SHIELD";
  if (powerUp === "freeze") return "FREEZE";
  if (powerUp === "heart") return "+HEART";
  if (powerUp === "force") return "FORCE";
  return "BLAST";
}

function powerUpColor(powerUp: WordFallPowerUp, colors: ThemeColors) {
  if (powerUp === "shield") return colors.highlightBlueText;
  if (powerUp === "freeze") return colors.chart2;
  if (powerUp === "heart") return colors.destructive;
  if (powerUp === "force") return colors.highlightOrangeText;
  return colors.highlightYellowText;
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

function FallingWordView({
  entity,
  field,
  playerLift,
  mistyped,
  paused,
  onImpact,
}: {
  entity: FallingWord;
  field: FieldSize;
  playerLift: SharedValue<number>;
  mistyped: string;
  paused: boolean;
  onImpact: (id: string) => void;
}) {
  const { colors } = useAppTheme();
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

  useEffect(() => {
    cancelAnimation(dangerPulse);
    if (paused) {
      dangerPulse.value = 0;
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
    return () => cancelAnimation(dangerPulse);
  }, [dangerPulse, paused]);

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
  const definitionCharacters = Array.from(answerTextForWord(entity.word));
  const revealedDefinition = definitionCharacters
    .slice(0, entity.matched)
    .join("");
  const mistypedLength = Array.from(mistyped).length;
  const hiddenDefinition = definitionCharacters
    .slice(entity.matched + mistypedLength)
    .map((character) => (character.trim() === "" ? character : "•"))
    .join("");

  return (
    <Animated.View
      accessibilityLabel={`${entity.word.term}, ${entity.word.definition}`}
      style={[styles.wordEntity, { width: field.width }, animatedStyle]}
    >
      <View
        style={[
          styles.wordSurface,
          {
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
        <Text numberOfLines={1} style={styles.term}>
          <Text style={{ color: colors.foreground }}>{entity.word.term}</Text>
        </Text>
        <Text
          numberOfLines={1}
          style={[styles.definition, { color: colors.mutedForeground }]}
        >
          <Text style={{ color: colors.primary }}>{revealedDefinition}</Text>
          {mistyped ? (
            <Text style={{ color: colors.destructive }}>{mistyped}</Text>
          ) : null}
          <Text style={{ color: colors.mutedForeground }}>
            {hiddenDefinition}
          </Text>
        </Text>
      </View>
    </Animated.View>
  );
}

function Projectile({
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
}

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
  const animatedStyle = useAnimatedStyle(() => {
    const deltaX = projectile.to.x - projectile.from.x;
    const deltaY = projectile.to.y - projectile.from.y;
    const distance = Math.max(1, Math.hypot(deltaX, deltaY));
    const currentX = projectile.from.x + deltaX * progress.value;
    const currentY = projectile.from.y + deltaY * progress.value;
    const visibleLength = Math.min(length, distance * progress.value);
    const unitX = deltaX / distance;
    const unitY = deltaY / distance;
    const centerX = currentX - (unitX * visibleLength) / 2;
    const centerY = currentY - (unitY * visibleLength) / 2;
    const startFade = Math.min(1, progress.value / 0.12);
    const endFade = Math.min(1, (1 - progress.value) / 0.12);

    return {
      height: thickness,
      opacity: opacity * startFade * endFade,
      transform: [
        { translateX: centerX - visibleLength / 2 },
        { translateY: centerY - thickness / 2 },
        { rotateZ: `${Math.atan2(deltaY, deltaX)}rad` },
      ],
      width: visibleLength,
    };
  });

  return (
    <Animated.View style={[styles.projectileBeam, animatedStyle]}>
      {Array.from({ length: 10 }, (_, index) => {
        const strength = (index + 1) / 10;
        const segmentThickness = Math.max(
          1,
          thickness * (0.22 + strength * 0.78),
        );

        return (
          <View
            key={index}
            style={{
              backgroundColor: color,
              borderRadius: segmentThickness / 2,
              height: segmentThickness,
              left: `${index * 10}%`,
              opacity: 0.06 + Math.pow(strength, 1.6) * 0.94,
              position: "absolute",
              top: (thickness - segmentThickness) / 2,
              width: "10.5%",
            }}
          />
        );
      })}
    </Animated.View>
  );
}

function Burst({
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
    <Animated.View
      pointerEvents="none"
      style={[styles.burst, { borderColor: burst.color }, animatedStyle]}
    />
  );
}

function LearningRecap({ items }: { items: readonly WordFallReviewItem[] }) {
  const { colors } = useAppTheme();
  if (items.length === 0) return null;

  return (
    <View style={styles.recap}>
      <Text style={[styles.recapTitle, { color: colors.foreground }]}>
        Review these words
      </Text>
      <ScrollView
        contentContainerStyle={styles.recapList}
        nestedScrollEnabled
        showsVerticalScrollIndicator={items.length > 4}
        style={styles.recapScroll}
      >
        {items.map((item) => (
          <View
            key={item.word.id}
            style={[styles.recapItem, { borderBottomColor: colors.border }]}
          >
            <View style={styles.recapWord}>
              <Text style={[styles.recapTerm, { color: colors.foreground }]}>
                {item.word.term}
              </Text>
              <Text
                numberOfLines={2}
                style={[
                  styles.recapDefinition,
                  { color: colors.mutedForeground },
                ]}
              >
                {item.word.definition}
              </Text>
            </View>
            <Text style={[styles.recapReason, { color: colors.destructive }]}>
              {item.reasons
                .map((reason) => (reason === "missed" ? "Missed" : "Mistyped"))
                .join(" · ")}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

export function WordFallScreen({
  words,
  onExit,
  onComplete,
  onAttempt,
  onSessionStart,
  courseId,
  sourceCourseItemId,
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
}) {
  const { colors } = useAppTheme();
  const inputRef = useRef<TextInput>(null);
  const entitiesRef = useRef<FallingWord[]>([]);
  const lockedTargetRef = useRef<string | null>(null);
  const healthRef = useRef(STARTING_HEALTH);
  const shieldRef = useRef(0);
  const forceChargesRef = useRef(0);
  const comboRef = useRef(0);
  const mistakeActiveRef = useRef(false);
  const mistakeWordIdsRef = useRef(new Set<string>());
  const reportedWordIdsRef = useRef(new Set<string>());
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
  const playerLift = useSharedValue(0);
  const playerRecoil = useSharedValue(0);
  const level = levelForDestroyed(destroyed);
  const playerPositionStyle = useAnimatedStyle(() => ({
    bottom: PLAYER_BOTTOM + playerLift.value - playerRecoil.value,
  }));
  const playerShieldPositionStyle = useAnimatedStyle(() => ({
    bottom: PLAYER_BOTTOM - 6 + playerLift.value - playerRecoil.value,
  }));

  const usableWords = useMemo(
    () =>
      words
        .map((word) => ({
          ...word,
          term: cleanTypingText(word.term),
          definition: cleanTypingText(word.definition),
        }))
        .filter((word) => word.term && word.definition),
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
  const focusInputAfterModalDismiss = useCallback(() => {
    if (Platform.OS === "ios" && phase === "running") focusInput();
  }, [focusInput, phase]);

  const setLockedTarget = useCallback((id: string | null) => {
    lockedTargetRef.current = id;
    setLockedTargetId(id);
  }, []);

  const lockedTarget = entities.find(
    (entity) => entity.id === lockedTargetId && !entity.completed,
  );
  const unmatchedInput = !lockedTarget && input ? input : "";
  const wrongInputPulse = useSharedValue(0);
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
  const playerMistakeStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          wrongInputPulse.value,
          [0, 0.25, 0.5, 0.75, 1],
          [0, -1, 1, -2, 0],
        ),
      },
    ],
  }));
  const targetSpawnX = lockedTarget?.spawnX ?? field.width / 2;
  const playerRotationStyle = useAnimatedStyle(() => {
    const playerY = playerCenterY(field, playerLift.value);
    const horizontalDistance = targetSpawnX - field.width / 2;
    const verticalDistance = playerY - START_Y;
    const angle = Math.atan2(horizontalDistance, verticalDistance);
    return { transform: [{ rotateZ: `${angle}rad` }] };
  });
  const lockedTyping = lockedTarget
    ? analyzeTyping(
        answerTextForWord(lockedTarget.word),
        input,
        lockedTarget.matched,
      )
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

  const reportWord = useCallback(
    (entryId: string, result: "CORRECT" | "INCORRECT") => {
      if (reportedWordIdsRef.current.has(entryId)) return;
      reportedWordIdsRef.current.add(entryId);
      const sessionId = progressSessionIdRef.current;
      const delivery = {
        attemptId: `${sessionId}:${entryId}`,
        sessionId,
      };
      pendingReportIdsRef.current.add(delivery.attemptId);
      setPendingReportCount(pendingReportIdsRef.current.size);
      function send() {
        void onAttempt({ entryId, evidence: "RECALL", result }, delivery)
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

  const handleImpact = useCallback(
    (id: string) => {
      const entity = entitiesRef.current.find((item) => item.id === id);
      if (!entity || entity.completed) return;
      commitEntities(entitiesRef.current.filter((item) => item.id !== id));
      clearTargetInput(id);
      setReviewItems((current) =>
        addWordFallReviewItem(current, entity.word, "missed"),
      );
      reportWord(entity.word.id, "INCORRECT");
      mistakeActiveRef.current = false;
      resetCombo();
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
    [clearTargetInput, commitEntities, endGame, reportWord, resetCombo],
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
      const cleared = entitiesRef.current.filter((entity) => !entity.completed);
      for (const entity of cleared)
        addBurst(
          entityPosition(entity, field, playerLift.value),
          powerUpColor("blast", colors),
        );
      commitEntities([]);
      setScore((current) => current + cleared.length * 15);
      setDestroyed((current) => current + cleared.length);
    },
    [addBurst, colors, commitEntities, field, playerLift, schedule],
  );

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
          current + pointsForWord(entity.word, level, entity.comboAtCompletion),
      );
      setDestroyed((current) => current + 1);
      reportWord(
        entity.word.id,
        wordFallResult(mistakeWordIdsRef.current.has(entity.word.id)),
      );
      applyPowerUp(entity.powerUp);
    },
    [
      addBurst,
      applyPowerUp,
      colors,
      commitEntities,
      field,
      level,
      playerLift,
      reportWord,
    ],
  );

  const spawnWord = useCallback(() => {
    if (!field.width || !field.height || usableWords.length === 0) return;
    const current = entitiesRef.current;
    if (current.length >= maximumActiveWords(level)) return;
    const unused = usableWords.filter(
      (word) => !current.some((entity) => entity.word.id === word.id),
    );
    const pool = unused.length > 0 ? unused : usableWords;
    const word = pool[Math.floor(Math.random() * pool.length)];
    if (!word) return;
    const duration = fallDurationForLevel(level);
    const estimatedWidth = Math.min(
      field.width - 16,
      Math.max(
        32,
        Array.from(word.term).length * 20,
        Array.from(word.definition).length * 7,
      ),
    );
    const half = estimatedWidth / 2 + 4;
    const availableWidth = Math.max(0, field.width - half * 2);
    const entity: FallingWord = {
      id: `word-${++idRef.current}`,
      word,
      spawnX: half + Math.random() * availableWidth,
      duration,
      impactAt: Date.now() + duration,
      matched: 0,
      hitVersion: 0,
      knockbackTotal: 0,
      completed: false,
      powerUp: powerUpForRoll(Math.random()),
    };
    commitEntities([...current, entity]);
  }, [commitEntities, field, level, usableWords]);

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
    comboRef.current = 0;
    mistakeActiveRef.current = false;
    mistakeWordIdsRef.current.clear();
    reportedWordIdsRef.current.clear();
    setEntities([]);
    setProjectiles([]);
    setBursts([]);
    setHealth(STARTING_HEALTH);
    setShield(0);
    setForceCharges(0);
    setScore(0);
    setDestroyed(0);
    setCombo(0);
    setReviewItems([]);
    setInput("");
    setLockedTargetId(null);
    setFrozen(false);
    progressSessionIdRef.current = onSessionStart();
    setPhase("running");
    focusInputOnAndroid();
  }, [clearTimers, focusInputOnAndroid, onSessionStart, playerRecoil]);

  const pauseGame = useCallback(() => {
    if (phase !== "running") return;
    setPhase("paused");
    Keyboard.dismiss();
  }, [phase]);

  const resumeGame = useCallback(() => {
    setPhase("running");
    focusInputOnAndroid();
  }, [focusInputOnAndroid]);

  const handleInput = useCallback(
    (value: string) => {
      if (phase !== "running") return;
      const targetId =
        lockedTargetRef.current ??
        selectWordTarget(
          entitiesRef.current
            .filter((entity) => !entity.completed)
            .map((entity) => ({
              id: entity.id,
              answer: answerTextForWord(entity.word),
              impactAt: entity.impactAt,
            })),
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
      const analysis = analyzeTyping(
        answerTextForWord(target.word),
        value,
        target.matched,
      );
      setInput(value);
      if (value.length > 0) setLockedTarget(target.id);
      else setLockedTarget(null);
      if (analysis.mistake) registerMistake(target.word);
      else mistakeActiveRef.current = false;

      if (analysis.correctCharacters !== target.matched && !analysis.mistake) {
        const next = entitiesRef.current.map((entity) =>
          entity.id === target.id
            ? { ...entity, matched: analysis.correctCharacters }
            : entity,
        );
        commitEntities(next);
      }

      if (analysis.gainedCharacters > 0) {
        const answerCharacters = Array.from(answerTextForWord(target.word));
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
        const nextCombo = comboRef.current + 1;
        comboRef.current = nextCombo;
        setCombo(nextCombo);
        const next = entitiesRef.current.map((entity) =>
          entity.id === target.id
            ? {
                ...entity,
                matched: Array.from(answerTextForWord(entity.word)).length,
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
      <GameBackToolbar disabled={pendingReportCount > 0} onPress={exit} />
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
            accessibilityLabel={`${health} hearts, score ${score}, level ${level}, combo ${combo}`}
            style={styles.headerStats}
          >
            <Text style={[styles.health, { color: colors.destructive }]}>
              {"♥".repeat(health)}
              {"♡".repeat(MAX_HEALTH - health)}
            </Text>
            <Text style={[styles.headerMetric, { color: colors.foreground }]}>
              {score}
            </Text>
            <Text
              style={[styles.headerMetric, { color: colors.mutedForeground }]}
            >
              L{level}
            </Text>
            {combo > 1 ? (
              <Text style={[styles.headerMetric, { color: colors.primary }]}>
                ×{comboMultiplier(combo).toFixed(1)}
              </Text>
            ) : null}
          </View>
        </Stack.Toolbar.View>
        <Stack.Toolbar.Button
          accessibilityLabel="Pause game"
          disabled={phase !== "running"}
          icon={toolbarIcons.pause}
          onPress={pauseGame}
        />
      </Stack.Toolbar>
      <TextInput
        ref={inputRef}
        accessibilityLabel="Type the definition of the falling word"
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
        {shield > 0 || frozen || forceCharges > 0 ? (
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
                  Frozen
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
          </View>
        ) : null}

        {entities.map((entity) => (
          <FallingWordView
            key={entity.id}
            entity={entity}
            field={field}
            mistyped={entity.id === lockedTargetId ? mistyped : ""}
            onImpact={handleImpact}
            paused={phase !== "running" || frozen || entity.completed}
            playerLift={playerLift}
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

        <Animated.View
          accessibilityLabel="Player"
          style={[
            styles.player,
            {
              left: field.width / 2 - PLAYER_SIZE / 2,
            },
            playerPositionStyle,
            playerMistakeStyle,
          ]}
        >
          <Animated.Text
            style={[
              styles.playerGlyph,
              { color: colors.primary },
              playerRotationStyle,
            ]}
          >
            ⧋
          </Animated.Text>
          {unmatchedInput ? (
            <Text
              numberOfLines={1}
              style={[styles.unmatchedInput, { color: colors.destructive }]}
            >
              {unmatchedInput}
            </Text>
          ) : null}
        </Animated.View>
        {shield > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.playerShield,
              {
                borderColor: powerUpColor("shield", colors),
                left: field.width / 2 - 20,
              },
              playerShieldPositionStyle,
            ]}
          />
        ) : null}
      </View>

      <GameStartModal
        detail="Type each word's definition before it reaches your ship. Correct letters reveal as you type."
        gameKey="word-fall"
        onDismiss={focusInputAfterModalDismiss}
        onPrimary={resetGame}
        onSecondary={exit}
        title="Word Fall"
        visible={phase === "ready"}
      />
      <GameModal
        detail={`Score ${score} · Level ${level}`}
        eyebrow="Word fall"
        gameKey="word-fall"
        onDismiss={focusInputAfterModalDismiss}
        onPrimary={resumeGame}
        onSecondary={exit}
        primaryLabel="Resume"
        secondaryLabel="Exit"
        secondaryDisabled={pendingReportCount > 0}
        title="Paused"
        visible={phase === "paused"}
      />
      <GameModal
        content={
          <View style={styles.finishContent}>
            <LearningRecap items={reviewItems} />
            {pendingReportCount === 0 ? (
              <GameJourneyFooter
                courseId={courseId}
                courseItemId={sourceCourseItemId}
                scrollable={false}
              />
            ) : null}
          </View>
        }
        detail={
          pendingReportCount > 0
            ? `Final score ${score} · Syncing ${pendingReportCount} result${pendingReportCount === 1 ? "" : "s"}…`
            : `Final score ${score} · Level ${level}`
        }
        eyebrow="Word fall"
        gameKey="word-fall"
        onDismiss={focusInputAfterModalDismiss}
        onPrimary={resetGame}
        onSecondary={exit}
        primaryLabel="Play again"
        primaryDisabled={pendingReportCount > 0}
        secondaryLabel="Exit"
        secondaryDisabled={pendingReportCount > 0}
        title="Game over"
        visible={phase === "gameover"}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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
  wordSurface: {
    alignItems: "center",
    borderRadius: 6,
    gap: 0,
    overflow: "hidden",
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  hitSurface: {
    bottom: 0,
    borderRadius: 6,
    borderWidth: 1,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  dangerSurface: {
    bottom: 0,
    borderRadius: 6,
    borderWidth: 1,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  powerUpLabel: { fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  term: { fontSize: 20, fontWeight: "800", textAlign: "center" },
  definition: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.4,
    textAlign: "center",
  },
  player: {
    alignItems: "center",
    height: PLAYER_SIZE,
    justifyContent: "center",
    position: "absolute",
    width: PLAYER_SIZE,
  },
  playerGlyph: {
    fontSize: 24,
    fontWeight: "700",
    lineHeight: PLAYER_SIZE,
    textAlign: "center",
  },
  unmatchedInput: {
    fontSize: 13,
    fontWeight: "800",
    left: -(140 - PLAYER_SIZE) / 2,
    position: "absolute",
    textAlign: "center",
    top: PLAYER_SIZE + 5,
    width: 140,
  },
  playerShield: {
    borderRadius: 20,
    borderWidth: 2,
    height: 38,
    position: "absolute",
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
  recap: { gap: 8 },
  recapTitle: { fontSize: 14, fontWeight: "800" },
  recapScroll: { maxHeight: 220 },
  recapList: { gap: 0 },
  recapItem: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 12,
    minHeight: 48,
    paddingVertical: 8,
  },
  recapWord: { flex: 1 },
  recapTerm: { fontSize: 16, fontWeight: "800" },
  recapDefinition: { fontSize: 12, lineHeight: 17 },
  recapReason: { fontSize: 10, fontWeight: "800", textAlign: "right" },
  finishContent: { alignSelf: "stretch", gap: 12 },
  finishFooter: { maxHeight: 320 },
  finishFooterContent: { paddingBottom: 4 },
});
