import { useAudioPlayer } from "expo-audio";
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Text, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

import type { BadgeClaim } from "../../lib/badge-claims";
import { useScreenActive } from "../../lib/use-screen-active";
import { useAppTheme } from "../../providers/AppThemeProvider";
import { withOpacity } from "../../theme/colors";
import { CourseMedal, GOLD } from "../hangeul-mastery-medal";
import { Action } from "../learning-ui";
import { ConfettiPiece, confettiPieces } from "./confetti";

const claimSound = require("../../../assets/sounds/badge-claim.wav");

const MEDAL_SIZE = 84;
/** From the tap until the claim is saved and the class moves down. */
const CELEBRATION_MS = 2600;
const RAY_COUNT = 12;

/** A fixed, varied burst: the same on every claim, so nothing jitters. */
function medalConfetti(primary: string) {
  return confettiPieces([
    GOLD.face,
    GOLD.rim,
    primary,
    "#F472B6",
    "#34D399",
    "#60A5FA",
  ]);
}

const MEDAL_ORIGIN = { width: MEDAL_SIZE, height: MEDAL_SIZE };

function Rays({ rays }: { rays: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(rays.value, [0, 0.25, 1], [0, 0.85, 0]),
    transform: [
      { rotate: `${rays.value * 50}deg` },
      { scale: interpolate(rays.value, [0, 0.3, 1], [0.6, 1, 1.15]) },
    ],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: MEDAL_SIZE / 2,
          top: MEDAL_SIZE / 2,
          width: 0,
          height: 0,
        },
        style,
      ]}
    >
      {Array.from({ length: RAY_COUNT }, (_, index) => (
        <View
          key={index}
          style={{
            position: "absolute",
            left: -2,
            top: -2,
            width: 4,
            height: 30,
            borderRadius: 2,
            backgroundColor: withOpacity(GOLD.face, 0.9),
            transform: [
              { rotate: `${(index * 360) / RAY_COUNT}deg` },
              { translateY: -(MEDAL_SIZE / 2 + 30) },
            ],
          }}
        />
      ))}
    </Animated.View>
  );
}

/**
 * The medal of a finished course with its claim moment. Before the claim it
 * is grey with a slow shine; claiming flips it to gold with a light burst,
 * rays, confetti and a chime.
 */
function ClaimMedal({
  glyph,
  claimed,
  celebrating,
}: {
  glyph: string;
  claimed: boolean;
  celebrating: boolean;
}) {
  const { colors } = useAppTheme();
  const reduceMotion = useReducedMotion();
  const pieces = useRef(medalConfetti(colors.primary)).current;
  const breathe = useSharedValue(1);
  const shine = useSharedValue(0);
  const pop = useSharedValue(1);
  const flip = useSharedValue(claimed ? 1 : 0);
  const ring = useSharedValue(0);
  const rays = useSharedValue(0);
  const burst = useSharedValue(0);
  // Belajar stays mounted under other tabs and screens: loop only in view.
  const inFront = useScreenActive();

  // Waiting to be claimed: breathes and shines, inviting the tap.
  useEffect(() => {
    if (claimed || celebrating || reduceMotion || !inFront) return;
    breathe.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 1100, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
    shine.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 0 }),
        withDelay(900, withTiming(1, { duration: 900 })),
      ),
      -1,
    );
    return () => {
      breathe.value = 1;
      shine.value = 0;
    };
  }, [breathe, celebrating, claimed, inFront, reduceMotion, shine]);

  useEffect(() => {
    if (!celebrating) return;
    breathe.value = withTiming(1, { duration: 120 });
    if (reduceMotion) {
      flip.value = withTiming(1, { duration: 250 });
      return;
    }
    // Anticipation, then the pop as the coin turns gold.
    pop.value = withSequence(
      withTiming(0.82, { duration: 140, easing: Easing.out(Easing.quad) }),
      withSpring(1.3, { damping: 7, stiffness: 190 }),
      withSpring(1, { damping: 11, stiffness: 140 }),
    );
    flip.value = withDelay(
      140,
      withTiming(1, { duration: 820, easing: Easing.out(Easing.cubic) }),
    );
    ring.value = withDelay(
      380,
      withTiming(1, { duration: 750, easing: Easing.out(Easing.quad) }),
    );
    rays.value = withDelay(
      360,
      withTiming(1, { duration: 1500, easing: Easing.out(Easing.quad) }),
    );
    burst.value = withDelay(
      380,
      withTiming(1, { duration: 1500, easing: Easing.linear }),
    );
  }, [breathe, burst, celebrating, flip, pop, rays, reduceMotion, ring]);

  const medalStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 600 },
      { scale: breathe.value * pop.value },
      // Two full turns; the face swaps to gold at the first edge-on point.
      { rotateY: `${flip.value * 720}deg` },
    ],
  }));
  const greyStyle = useAnimatedStyle(() => ({
    opacity: flip.value < 0.125 ? 1 : 0,
  }));
  const goldStyle = useAnimatedStyle(() => ({
    opacity: flip.value < 0.125 ? 0 : 1,
  }));
  const shineStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(shine.value, [0, 1], [-MEDAL_SIZE, MEDAL_SIZE]),
      },
      { rotate: "20deg" },
    ],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ring.value, [0, 0.1, 1], [0, 0.8, 0]),
    transform: [{ scale: interpolate(ring.value, [0, 1], [0.7, 2.3]) }],
  }));

  return (
    <View style={{ width: MEDAL_SIZE, height: MEDAL_SIZE }}>
      <Rays rays={rays} />
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            borderRadius: MEDAL_SIZE / 2,
            borderWidth: 3,
            borderColor: GOLD.face,
          },
          ringStyle,
        ]}
      />
      <Animated.View style={medalStyle}>
        <Animated.View style={[{ position: "absolute" }, greyStyle]}>
          <CourseMedal size={MEDAL_SIZE} glyph={glyph} unclaimed />
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              borderRadius: MEDAL_SIZE / 2,
              overflow: "hidden",
            }}
          >
            <Animated.View
              style={[
                {
                  position: "absolute",
                  top: -MEDAL_SIZE / 2,
                  left: MEDAL_SIZE / 2 - 9,
                  width: 18,
                  height: MEDAL_SIZE * 2,
                  backgroundColor: "rgba(255,255,255,0.55)",
                },
                shineStyle,
              ]}
            />
          </View>
        </Animated.View>
        <Animated.View style={goldStyle}>
          <CourseMedal size={MEDAL_SIZE} glyph={glyph} />
        </Animated.View>
      </Animated.View>
      {pieces.map((piece, index) => (
        <ConfettiPiece
          key={index}
          burst={burst}
          piece={piece}
          origin={MEDAL_ORIGIN}
        />
      ))}
    </View>
  );
}

