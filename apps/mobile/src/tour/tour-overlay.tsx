import { type ReactNode, useEffect, useState } from "react";
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FullWindowOverlay } from "react-native-screens";

import { Action } from "../components/ui/action";
import { useAppTheme } from "../providers/AppThemeProvider";
import type { Rect } from "./native-anchors";
import type { TourStep } from "./tours";

const DIM = "rgba(0, 0, 0, 0.62)";
/** Space between the target and the edge of the spotlight. */
const SPOTLIGHT_PADDING = 6;
const CARD_MARGIN = 20;
const CARD_GAP = 14;
const ARROW = 14;
const MOVE = { duration: 280, easing: Easing.out(Easing.cubic) };

/**
 * Above everything, native headers and tab bars included: a window-level
 * overlay on iOS, a transparent modal on Android.
 */
function OverlayHost({
  children,
  onRequestClose,
}: {
  children: ReactNode;
  onRequestClose: () => void;
}) {
  if (Platform.OS === "ios") {
    return <FullWindowOverlay>{children}</FullWindowOverlay>;
  }
  return (
    <Modal
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      animationType="fade"
      onRequestClose={onRequestClose}
    >
      {children}
    </Modal>
  );
}

/** Corner radius of the spotlight; small targets get a pill-like hole. */
const CORNER = 16;

/**
 * One rounded corner of the hole: a small square, clipped, filled with the
 * dim colour except for a quarter circle. A border wider than the circle
 * draws the fill; `center` is the circle's centre inside the square.
 */
function SpotlightCorner({
  style,
  center,
}: {
  style: ReturnType<typeof useAnimatedStyle>;
  center: { x: number; y: number };
}) {
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: 0,
          top: 0,
          width: CORNER,
          height: CORNER,
          overflow: "hidden",
        },
        style,
      ]}
    >
      <View
        style={{
          position: "absolute",
          left: center.x - CORNER * 2,
          top: center.y - CORNER * 2,
          width: CORNER * 4,
          height: CORNER * 4,
          borderWidth: CORNER,
          borderRadius: CORNER * 2,
          borderColor: DIM,
        }}
      />
    </Animated.View>
  );
}

/**
 * The dimmed screen with a rounded hole around `rect`: four screen-sized
 * dim panels around the hole and four small corner pieces inside it. Every
 * piece moves and stretches with transforms driven by the same animated
 * frame, so the hole glides and resizes from step to step on the UI thread
 * without laying anything out.
 */
function Spotlight({ rect }: { rect: Rect }) {
  const window = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const W = window.width;
  const H = window.height;
  const target = {
    x: rect.x - SPOTLIGHT_PADDING,
    y: rect.y - SPOTLIGHT_PADDING,
    width: Math.max(rect.width + SPOTLIGHT_PADDING * 2, CORNER * 2),
    height: Math.max(rect.height + SPOTLIGHT_PADDING * 2, CORNER * 2),
  };
  // The first step opens in place; later ones animate from the last frame.
  const x = useSharedValue(target.x);
  const y = useSharedValue(target.y);
  const w = useSharedValue(target.width);
  const h = useSharedValue(target.height);

  useEffect(() => {
    const to = (value: number) =>
      reducedMotion ? value : withTiming(value, MOVE);
    x.value = to(target.x);
    y.value = to(target.y);
    w.value = to(target.width);
    h.value = to(target.height);
  }, [
    h,
    reducedMotion,
    target.height,
    target.width,
    target.x,
    target.y,
    w,
    x,
    y,
  ]);

  // Each panel is a W×H view. Translations place it; the side panels are
  // scaled about their centre to the hole's height.
  const top = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value - H }],
  }));
  const bottom = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value + h.value }],
  }));
  const left = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value - W },
      { translateY: y.value + h.value / 2 - H / 2 },
      { scaleY: h.value / H },
    ],
  }));
  const right = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value + w.value },
      { translateY: y.value + h.value / 2 - H / 2 },
      { scaleY: h.value / H },
    ],
  }));
  const topLeft = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }],
  }));
  const topRight = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value + w.value - CORNER },
      { translateY: y.value },
    ],
  }));
  const bottomLeft = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value + h.value - CORNER },
    ],
  }));
  const bottomRight = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value + w.value - CORNER },
      { translateY: y.value + h.value - CORNER },
    ],
  }));

  const panel = {
    position: "absolute" as const,
    left: 0,
    top: 0,
    width: W,
    height: H,
    backgroundColor: DIM,
  };
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[panel, top]} />
      <Animated.View style={[panel, bottom]} />
      <Animated.View style={[panel, left]} />
      <Animated.View style={[panel, right]} />
      <SpotlightCorner style={topLeft} center={{ x: CORNER, y: CORNER }} />
      <SpotlightCorner style={topRight} center={{ x: 0, y: CORNER }} />
      <SpotlightCorner style={bottomLeft} center={{ x: CORNER, y: 0 }} />
      <SpotlightCorner style={bottomRight} center={{ x: 0, y: 0 }} />
    </View>
  );
}

