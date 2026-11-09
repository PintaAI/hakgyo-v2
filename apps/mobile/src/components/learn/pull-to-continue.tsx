import { memo, useCallback, useMemo, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Gesture } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";

import { formatCountdown } from "../../lib/reading-time";
import { useAppTheme } from "../../providers/AppThemeProvider";
import { SymbolIcon } from "../ui/symbol-icon";

/**
 * Letting go: the indicator falls back down and fades out, a little
 * larger, like the ring's ripple. After a pull that stopped short of the
 * snap point it rises back into place as the hint.
 */
const DROP = { duration: 280, easing: Easing.out(Easing.cubic) };
const DROP_DISTANCE = 28;
const DROP_GROW = 0.35;
const HINT_RETURN_DELAY_MS = 650;
const HINT_RETURN = { duration: 320, easing: Easing.out(Easing.cubic) };

/** How long the release animation plays before continuing. */
const RELEASE_SETTLE_MS = 320;

/** Within this distance of the bottom, the content counts as at its end. */
const AT_END_SLACK = 8;

/** How far past the end the finger travels before a release continues. */
export const PULL_THRESHOLD = 200;

/** Farthest the indicator rises; it approaches this and never reaches it. */
const RISE = 120;
/**
 * Vertical places of the indicator, relative to its layout. It waits at
 * `HINT_Y` once the end is reached, sits `HIDDEN_Y` lower (faded out) before
 * that, rises from the hint along the rubber band, and snaps `SNAP_JUMP`
 * higher than the band reaches at the threshold (`LOCK_Y`).
 */
const HINT_Y = 0;
const HIDDEN_Y = 28;
const SNAP_JUMP = 16;
/** The hint's bounce: how far up and how long each way. */
const HINT_BOUNCE = 6;
const HINT_BOUNCE_MS = 520;
/** The spring the indicator snaps back with when a pull is let go. */
const SNAP_BACK = { damping: 15, stiffness: 170, mass: 0.9 };
/** The bouncier spring of the arrow snapping into place at the threshold. */
const SNAP_LOCK = { damping: 9, stiffness: 240, mass: 0.8 };
/** A stiff spring that follows the finger closely but never jumps. */
const FOLLOW = { damping: 28, stiffness: 420, mass: 0.6 };
/** Pulling back this far below the threshold unlocks again. */
const UNLOCK_SLACK = 16;

// Before the worklets below: a worklet captures the constants it uses when
// it is defined, and one declared later would be captured as undefined.
/** Lower is stiffer: less rise for the same pull. */
const RUBBER_STIFFNESS = 0.4;
/** How sharply the pull stiffens toward the snap point. */
const TENSION = 2.2;

/**
 * Rubber band: follows the finger at first, then gives less and less, like
 * scrolling past the end on iOS. `x` points of pull move it this far.
 */
function rubber(x: number) {
  "worklet";
  return RISE * (1 - 1 / ((x * RUBBER_STIFFNESS) / RISE + 1));
}

/** Where the arrow snaps to: above where the band reaches at the threshold. */
const LOCK_Y = HINT_Y - rubber(PULL_THRESHOLD) - SNAP_JUMP;

/**
 * How far along the pull is, 0 to 1 at the snap point, along a curve that
 * gives a lot at first and less and less near the end, like a band that
 * pulls back harder the more it stretches.
 */
export function tension(pull: number) {
  "worklet";
  const x = Math.min(1, Math.max(0, pull / PULL_THRESHOLD));
  return (1 - Math.exp(-TENSION * x)) / (1 - Math.exp(-TENSION));
}

/**
 * Pull past the end of a scroll view to continue: the gesture runs next to
 * the scroll view's own (`Gesture.Native`), measures how far the finger
 * moves up once the content is at its end, and calls `onRelease` when it is
 * let go past `PULL_THRESHOLD`. iOS still rubber-bands the content; Android,
 * which does not move content past its end, gets the same feel from the
 * indicator alone.
 */