function longDate(date: Date) {
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * The end of a finished curriculum's Bab list: the course badge, claimed by
 * the learner. The claim is saved when the celebration ends (or the card
 * leaves the screen first), which then files the class under Diarsipkan.
 */
export function BadgeClaimCard({
  courseTitle,
  glyph,
  claim,
  completedAt,
  onClaim,
}: {
  courseTitle: string;
  glyph: string;
  claim: BadgeClaim | undefined;
  /** When the last lesson was finished, from the synced progress. */
  completedAt: Date | null;
  onClaim: () => void;
}) {
  const { colors, colorScheme } = useAppTheme();
  const [celebrating, setCelebrating] = useState(false);
  const player = useAudioPlayer(claimSound);
  const pendingClaim = useRef<(() => void) | null>(null);
  const claimed = !!claim;
  const text = useSharedValue(claimed ? 1 : 0);

  // Saves a claim still in its celebration when the card goes away.
  useEffect(
    () => () => {
      pendingClaim.current?.();
      pendingClaim.current = null;
    },
    [],
  );

  const startClaim = () => {
    if (celebrating || claimed) return;
    setCelebrating(true);
    try {
      void player.seekTo(0);
      player.play();
    } catch {
      // The chime is optional.
    }
    text.value = withDelay(500, withSpring(1, { damping: 12 }));
    AccessibilityInfo.announceForAccessibility(`Lencana ${courseTitle} diraih`);
    pendingClaim.current = onClaim;
    setTimeout(() => {
      const save = pendingClaim.current;
      pendingClaim.current = null;
      save?.();
    }, CELEBRATION_MS);
  };

  const doneStyle = useAnimatedStyle(() => ({
    opacity: text.value,
    transform: [{ scale: interpolate(text.value, [0, 1], [0.85, 1]) }],
  }));

  const earned = claim
    ? (completedAt ?? new Date(claim.claimedAt))
    : (completedAt ?? new Date());
  const gold = colorScheme === "dark" ? GOLD.face : GOLD.rim;
  const showDone = claimed || celebrating;

  return (
    <View
      className="items-center gap-4 rounded-2xl border px-5 py-6"
      style={{
        borderColor: withOpacity(GOLD.glow, showDone ? 0.45 : 0.25),
        backgroundColor: withOpacity(
          GOLD.face,
          colorScheme === "dark" ? 0.1 : 0.12,
        ),
      }}
    >
      <ClaimMedal glyph={glyph} claimed={claimed} celebrating={celebrating} />
      <View className="w-full items-center">
        {showDone ? (
          <Animated.View className="items-center gap-1" style={doneStyle}>
            <Text
              className="text-[11px] font-bold uppercase tracking-[1.5px]"
              style={{ color: gold }}
            >
              Lencana diraih
            </Text>
            <Text
              className="text-center text-xl font-black leading-7"
              style={{ color: colors.foreground }}
            >
              {courseTitle}
            </Text>
            <Text className="text-center text-sm text-muted-foreground">
              Selesai {longDate(earned)}
            </Text>
          </Animated.View>
        ) : (
          <View className="w-full items-center gap-1">
            <Text
              className="text-[11px] font-bold uppercase tracking-[1.5px]"
              style={{ color: gold }}
            >
              Kurikulum selesai
            </Text>
            <Text
              className="text-center text-xl font-black leading-7"
              style={{ color: colors.foreground }}
            >
              Lencanamu menunggu
            </Text>
            <Text className="pb-3 text-center text-sm leading-5 text-muted-foreground">
              Semua bab {courseTitle} sudah kamu tuntaskan.
            </Text>
            <Action leadingIcon="sparkles" onPress={startClaim}>
              Klaim lencana
            </Action>
          </View>
        )}
      </View>
    </View>
  );
}