export function TourOverlay({
  step,
  index,
  count,
  rect,
  onNext,
  onSkip,
}: {
  step: TourStep;
  index: number;
  count: number;
  rect: Rect | null;
  onNext: () => void;
  onSkip: () => void;
}) {
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const [cardHeight, setCardHeight] = useState(0);
  const reducedMotion = useReducedMotion();
  const last = index === count - 1;

  // Below the spotlight when the card fits there, else above it, else over
  // the bottom of the screen (a target taller than the screen allows).
  const top = insets.top + 8;
  const bottom = window.height - insets.bottom - 8;
  let cardTop: number;
  let arrow: "up" | "down" | null = null;
  if (!rect) {
    cardTop = (window.height - cardHeight) / 2;
  } else {
    const below = rect.y + rect.height + SPOTLIGHT_PADDING + CARD_GAP;
    const above = rect.y - SPOTLIGHT_PADDING - CARD_GAP - cardHeight;
    if (below + cardHeight <= bottom) {
      cardTop = below;
      arrow = "up";
    } else if (above >= top) {
      cardTop = above;
      arrow = "down";
    } else {
      cardTop = bottom - cardHeight;
    }
  }
  const arrowLeft = rect
    ? Math.min(
        Math.max(rect.x + rect.width / 2 - ARROW / 2, CARD_MARGIN + 16),
        window.width - CARD_MARGIN - 16 - ARROW,
      ) - CARD_MARGIN
    : 0;

  return (
    <OverlayHost onRequestClose={onSkip}>
      <View style={StyleSheet.absoluteFill}>
        {/* Swallows touches: the tour explains, the app waits. */}
        <View
          style={StyleSheet.absoluteFill}
          onStartShouldSetResponder={() => true}
        />
        {rect ? (
          <Spotlight rect={rect} />
        ) : (
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { backgroundColor: DIM }]}
          />
        )}
        <Animated.View
          key={`${index}:${step.title}`}
          // Fades in as the spotlight arrives rather than ahead of it.
          entering={reducedMotion ? undefined : FadeIn.delay(140).duration(200)}
          accessibilityViewIsModal
          onLayout={(event) => setCardHeight(event.nativeEvent.layout.height)}
          style={{
            position: "absolute",
            left: CARD_MARGIN,
            right: CARD_MARGIN,
            top: cardTop,
            // Hidden until measured, so it never flashes in the wrong place.
            opacity: cardHeight > 0 ? 1 : 0,
          }}
        >
          {arrow ? (
            <View
              style={{
                position: "absolute",
                left: arrowLeft,
                [arrow === "up" ? "top" : "bottom"]: -ARROW / 2 + 1,
                width: ARROW,
                height: ARROW,
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderLeftWidth: arrow === "up" ? 1 : 0,
                borderTopWidth: arrow === "up" ? 1 : 0,
                borderRightWidth: arrow === "down" ? 1 : 0,
                borderBottomWidth: arrow === "down" ? 1 : 0,
                transform: [{ rotate: "45deg" }],
              }}
            />
          ) : null}
          <View
            className="gap-3 rounded-2xl border p-4"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <View className="gap-1">
              <Text
                accessibilityRole="header"
                className="text-base font-bold text-foreground"
              >
                {step.title}
              </Text>
              <Text className="text-sm leading-5 text-muted-foreground">
                {step.body}
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Text className="flex-1 text-xs font-semibold text-muted-foreground">
                {count > 1 ? `${index + 1} dari ${count}` : ""}
              </Text>
              {last ? null : (
                <Action size="sm" variant="ghost" onPress={onSkip}>
                  Lewati
                </Action>
              )}
              <Action size="sm" onPress={last ? onSkip : onNext}>
                {last ? "Selesai" : "Lanjut"}
              </Action>
            </View>
          </View>
        </Animated.View>
      </View>
    </OverlayHost>
  );
}