export function usePullToContinue({
  onRelease,
}: {
  /** Continues; the arrow stays snapped in until its promise settles. */
  onRelease: () => void | Promise<void>;
}) {
  /** Distance pulled past the end, in points. */
  const pull = useSharedValue(0);
  /** Set by the screen from its scroll position (and for short content). */
  const atEnd = useSharedValue(false);
  /** Off while the screen must not continue (unread pages, busy). */
  const enabled = useSharedValue(true);
  const origin = useSharedValue<number | null>(null);
  /**
   * Past the threshold: the arrow has snapped into place and letting go
   * continues. It unlocks only well below the threshold, so a finger
   * resting on it does not flicker between the two.
   */
  const locked = useSharedValue(false);
  /** Let go while locked: hold the lock until `onRelease` settles. */
  const releasing = useSharedValue(false);
  /** 0 in place, 1 fallen away after a release (see `DROP`). */
  const drop = useSharedValue(0);

  // The latest callback, behind a stable function: the gesture is built once,
  // so a re-render during a pull never resets it.
  const latest = useRef(onRelease);
  latest.current = onRelease;
  const release = useCallback(async () => {
    try {
      // Let the snap and the arrow turning into a spinner play out on the UI
      // thread before continuing, which busies JavaScript and swaps screens.
      await new Promise((resolve) => setTimeout(resolve, RELEASE_SETTLE_MS));
      await latest.current();
    } finally {
      // Still on this screen (a milestone, a required activity, an error):
      // bring the indicator back for the next pull.
      releasing.value = false;
      locked.value = false;
      drop.value = withTiming(0, HINT_RETURN);
    }
  }, [drop, locked, releasing]);

  const gesture = useMemo(() => {
    const scroll = Gesture.Native();
    const drag = Gesture.Pan()
      .onBegin(() => {
        if (drop.value > 0 && !releasing.value) {
          cancelAnimation(drop);
          drop.value = withTiming(0, { duration: 120 });
        }
      })
      .activeOffsetY([-8, 8])
      .failOffsetX([-24, 24])
      .onUpdate((event) => {
        if (!atEnd.value || !enabled.value) {
          // An ordinary scroll: write only what changed, or every finger
          // move would recompute the indicator's styles for nothing.
          if (origin.value !== null) origin.value = null;
          if (pull.value !== 0) pull.value = 0;
          if (locked.value) locked.value = false;
          return;
        }
        // Count from where the finger was when the end was reached.
        if (origin.value === null) origin.value = event.translationY;
        pull.value = Math.max(0, origin.value - event.translationY);
        if (!locked.value && pull.value >= PULL_THRESHOLD) locked.value = true;
        else if (locked.value && pull.value < PULL_THRESHOLD - UNLOCK_SLACK) {
          locked.value = false;
        }
      })
      .onEnd((event) => {
        // A fast flick can lift off before an update saw it pass the
        // threshold: judge by where the finger ended.
        if (
          !locked.value &&
          atEnd.value &&
          origin.value !== null &&
          origin.value - event.translationY >= PULL_THRESHOLD
        ) {
          locked.value = true;
        }
        if (locked.value && enabled.value) {
          releasing.value = true;
          scheduleOnRN(release);
        }
      })
      .onFinalize(() => {
        origin.value = null;
        // Fall away. A continuing release stays gone; a short pull comes back
        // as the hint. A plain scroll that never pulled leaves it alone.
        if (releasing.value) {
          drop.value = withTiming(1, DROP);
        } else if (pull.value > 4) {
          drop.value = withSequence(
            withTiming(1, DROP),
            withDelay(HINT_RETURN_DELAY_MS, withTiming(0, HINT_RETURN)),
          );
        }
        // Released past the threshold: stay snapped in, no gap before the
        // screen reports busy.
        if (!releasing.value) locked.value = false;
        // Let go: spring back like a rubber band.
        pull.value = withSpring(0, SNAP_BACK);
      });
    return { scroll, both: Gesture.Simultaneous(scroll, drag) };
  }, [atEnd, drop, enabled, locked, origin, pull, release, releasing]);

  // Where the content is, on the UI thread: no scroll event crosses to
  // JavaScript, and `atEnd` is written only when it changes, so the
  // indicator's styles do not recompute on every scroll frame.
  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      const distanceFromBottom =
        event.contentSize.height +
        event.contentInset.bottom -
        (event.contentOffset.y + event.layoutMeasurement.height);
      const end = distanceFromBottom <= AT_END_SLACK;
      if (end !== atEnd.value) atEnd.value = end;
    },
  });

  return {
    gesture: gesture.both,
    onScroll,
    pull,
    locked,
    releasing,
    drop,
    atEnd,
    enabled,
  };
}

