import {
  memo,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
  type Ref,
} from "react";
import { StyleSheet, Text } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

/**
 * Hujan Kata's shots and bursts, drawn over the field.
 *
 * They come and go several times per letter typed, so nothing here is
 * mounted or unmounted while the game runs: the layer keeps a fixed pool of
 * slots, and firing a shot or a burst only writes that slot's shared values,
 * which the UI thread animates. A slot re-renders only when the letter or
 * colour it shows changes, and the game screen never does. The screen drives
 * the layer through `WordFallEffectsHandle` and hears back only when a shot
 * reaches its word (`onHit`).
 */

export type Point = { x: number; y: number };

/** A letter fired at a word. */
export type Shot = {
  targetId: string;
  character: string;
  color: string;
  from: Point;
  to: Point;
  /** The impulse it gives the word, in px/s (see `knockBack`). */
  pushStrength: number;
  /** Where on the word it hits, -1 (left edge) to 1 (right edge). */
  offset: number;
  /** A wrong letter: it glances off the word without pushing it. */
  miss?: boolean;
};

export type BurstKind = {
  /** A shot chipping the word: a few sparks, no ring. */
  chip?: boolean;
  /** A blast: a ring as wide as its reach, in px. */
  blast?: number;
  /** The points a word was worth, rising from where it was; nothing else. */
  points?: number;
};

export type WordFallEffectsHandle = {
  shoot: (shots: readonly Shot[]) => void;
  burst: (at: Point, color: string, kind?: BurstKind) => void;
  /** Stops every shot and burst, for a new game. */
  clear: () => void;
};

/** Slots kept mounted; a shot or burst past these takes over the oldest. */
const SHOT_SLOTS = 10;
const BURST_SLOTS = 10;
const SLOT_INDEXES = (count: number) =>
  Array.from({ length: count }, (_, index) => index);

type SlotHandle<T> = {
  busy: () => boolean;
  fire: (id: number, item: T) => void;
  clear: () => void;
};

/** The first free slot from `start`, or the one at `start` when all are busy. */
function pickSlot<T>(slots: (SlotHandle<T> | null)[], start: number) {
  for (let step = 0; step < slots.length; step++) {
    const index = (start + step) % slots.length;
    if (slots[index] && !slots[index].busy()) return index;
  }
  return start % Math.max(1, slots.length);
}

export const WordFallEffects = memo(function WordFallEffects({
  onHit,
  ref,
}: {
  /**
   * A shot that is not a miss reached its word; returns whether the word was
   * still there, which chips it.
   */
  onHit: (shot: Shot) => boolean;
  ref: Ref<WordFallEffectsHandle>;
}) {
  const idRef = useRef(0);
  const shotSlots = useRef<(SlotHandle<Shot> | null)[]>([]);
  const burstSlots = useRef<(SlotHandle<BurstItem> | null)[]>([]);
  const nextShot = useRef(0);
  const nextBurst = useRef(0);

  const burst = useCallback<WordFallEffectsHandle["burst"]>(
    (at, color, kind) => {
      const index = pickSlot(burstSlots.current, nextBurst.current);
      nextBurst.current = index + 1;
      burstSlots.current[index]?.fire(++idRef.current, { at, color, ...kind });
    },
    [],
  );
  const handleShotDone = useCallback(
    (shot: Shot) => {
      if (shot.miss) return;
      if (onHit(shot)) burst(shot.to, shot.color, { chip: true });
    },
    [burst, onHit],
  );
  useImperativeHandle(
    ref,
    () => ({
      shoot: (shots) => {
        for (const shot of shots) {
          const index = pickSlot(shotSlots.current, nextShot.current);
          nextShot.current = index + 1;
          shotSlots.current[index]?.fire(++idRef.current, shot);
        }
      },
      burst,
      clear: () => {
        for (const slot of shotSlots.current) slot?.clear();
        for (const slot of burstSlots.current) slot?.clear();
      },
    }),
    [burst],
  );

  return (
    <>
      {SLOT_INDEXES(SHOT_SLOTS).map((index) => (
        <ShotSlot
          key={index}
          onDone={handleShotDone}
          ref={(handle) => {
            shotSlots.current[index] = handle;
          }}
        />
      ))}
      {SLOT_INDEXES(BURST_SLOTS).map((index) => (
        <BurstSlot
          key={index}
          ref={(handle) => {
            burstSlots.current[index] = handle;
          }}
        />
      ))}
    </>
  );
});

