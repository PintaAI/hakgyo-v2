import { SymbolView } from "expo-symbols";
import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { DECK_TOP_SPACE } from "../lib/vocabulary-deck-motion";
import { useAppTheme } from "../providers/AppThemeProvider";

export type DeckTutorialStep = "peel" | "swipe" | "done";

// Matches the deck stage: inset 16 from each side, below the stack runway.
const CARD_FRAME = {
  position: "absolute",
  top: DECK_TOP_SPACE,
  right: 16,
  bottom: 0,
  left: 16,
} as const;

// Up, left, right: the directions that advance a card.
const SWIPE_PATHS = [
  { x: 0, y: -76 },
  { x: -88, y: 0 },
  { x: 88, y: 0 },
];

/** One gesture demo per loop: fade in, travel, fade out, rest. */
function demoPhase(t: number) {
  "worklet";
  const travel = interpolate(t, [0.15, 0.7], [0, 1], "clamp");
  const eased = 1 - (1 - travel) ** 3;
  const opacity = interpolate(t, [0, 0.12, 0.72, 0.88], [0, 1, 1, 0], "clamp");
  const press = interpolate(t, [0.08, 0.15], [1.08, 1], "clamp");
  return { eased, opacity, press };
}

function Hand() {
  const { colors } = useAppTheme();
  return (
    <SymbolView
      fallback={<Text style={{ fontSize: 34 }}>👆</Text>}
      name="hand.point.up.left.fill"
      size={40}
      tintColor={colors.foreground}
    />
  );
}

/** A looping hand that acts out the current step on top of the deck card. */
export function DeckTutorialOverlay({ step }: { step: DeckTutorialStep }) {
  const { colors } = useAppTheme();
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(progress);
    progress.value = 0;
    if (reducedMotion || step === "done") return;
    const loops = step === "swipe" ? SWIPE_PATHS.length : 1;
    progress.value = withRepeat(
      withTiming(loops, {
        duration: 1800 * loops,
        easing: Easing.linear,
      }),
      -1,
    );
    return () => cancelAnimation(progress);
  }, [progress, reducedMotion, step]);

  const peelHandStyle = useAnimatedStyle(() => {
    if (reducedMotion) return { opacity: 1 };
    const { eased, opacity, press } = demoPhase(progress.value % 1);
    return {
      opacity,
      transform: [
        { translateX: -72 * eased },
        { translateY: -64 * eased },
        { scale: press },
      ],
    };
  });

  const cornerPulseStyle = useAnimatedStyle(() => {
    const t = reducedMotion ? 0.5 : progress.value % 1;
    return {
      opacity: interpolate(t, [0, 0.15, 0.6], [0, 0.45, 0], "clamp"),
      transform: [{ scale: interpolate(t, [0, 0.6], [0.5, 1.5], "clamp") }],
    };
  });

  const swipeHandStyle = useAnimatedStyle(() => {
    if (reducedMotion) return { opacity: 1 };
    const segment = Math.min(
      SWIPE_PATHS.length - 1,
      Math.floor(progress.value),
    );
    const path = SWIPE_PATHS[segment]!;
    const { eased, opacity, press } = demoPhase(progress.value - segment);
    return {
      opacity,
      transform: [
        { translateX: path.x * eased },
        { translateY: path.y * eased },
        { scale: press },
      ],
    };
  });

  if (step === "done") return null;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[CARD_FRAME, { zIndex: 10 }]}
    >
      {step === "peel" ? (
        <>
          <Animated.View
            style={[
              {
                position: "absolute",
                right: -14,
                bottom: -14,
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: colors.primary,
              },
              cornerPulseStyle,
            ]}
          />
          {/* The fingertip is the glyph's top-left; start it on the corner. */}
          <Animated.View
            style={[
              { position: "absolute", right: -18, bottom: -26 },
              peelHandStyle,
            ]}
          >
            <Hand />
          </Animated.View>
        </>
      ) : (
        <Animated.View
          style={[
            {
              position: "absolute",
              left: "50%",
              top: "50%",
              marginLeft: -8,
              marginTop: -4,
            },
            swipeHandStyle,
          ]}
        >
          <Hand />
        </Animated.View>
      )}
    </View>
  );
}

const COACH_COPY: Record<
  DeckTutorialStep,
  { badge: string; title: string; detail: string }
> = {
  peel: {
    badge: "1",
    title: "Kelupas sudut kartu",
    detail: "Tarik sudut kanan bawah untuk melihat artinya.",
  },
  swipe: {
    badge: "2",
    title: "Geser ke atas, kiri, atau kanan",
    detail: "Kartu berikutnya langsung muncul.",
  },
  done: {
    badge: "✓",
    title: "Mantap, kamu siap berlatih!",
    detail: "Coba lagi sesukamu, kartunya terus berputar.",
  },
};

/** The current tutorial step, shown under the deck. */
export function DeckTutorialCoach({ step }: { step: DeckTutorialStep }) {
  const copy = COACH_COPY[step];
  return (
    <View
      accessibilityLiveRegion="polite"
      className="flex-row items-center gap-3 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3"
    >
      <View className="size-7 items-center justify-center rounded-full bg-primary">
        <Text className="text-xs font-black text-primary-foreground">
          {copy.badge}
        </Text>
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-sm font-bold text-foreground">{copy.title}</Text>
        <Text className="text-xs leading-4 text-muted-foreground">
          {copy.detail}
        </Text>
      </View>
      {step !== "done" ? (
        <Text className="text-xs font-bold text-muted-foreground">
          {copy.badge}/2
        </Text>
      ) : null}
    </View>
  );
}