/** Size of the arrow and the spinner it turns into. */
const ICON = 22;
/** The progress ring around the arrow: radial ticks that light up. */
const RING = 44;
const TICKS = 24;
const TICK_WIDTH = 2.5;
const TICK_LENGTH = 6;
/** From the ring's centre to the middle of each tick. */
const TICK_RADIUS = RING / 2 - TICK_LENGTH / 2;
/** An unlit tick, showing the way round. */
const TICK_IDLE = 0.18;

/**
 * One tick of the ring. It lights as the pull passes its share of the way
 * round, fading in over one tick's width so the fill moves smoothly.
 */
const RingTick = memo(function RingTick({
  index,
  fill,
  color,
}: {
  index: number;
  /** Ticks lit so far, from `ProgressRing`. */
  fill: SharedValue<number>;
  color: string;
}) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(
      fill.value - index,
      [0, 1],
      [TICK_IDLE, 1],
      Extrapolation.CLAMP,
    ),
  }));
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: RING / 2 - TICK_WIDTH / 2,
          top: RING / 2 - TICK_LENGTH / 2,
          width: TICK_WIDTH,
          height: TICK_LENGTH,
          borderRadius: TICK_WIDTH / 2,
          backgroundColor: color,
          // Clockwise from twelve o'clock, pushed out to the ring.
          transform: [
            { rotate: `${(index / TICKS) * 360}deg` },
            { translateY: -TICK_RADIUS },
          ],
        },
        style,
      ]}
    />
  );
});

/**
 * A ring of ticks around the arrow that fills clockwise from twelve o'clock
 * as the learner pulls, full at the snap point. There it ripples away,
 * growing and fading, and comes back if the pull unlocks. Plain views,
 * opacity and transforms: no SVG, no clipping.
 */
const ProgressRing = memo(function ProgressRing({
  pull,
  locked,
  releasing,
  busy,
  color,
}: {
  pull: SharedValue<number>;
  locked: SharedValue<boolean>;
  releasing: SharedValue<boolean>;
  busy: boolean;
  color: string;
}) {
  // The tension curve once per frame, not once per tick.
  const fill = useDerivedValue(() => tension(pull.value) * TICKS);
  const ripple = useAnimatedStyle(() => {
    const away = locked.value || releasing.value || busy;
    const RIPPLE = { duration: away ? 420 : 200 };
    return {
      opacity: withTiming(away ? 0 : 1, RIPPLE),
      transform: [{ scale: withTiming(away ? 1.9 : 1, RIPPLE) }],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, ripple]}
    >
      {Array.from({ length: TICKS }, (_, index) => (
        <RingTick key={index} index={index} fill={fill} color={color} />
      ))}
    </Animated.View>
  );
});

/**
 * A small arrow and a one-line label that rise from the bottom while the
 * learner pulls past the end. At the threshold the arrow pops into the
 * primary colour and "Tarik untuk lanjut" becomes "Lepas untuk lanjut".
 * Whenever the finger lifts, it falls back down and fades out, growing a
 * little like the ring's ripple: for good when the release continues, and
 * back into place as the hint when the pull stopped short. Transforms and
 * opacity only.
 */