type ShotGeometry = {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  miss: boolean;
  /** The side a miss glances off to: -1 left, 1 right. */
  side: number;
};

const NO_SHOT: ShotGeometry = {
  fromX: 0,
  fromY: 0,
  toX: 0,
  toY: 0,
  miss: false,
  side: 1,
};
const SHOT_MS = 300;
const MISS_MS = 480;
/** Share of a missed shot's time spent reaching the word. */
const MISS_CONTACT = 0.4;

/**
 * One shot: the letter and its two beams. A hit flies to the word and fades
 * into it; a miss flies at the word, glances off its card and tumbles away.
 */
const ShotSlot = memo(function ShotSlot({
  onDone,
  ref,
}: {
  onDone: (shot: Shot) => void;
  ref: Ref<SlotHandle<Shot>>;
}) {
  const progress = useSharedValue(0);
  const active = useSharedValue(0);
  const geometry = useSharedValue(NO_SHOT);
  const [look, setLook] = useState({ character: "", color: "transparent" });
  const currentRef = useRef<{ id: number; shot: Shot } | null>(null);

  const finish = useCallback(
    (id: number) => {
      const current = currentRef.current;
      if (!current || current.id !== id) return;
      currentRef.current = null;
      onDone(current.shot);
    },
    [onDone],
  );
  useImperativeHandle(
    ref,
    () => ({
      busy: () => currentRef.current !== null,
      fire: (id, shot) => {
        // Taken over mid-flight: the shot it carried lands now.
        const interrupted = currentRef.current;
        currentRef.current = { id, shot };
        if (interrupted) onDone(interrupted.shot);
        setLook((current) =>
          current.character === shot.character && current.color === shot.color
            ? current
            : { character: shot.character, color: shot.color },
        );
        geometry.value = {
          fromX: shot.from.x,
          fromY: shot.from.y,
          toX: shot.to.x,
          toY: shot.to.y,
          miss: Boolean(shot.miss),
          side: shot.offset !== 0 ? Math.sign(shot.offset) : id % 2 ? 1 : -1,
        };
        active.value = 1;
        progress.value = 0;
        progress.value = withTiming(
          1,
          {
            duration: shot.miss ? MISS_MS : SHOT_MS,
            easing: shot.miss ? Easing.linear : Easing.out(Easing.quad),
          },
          (finished) => {
            if (!finished) return;
            active.value = 0;
            runOnJS(finish)(id);
          },
        );
      },
      clear: () => {
        currentRef.current = null;
        cancelAnimation(progress);
        active.value = 0;
      },
    }),
    [active, finish, geometry, onDone, progress],
  );

  const letterStyle = useAnimatedStyle(() => {
    const t = progress.value;
    const shot = geometry.value;
    if (!active.value) return { opacity: 0 };
    const deltaX = shot.toX - shot.fromX;
    const deltaY = shot.toY - shot.fromY;
    if (shot.miss) {
      if (t < MISS_CONTACT) {
        const flight = 1 - (1 - t / MISS_CONTACT) ** 2;
        return {
          opacity: 1,
          transform: [
            { translateX: shot.fromX + deltaX * flight },
            { translateY: shot.fromY + deltaY * flight },
            { rotateZ: "0rad" },
            { scale: 1 },
          ],
        };
      }
      // After the card: thrown sideways and down, falling and spinning.
      const after = (t - MISS_CONTACT) / (1 - MISS_CONTACT);
      return {
        opacity: 1 - after,
        transform: [
          { translateX: shot.toX + shot.side * 56 * after },
          { translateY: shot.toY + 18 * after + 70 * after * after },
          { rotateZ: `${shot.side * 4 * after}rad` },
          { scale: 1 - after * 0.3 },
        ],
      };
    }
    const distance = Math.max(1, Math.hypot(deltaX, deltaY));
    // The letter leads its beam until it lands.
    const lead = interpolate(t, [0, 0.85, 1], [11, 11, 0]);
    return {
      opacity: interpolate(t, [0, 0.8, 1], [1, 1, 0]),
      transform: [
        { translateX: shot.fromX + deltaX * t + (deltaX / distance) * lead },
        { translateY: shot.fromY + deltaY * t + (deltaY / distance) * lead },
        { rotateZ: "0rad" },
        { scale: interpolate(t, [0, 1], [1, 0.45]) },
      ],
    };
  });

  return (
    <>
      <Beam
        active={active}
        color={look.color}
        geometry={geometry}
        length={90}
        opacity={0.24}
        progress={progress}
        thickness={8}
      />
      <Beam
        active={active}
        color={look.color}
        geometry={geometry}
        length={76}
        opacity={0.9}
        progress={progress}
        thickness={2}
      />
      <Animated.View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={[styles.letter, letterStyle]}
      >
        <Text style={[styles.letterText, { color: look.color }]}>
          {look.character}
        </Text>
      </Animated.View>
    </>
  );
});

/** A streak behind a shot, growing from the ship and fading at both ends. */
function Beam({
  active,
  color,
  geometry,
  length,
  opacity,
  progress,
  thickness,
}: {
  active: SharedValue<number>;
  color: string;
  geometry: SharedValue<ShotGeometry>;
  length: number;
  opacity: number;
  progress: SharedValue<number>;
  thickness: number;
}) {
  const style = useAnimatedStyle(() => {
    const t = progress.value;
    const shot = geometry.value;
    if (!active.value || shot.miss) return { opacity: 0 };
    const deltaX = shot.toX - shot.fromX;
    const deltaY = shot.toY - shot.fromY;
    const distance = Math.max(1, Math.hypot(deltaX, deltaY));
    const visible = Math.min(length, distance * t);
    const centerX =
      shot.fromX + deltaX * t - ((deltaX / distance) * visible) / 2;
    const centerY =
      shot.fromY + deltaY * t - ((deltaY / distance) * visible) / 2;
    return {
      opacity: opacity * Math.min(1, t / 0.12) * Math.min(1, (1 - t) / 0.12),
      transform: [
        { translateX: centerX - length / 2 },
        { translateY: centerY - thickness / 2 },
        { rotateZ: `${Math.atan2(deltaY, deltaX)}rad` },
        { scaleX: visible / length },
      ],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.beam,
        {
          backgroundColor: color,
          borderRadius: thickness / 2,
          height: thickness,
          width: length,
        },
        style,
      ]}
    />
  );
}

type BurstItem = { at: Point; color: string } & BurstKind;

/** What a burst slot is showing: a ring with sparks, chips, or points. */
const RING = 0;
const CHIPS = 1;
const POINTS = 2;

type BurstGeometry = {
  x: number;
  y: number;
  kind: number;
  ringScale: number;
  /** Turns the chips a little, so two hits in a row do not look the same. */
  turn: number;
};

const NO_BURST: BurstGeometry = {
  x: 0,
  y: 0,
  kind: RING,
  ringScale: 1,
  turn: 0,
};
const RING_SIZE = 36;
/** Six sparks thrown out of a ring, one every 60°, offset a little. */
const SPARK_ANGLES = [15, 75, 135, 195, 255, 315];
const SPARK_SIZE = 5;
const SPARK_DISTANCE = 30;
/** Three chips knocked off downwards, towards the ship, by a shot. */
const CHIP_ANGLES = [50, 90, 130];
const CHIP_DISTANCE = 16;
const POINTS_WIDTH = 120;