export function PullToContinueIndicator({
  pull,
  locked,
  releasing,
  drop,
  atEnd,
  enabled,
  busy,
}: {
  pull: SharedValue<number>;
  /** From `usePullToContinue`: snapped in, a release continues. */
  locked: SharedValue<boolean>;
  /**
   * From `usePullToContinue`: let go while locked. Set on the UI thread as
   * the finger lifts, so the release animation starts at once, however busy
   * JavaScript gets; `busy` alone would wait for a React render.
   */
  releasing: SharedValue<boolean>;
  /** From `usePullToContinue`: the fall after a release. */
  drop: SharedValue<number>;
  /** From `usePullToContinue`: the end is reached, so the hint shows. */
  atEnd: SharedValue<boolean>;
  enabled: SharedValue<boolean>;
  busy: boolean;
}) {
  // The hint bounces only while it shows: an endless animation on a hidden
  // view would still cost a frame of UI-thread work, every frame.
  const bounce = useSharedValue(0);
  const reducedMotion = useReducedMotion();
  useAnimatedReaction(
    () =>
      !reducedMotion &&
      !busy &&
      !releasing.value &&
      drop.value === 0 &&
      atEnd.value &&
      enabled.value,
    (waiting, previous) => {
      if (waiting === previous) return;
      if (waiting) {
        const half = {
          duration: HINT_BOUNCE_MS,
          easing: Easing.inOut(Easing.quad),
        };
        bounce.value = withRepeat(
          withSequence(withTiming(-HINT_BOUNCE, half), withTiming(0, half)),
          -1,
        );
      } else {
        cancelAnimation(bounce);
        bounce.value = withTiming(0, { duration: 160 });
      }
    },
    [busy, reducedMotion],
  );
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  // Waits at the hint once the end is reached and follows the finger up the
  // rubber band from there; locked, it snaps into place and stays, however
  // much farther the finger goes. Let go, it falls back down and fades.
  const rise = useAnimatedStyle(() => {
    const hold = locked.value && !releasing.value;
    const shown = releasing.value || (!busy && atEnd.value && enabled.value);
    const y = hold ? LOCK_Y : (shown ? HINT_Y : HIDDEN_Y) - rubber(pull.value);
    return {
      opacity: withTiming(shown ? 1 : 0, { duration: 220 }),
      transform: [{ translateY: withSpring(y, hold ? SNAP_LOCK : FOLLOW) }],
    };
  });
  // The fall after a release, on its own layer: an animation (the springs
  // above) cannot be added to or multiplied by a plain value.
  const fall = useAnimatedStyle(() => ({
    opacity: 1 - drop.value,
    transform: [
      { translateY: drop.value * DROP_DISTANCE },
      { scale: 1 + drop.value * DROP_GROW },
    ],
  }));
  // The hint: a gentle bounce while waiting, settling as the pull begins.
  const hint = useAnimatedStyle(() => {
    const waiting = locked.value
      ? 0
      : interpolate(pull.value, [0, 24], [1, 0], Extrapolation.CLAMP);
    return { transform: [{ translateY: bounce.value * waiting }] };
  });
  // Stretches with the pull like a band under tension; snapping in releases
  // the tension, so it springs back to its own shape with a wobble.
  const stretch = useAnimatedStyle(() => {
    const hold = locked.value;
    const amount = hold ? 0 : tension(pull.value) * 0.5;
    const spring = hold ? SNAP_LOCK : FOLLOW;
    return {
      transform: [
        { scaleY: withSpring(1 + amount, spring) },
        { scaleX: withSpring(1 - amount * 0.35, spring) },
      ],
    };
  });
  // The arrow pops at the threshold.
  const arrow = useAnimatedStyle(() => ({
    transform: [
      { rotate: "-90deg" },
      { scale: withSpring(locked.value ? 1.25 : 1, SNAP_LOCK) },
    ],
  }));
  // Two tints crossfade: an icon's tint cannot animate.
  const arrowPrimary = useAnimatedStyle(() => ({
    opacity: withTiming(locked.value ? 1 : 0, { duration: 140 }),
  }));
  // One line, two crossfading labels: pull, then release.
  const LABEL = { duration: 160 };
  const pullLabel = useAnimatedStyle(() => {
    const shown = !locked.value;
    return {
      opacity: withTiming(shown ? 1 : 0, LABEL),
      transform: [{ translateY: withTiming(shown ? 0 : 3, LABEL) }],
    };
  });
  const releaseLabel = useAnimatedStyle(() => {
    const shown = locked.value;
    return {
      opacity: withTiming(shown ? 1 : 0, LABEL),
      transform: [{ translateY: withTiming(shown ? 0 : 3, LABEL) }],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="absolute left-0 right-0 items-center"
      style={[{ bottom: Math.max(insets.bottom, 12) + 4 }, fall]}
    >
      {/* Full width: the labels below lay out across it on one line. */}
      <Animated.View className="items-center gap-1.5 self-stretch" style={rise}>
        <View style={{ width: RING, height: RING }}>
          {/* The ring and the arrow bounce and stretch as one: the ring draws
            out into an oval with the arrow. */}
          <Animated.View style={[StyleSheet.absoluteFill, hint]}>
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                styles.center,
                styles.stretch,
                stretch,
              ]}
            >
              <ProgressRing
                pull={pull}
                locked={locked}
                releasing={releasing}
                busy={busy}
                color={colors.primary}
              />
              <Animated.View style={arrow}>
                {/* arrow.right, turned up */}
                <SymbolIcon
                  name="arrow.right"
                  size={ICON}
                  weight="bold"
                  tintColor={colors.mutedForeground}
                />
                <Animated.View style={[StyleSheet.absoluteFill, arrowPrimary]}>
                  <SymbolIcon
                    name="arrow.right"
                    size={ICON}
                    weight="bold"
                    tintColor={colors.primary}
                  />
                </Animated.View>
              </Animated.View>
            </Animated.View>
          </Animated.View>
        </View>
        <View style={styles.labels}>
          <Animated.Text
            className="text-xs font-semibold text-muted-foreground"
            style={[styles.label, pullLabel]}
          >
            Tarik untuk lanjut
          </Animated.Text>
          <Animated.Text
            className="text-xs font-semibold text-primary"
            style={[styles.label, releaseLabel]}
          >
            Lepas untuk lanjut
          </Animated.Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

/**
 * In place of the pull arrow while the reading guard holds "next": a ring
 * that fills as the reading time runs, and how long is left. Shows once
 * the end is reached, like the arrow it stands in for.
 */
export function ReadingGuardIndicator({
  remaining,
  required,
  atEnd,
}: {
  remaining: number;
  required: number;
  atEnd: SharedValue<boolean>;
}) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const shown = useAnimatedStyle(() => ({
    opacity: withTiming(atEnd.value ? 1 : 0, { duration: 220 }),
    transform: [
      { translateY: withTiming(atEnd.value ? HINT_Y : HIDDEN_Y, HINT_RETURN) },
    ],
  }));
  const done = required > 0 ? 1 - remaining / required : 1;
  const ticks = Math.round(done * RING_TICKS);
  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      accessibilityLabel={`Baca dulu, ${formatCountdown(remaining)} lagi sebelum lanjut`}
      pointerEvents="none"
      className="absolute left-0 right-0 items-center gap-1.5"
      style={[{ bottom: Math.max(insets.bottom, 12) + 4 }, shown]}
    >
      <View style={[{ width: RING, height: RING }, styles.center]}>
        {Array.from({ length: RING_TICKS }, (_, tick) => (
          <View
            key={tick}
            style={[
              styles.tick,
              {
                backgroundColor: tick < ticks ? colors.primary : colors.border,
                transform: [
                  { rotate: `${(tick * 360) / RING_TICKS}deg` },
                  { translateY: -RING / 2 + 3 },
                ],
              },
            ]}
          />
        ))}
        <SymbolIcon
          name="book.closed"
          size={16}
          weight="semibold"
          tintColor={colors.mutedForeground}
        />
      </View>
      <Text className="text-xs font-semibold tabular-nums text-muted-foreground">
        Baca dulu · {formatCountdown(remaining)}
      </Text>
    </Animated.View>
  );
}

/** Ticks around the reading-guard ring. */
const RING_TICKS = 24;

const styles = StyleSheet.create({
  // Centred in the ring, then turned and pushed out to its edge.
  tick: {
    position: "absolute",
    left: RING / 2 - 1,
    top: RING / 2 - 3,
    width: 2,
    height: 6,
    borderRadius: 1,
  },
  center: { alignItems: "center", justifyContent: "center" },
  // Stretches up from its base, toward the pulling finger.
  stretch: { transformOrigin: "bottom" },
  // The labels share one line and crossfade in place.
  labels: { alignSelf: "stretch", height: 16 },
  label: { position: "absolute", left: 0, right: 0, textAlign: "center" },
});