const BurstSlot = memo(function BurstSlot({
  ref,
}: {
  ref: Ref<SlotHandle<BurstItem>>;
}) {
  const progress = useSharedValue(0);
  const active = useSharedValue(0);
  const geometry = useSharedValue(NO_BURST);
  const [look, setLook] = useState({ color: "transparent", points: 0 });
  const currentIdRef = useRef(0);

  const finish = useCallback((id: number) => {
    if (currentIdRef.current === id) currentIdRef.current = 0;
  }, []);
  useImperativeHandle(
    ref,
    () => ({
      busy: () => currentIdRef.current !== 0,
      fire: (id, item) => {
        currentIdRef.current = id;
        const points = item.points ?? 0;
        setLook((current) =>
          current.color === item.color && current.points === points
            ? current
            : { color: item.color, points },
        );
        geometry.value = {
          x: item.at.x,
          y: item.at.y,
          kind: item.points ? POINTS : item.chip ? CHIPS : RING,
          ringScale: item.blast ? (item.blast * 2) / RING_SIZE : 2.4,
          turn: (id * 47) % 60,
        };
        active.value = 1;
        progress.value = 0;
        progress.value = withTiming(
          1,
          {
            duration: item.points
              ? 820
              : item.blast
                ? 460
                : item.chip
                  ? 260
                  : 360,
            easing: Easing.linear,
          },
          (finished) => {
            if (!finished) return;
            active.value = 0;
            runOnJS(finish)(id);
          },
        );
      },
      clear: () => {
        currentIdRef.current = 0;
        cancelAnimation(progress);
        active.value = 0;
      },
    }),
    [active, finish, geometry, progress],
  );

  const ringStyle = useAnimatedStyle(() => {
    const burst = geometry.value;
    if (!active.value || burst.kind !== RING) return { opacity: 0 };
    return {
      opacity: 1 - progress.value,
      transform: [
        { translateX: burst.x - RING_SIZE / 2 },
        { translateY: burst.y - RING_SIZE / 2 },
        {
          scale: interpolate(progress.value, [0, 1], [0.35, burst.ringScale]),
        },
      ],
    };
  });
  const pointsStyle = useAnimatedStyle(() => {
    const burst = geometry.value;
    if (!active.value || burst.kind !== POINTS) return { opacity: 0 };
    const t = progress.value;
    // Up quickly, then it hangs and fades.
    const rise = 1 - (1 - t) * (1 - t);
    return {
      opacity: t < 0.55 ? 1 : 1 - (t - 0.55) / 0.45,
      transform: [
        { translateX: burst.x - POINTS_WIDTH / 2 },
        { translateY: burst.y - 10 - rise * 30 },
      ],
    };
  });

  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[styles.ring, { borderColor: look.color }, ringStyle]}
      />
      {SPARK_ANGLES.map((_, index) => (
        <Spark
          key={index}
          active={active}
          color={look.color}
          geometry={geometry}
          index={index}
          progress={progress}
        />
      ))}
      <Animated.Text
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={[styles.points, { color: look.color }, pointsStyle]}
      >
        +{look.points}
      </Animated.Text>
    </>
  );
});

function Spark({
  active,
  color,
  geometry,
  index,
  progress,
}: {
  active: SharedValue<number>;
  color: string;
  geometry: SharedValue<BurstGeometry>;
  index: number;
  progress: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    const burst = geometry.value;
    const chips = burst.kind === CHIPS;
    if (
      !active.value ||
      burst.kind === POINTS ||
      (chips && index >= CHIP_ANGLES.length)
    )
      return { opacity: 0 };
    const degrees = chips
      ? CHIP_ANGLES[index]! + burst.turn - 30
      : SPARK_ANGLES[index]!;
    const radians = (degrees * Math.PI) / 180;
    // Ease-out: fast from the burst, slowing as it fades.
    const t = progress.value;
    const travel =
      (1 - (1 - t) * (1 - t)) * (chips ? CHIP_DISTANCE : SPARK_DISTANCE);
    return {
      opacity: 1 - t,
      transform: [
        { translateX: burst.x - SPARK_SIZE / 2 + Math.cos(radians) * travel },
        { translateY: burst.y - SPARK_SIZE / 2 + Math.sin(radians) * travel },
        { scale: 1 - t * 0.5 },
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

const styles = StyleSheet.create({
  letter: {
    alignItems: "center",
    height: 24,
    justifyContent: "center",
    left: -12,
    position: "absolute",
    top: -12,
    width: 24,
  },
  letterText: { fontSize: 17, fontWeight: "900", textAlign: "center" },
  beam: { left: 0, position: "absolute", top: 0 },
  spark: {
    borderRadius: SPARK_SIZE / 2,
    height: SPARK_SIZE,
    left: 0,
    position: "absolute",
    top: 0,
    width: SPARK_SIZE,
  },
  points: {
    fontSize: 15,
    fontVariant: ["tabular-nums"],
    fontWeight: "800",
    left: 0,
    position: "absolute",
    textAlign: "center",
    top: 0,
    width: POINTS_WIDTH,
  },
  ring: {
    borderRadius: RING_SIZE / 2,
    borderWidth: 2,
    height: RING_SIZE,
    left: 0,
    position: "absolute",
    top: 0,
    width: RING_SIZE,
  },
});
