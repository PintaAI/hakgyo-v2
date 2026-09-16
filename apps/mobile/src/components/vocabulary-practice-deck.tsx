import {
  type Ref,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  type NativeGesture,
} from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useDerivedValue,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN, scheduleOnUI } from "react-native-worklets";

import {
  DECK_BOTTOM_SPACE,
  DECK_CARD_HEIGHT,
  DECK_TOP_SPACE,
  vocabularyDeckPose,
  vocabularyDeckOrdinals,
  vocabularyDeckSwipe,
  prepareVocabularySwipeThrow,
  stepVocabularyDeckFlights,
  vocabularySwipeCardPose,
  type VocabularyDeckFlight,
  type VocabularySwipeMotion,
} from "../lib/vocabulary-deck-motion";
import {
  vocabularyAnswerTextLayout,
  vocabularyPromptTextLayout,
} from "../lib/vocabulary-card-text";
import { useAppTheme } from "../providers/AppThemeProvider";
import {
  vocabularyStickerPeel,
  vocabularyStickerPeelAtTip,
  vocabularyStickerPeelCompletion,
  vocabularyStickerPeelGesture,
} from "../lib/vocabulary-sticker-peel";
import { withOpacity } from "../theme/colors";
import { useApiAssetResolver, type AssetUrlResolver } from "./content-renderer";

export type VocabularyPracticeDeckCard = {
  id: string;
  prompt: string;
  answer: string;
  imageAssetId?: string | null;
  imageAccessibilityLabel?: string;
};

export type VocabularyPracticeDeckHandle = {
  advance: () => void;
};

type VocabularyPracticeDeckProps = {
  ref: Ref<VocabularyPracticeDeckHandle>;
  cards: readonly VocabularyPracticeDeckCard[];
  index: number;
  correct: boolean | undefined;
  revealed: boolean;
  onReveal: () => void;
  scrollGesture: NativeGesture;
  disabled?: boolean;
  onInteractionChange: (busy: boolean) => void;
  onAdvanceComplete: () => void;
};

// Parents own keyboard input and may render on every keystroke. Forward their
// latest callbacks through stable handles so typing doesn't rebuild the scene
// or detach its native gestures. Never ignore callback changes in a comparator.
export function VocabularyPracticeDeck(props: VocabularyPracticeDeckProps) {
  const callbacks = useRef(props);
  callbacks.current = props;
  const onReveal = useCallback(() => callbacks.current.onReveal(), []);
  const onInteractionChange = useCallback(
    (busy: boolean) => callbacks.current.onInteractionChange(busy),
    [],
  );
  const onAdvanceComplete = useCallback(
    () => callbacks.current.onAdvanceComplete(),
    [],
  );
  return (
    <VocabularyDeckScene
      {...props}
      onReveal={onReveal}
      onInteractionChange={onInteractionChange}
      onAdvanceComplete={onAdvanceComplete}
    />
  );
}

const VocabularyDeckScene = memo(function VocabularyDeckScene({
  ref,
  cards,
  index,
  correct,
  revealed,
  onReveal,
  scrollGesture,
  disabled = false,
  onInteractionChange,
  onAdvanceComplete,
}: VocabularyPracticeDeckProps) {
  // Capture only a scalar in worklets, never the full vocabulary payload.
  const count = cards.length;
  const turn = useSharedValue(0);
  const width = useSharedValue(0);
  const peelOrdinal = useSharedValue(-1);
  const peelTipX = useSharedValue(0);
  const peelTipY = useSharedValue(0);
  const interaction = useSharedValue<
    "idle" | "dragging" | "settling" | "advancing" | "handoff"
  >("idle");
  const swipeMotion = useSharedValue<VocabularySwipeMotion>({
    ordinal: -1,
    x: 0,
    y: 0,
    releaseProgress: 0,
    flight: null,
    status: "dragging",
  });
  const flights = useSharedValue<VocabularyDeckFlight[]>([]);
  const [flyingOrdinals, setFlyingOrdinals] = useState<number[]>([]);
  const renderedOrdinals = useMemo(
    () => vocabularyDeckOrdinals(index, count, flyingOrdinals),
    [index, count, flyingOrdinals],
  );
  const resolveAssetUrl = useApiAssetResolver();
  const preloadedImageUrls = useRef(new Set<string>());
  const [completedAnswers, setCompletedAnswers] = useState<
    Record<number, { correct: boolean | undefined; revealed: boolean }>
  >({});
  const mounted = useRef(true);
  const advanceCompleteRef = useRef(onAdvanceComplete);
  advanceCompleteRef.current = () => {
    // Keep the outgoing face intact while it finishes flying independently.
    setCompletedAnswers((answers) => ({
      ...answers,
      [index]: { correct, revealed },
    }));
    onAdvanceComplete();
  };
  const reducedMotion = useReducedMotion();
  const { fontScale } = useWindowDimensions();
  const cardHeight = DECK_CARD_HEIGHT * Math.max(1, fontScale / 1.2);
  const { colors } = useAppTheme();
  const revealRequestRef = useRef({
    index,
    disabled,
    correct,
    revealed,
    onReveal,
  });
  revealRequestRef.current = { index, disabled, correct, revealed, onReveal };

  const revealCard = useCallback((ordinal: number) => {
    const current = revealRequestRef.current;
    // Ignore a queued reveal from an outgoing card or an already graded answer.
    if (
      !mounted.current ||
      ordinal !== current.index ||
      current.disabled ||
      current.correct !== undefined ||
      current.revealed
    )
      return;
    current.onReveal();
  }, []);

  const requestReveal = useCallback(() => {
    "worklet";
    if (interaction.value !== "idle" || disabled || index >= count) return;
    scheduleOnRN(revealCard, index);
  }, [count, disabled, index, interaction, revealCard]);

  const revealOrdinal = useCallback(
    (ordinal: number) => {
      scheduleOnUI((requestedOrdinal: number) => {
        "worklet";
        if (interaction.value === "idle")
          scheduleOnRN(revealCard, requestedOrdinal);
      }, ordinal);
    },
    [interaction, revealCard],
  );

  useEffect(() => {
    // Keep a small runway ahead of rapid consecutive swipes. Resolving the URL
    // and prefetching its bytes are separate caches, and both are shared with
    // the CardContent instances below.
    const assetIds = new Set<string>();
    for (const card of cards.slice(index, index + 4)) {
      if (card.imageAssetId) assetIds.add(card.imageAssetId);
    }
    for (const assetId of assetIds) {
      void resolveAssetUrl(assetId)
        .then((url) => {
          if (!url) return;
          if (preloadedImageUrls.current.has(url)) return;
          preloadedImageUrls.current.add(url);
          return Image.prefetch(url).then(
            (cached) => {
              if (!cached) preloadedImageUrls.current.delete(url);
            },
            () => {
              preloadedImageUrls.current.delete(url);
            },
          );
        })
        .catch(() => {
          /* CardContent can retry a failed URL resolution. */
        });
    }
  }, [cards, index, resolveAssetUrl]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      scheduleOnUI(() => {
        "worklet";
        cancelAnimation(turn);
        cancelAnimation(peelTipX);
        cancelAnimation(peelTipY);
        flights.value = [];
      });
    };
  }, [flights, peelTipX, peelTipY, turn]);

  const finishAdvance = useCallback(() => {
    if (!mounted.current) return;
    // Keep the UI-thread interaction lock until React commits the next index.
    advanceCompleteRef.current();
  }, []);

  const syncFlyingOrdinals = useCallback((ordinals: number[]) => {
    if (mounted.current) setFlyingOrdinals(ordinals);
  }, []);

  useFrameCallback(
    useCallback(
      (frame) => {
        "worklet";
        if (flights.value.length === 0) return;
        const elapsed = frame.timeSincePreviousFrame;
        if (elapsed === null) return;
        const previous = flights.value;
        const next = stepVocabularyDeckFlights(
          previous,
          elapsed / 1000,
          turn.value,
          count,
        );
        flights.value = next.flights;
        // Cross runtimes only when a flight ends, never on each physics frame.
        if (next.flights.length !== previous.length) {
          scheduleOnRN(
            syncFlyingOrdinals,
            next.flights.map((entry) => entry.ordinal),
          );
        }
        // Don't touch a button animation or a new drag during older returns.
        if (next.turn !== turn.value) turn.value = next.turn;
        if (next.advanceOrdinal !== null) {
          swipeMotion.value = { ...swipeMotion.value, ordinal: -1 };
          interaction.value = "handoff";
          scheduleOnRN(finishAdvance);
        }
      },
      [
        count,
        finishAdvance,
        flights,
        interaction,
        swipeMotion,
        syncFlyingOrdinals,
        turn,
      ],
    ),
  );

  const reportInteraction = useCallback(
    (busy: boolean) => {
      if (mounted.current) onInteractionChange(busy);
    },
    [onInteractionChange],
  );

  useEffect(() => {
    // Reading a shared value from JS would synchronously wait for the UI thread.
    scheduleOnUI(() => {
      "worklet";
      swipeMotion.value = { ...swipeMotion.value, ordinal: -1 };
      interaction.value = "idle";
    });
  }, [index, interaction, swipeMotion]);

  const rotateToBack = useCallback(() => {
    "worklet";
    interaction.value = "advancing";
    scheduleOnRN(reportInteraction, true);
    turn.value = withSequence(
      withTiming(index + 0.5, {
        duration: reducedMotion ? 0 : 360,
        easing: Easing.inOut(Easing.cubic),
      }),
      withTiming(
        index + 1,
        {
          duration: reducedMotion ? 0 : 420,
          easing: Easing.out(Easing.cubic),
        },
        (finished) => {
          if (finished) scheduleOnRN(finishAdvance);
        },
      ),
    );
  }, [
    finishAdvance,
    index,
    interaction,
    reducedMotion,
    reportInteraction,
    turn,
  ]);

  const advanceFromButton = useCallback(() => {
    "worklet";
    if (
      interaction.value !== "idle" ||
      disabled ||
      (correct === undefined && !revealed) ||
      index >= count
    )
      return;
    rotateToBack();
  }, [correct, count, disabled, index, interaction, revealed, rotateToBack]);

  useImperativeHandle(
    ref,
    () => ({
      advance() {
        scheduleOnUI(advanceFromButton);
      },
    }),
    [advanceFromButton],
  );

  const throwUpward = useCallback(
    (velocityX: number, velocityY: number) => {
      "worklet";
      interaction.value = "advancing";
      if (reducedMotion) {
        turn.value = index + 1;
        scheduleOnRN(finishAdvance);
        return;
      }
      const flight = prepareVocabularySwipeThrow(
        swipeMotion.value,
        turn.value - index,
        velocityX,
        velocityY,
        width.value,
        cardHeight,
        count,
      );
      swipeMotion.value = flight;
      if (flight.flight) {
        flights.value = [
          ...flights.value,
          { ordinal: index, flight: flight.flight },
        ];
        scheduleOnRN(
          syncFlyingOrdinals,
          flights.value.map((entry) => entry.ordinal),
        );
      }
    },
    [
      cardHeight,
      count,
      finishAdvance,
      flights,
      index,
      interaction,
      reducedMotion,
      swipeMotion,
      syncFlyingOrdinals,
      turn,
      width,
    ],
  );

  const settleBack = useCallback(() => {
    "worklet";
    // Keep a tiny timeline range even if the finger has returned to y=0, so
    // any remaining horizontal offset can spring home instead of snapping.
    const releaseProgress = Math.max(turn.value - index, 0.001);
    swipeMotion.value = {
      ...swipeMotion.value,
      releaseProgress,
      status: "settling",
    };
    interaction.value = "settling";
    turn.value = index + releaseProgress;
    turn.value = withSpring(
      index,
      {
        stiffness: 240,
        damping: 24,
        mass: 0.7,
        // Never overshoot an integer: that would address the previous card.
        overshootClamping: true,
      },
      (finished) => {
        if (finished) {
          swipeMotion.value = { ...swipeMotion.value, ordinal: -1 };
          interaction.value = "idle";
          scheduleOnRN(reportInteraction, false);
        }
      },
    );
  }, [index, interaction, reportInteraction, swipeMotion, turn]);

  const swipe = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!disabled && index < count)
        .shouldCancelWhenOutside(false)
        // The parent must wait while this card decides whether a touch is an
        // upward swipe. Downward/sideways touches fail below and release scrolling.
        .blocksExternalGesture(scrollGesture)
        .maxPointers(1)
        .activeOffsetY(-8)
        .failOffsetY(8)
        .failOffsetX([-18, 18])
        .onStart(() => {
          if (interaction.value !== "idle") return;
          swipeMotion.value = {
            ordinal: index,
            x: 0,
            y: 0,
            releaseProgress: 0,
            flight: null,
            status: "dragging",
          };
          interaction.value = "dragging";
          scheduleOnRN(reportInteraction, true);
        })
        .onUpdate((event) => {
          if (interaction.value !== "dragging") return;
          if (event.numberOfPointers !== 1) {
            settleBack();
            return;
          }
          const pull = vocabularyDeckSwipe(
            event.translationY,
            event.velocityY,
            cardHeight,
          );
          swipeMotion.value = {
            ...swipeMotion.value,
            x: Math.max(
              -width.value * 0.3,
              Math.min(width.value * 0.3, event.translationX),
            ),
            y:
              event.translationY < 0
                ? event.translationY
                : event.translationY * 0.18,
          };
          turn.value = index + (reducedMotion ? 0 : pull.progress);
        })
        .onEnd((event, success) => {
          if (interaction.value !== "dragging") return;
          const pull = vocabularyDeckSwipe(
            event.translationY,
            event.velocityY,
            cardHeight,
          );
          if (success && pull.commit)
            throwUpward(event.velocityX, event.velocityY);
          else settleBack();
        })
        .onFinalize(() => {
          // Interrupted touches must return the card without advancing the round.
          if (interaction.value === "dragging") settleBack();
        }),
    [
      cardHeight,
      count,
      disabled,
      index,
      interaction,
      reducedMotion,
      reportInteraction,
      scrollGesture,
      settleBack,
      swipeMotion,
      throwUpward,
      turn,
      width,
    ],
  );

  const peelGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(
          !disabled && index < count && correct === undefined && !revealed,
        )
        .shouldCancelWhenOutside(false)
        .blocksExternalGesture(scrollGesture)
        .maxPointers(1)
        .minDistance(3)
        // Only the already-lifted bottom-right corner can start a peel. Everywhere
        // else remains available to the upward card gesture and normal taps.
        .hitSlop({ right: 0, bottom: 0, width: 104, height: 104 })
        .onBegin((event) => {
          if (interaction.value !== "idle") return;
          cancelAnimation(peelTipX);
          cancelAnimation(peelTipY);
          peelOrdinal.value = index;
          peelTipX.value = event.x - 1;
          peelTipY.value = event.y - 1;
        })
        .onUpdate((event) => {
          if (
            interaction.value !== "idle" ||
            peelOrdinal.value !== index ||
            event.numberOfPointers !== 1
          )
            return;
          peelTipX.value = event.x - 1;
          peelTipY.value = event.y - 1;
        })
        .onEnd((event, success) => {
          if (interaction.value !== "idle" || peelOrdinal.value !== index)
            return;
          const pull = vocabularyStickerPeelGesture(
            event.translationX,
            event.translationY,
            event.velocityX,
            event.velocityY,
            Math.max(1, width.value - 2),
            cardHeight - 2,
          );
          peelTipX.value = event.x - 1;
          peelTipY.value = event.y - 1;
          if (success && pull.commit) {
            const modelWidth = Math.max(1, width.value - 2);
            const modelHeight = cardHeight - 2;
            const completion = vocabularyStickerPeelCompletion(
              event.translationX,
              event.translationY,
              modelWidth,
              modelHeight,
            );
            const finish = {
              duration: reducedMotion
                ? 0
                : Math.max(140, 420 * (1 - pull.progress)),
              easing: Easing.out(Easing.cubic),
            };
            peelTipX.value = withTiming(
              modelWidth + completion.translationX,
              finish,
            );
            peelTipY.value = withTiming(
              modelHeight + completion.translationY,
              finish,
            );
            requestReveal();
          } else {
            const modelWidth = Math.max(1, width.value - 2);
            const modelHeight = cardHeight - 2;
            peelTipX.value = withSpring(modelWidth - 18, {
              stiffness: 260,
              damping: 25,
              mass: 0.65,
              overshootClamping: true,
            });
            peelTipY.value = withSpring(modelHeight - 18, {
              stiffness: 260,
              damping: 25,
              mass: 0.65,
              overshootClamping: true,
            });
          }
        })
        .onFinalize((_event, success) => {
          if (!success && peelOrdinal.value === index) {
            const modelWidth = Math.max(1, width.value - 2);
            const modelHeight = cardHeight - 2;
            peelTipX.value = withSpring(modelWidth - 18, {
              stiffness: 260,
              damping: 25,
              mass: 0.65,
              overshootClamping: true,
            });
            peelTipY.value = withSpring(modelHeight - 18, {
              stiffness: 260,
              damping: 25,
              mass: 0.65,
              overshootClamping: true,
            });
          }
        }),
    [
      cardHeight,
      correct,
      count,
      disabled,
      index,
      interaction,
      peelOrdinal,
      peelTipX,
      peelTipY,
      reducedMotion,
      requestReveal,
      revealed,
      scrollGesture,
      width,
    ],
  );

  const gesture = useMemo(
    () => Gesture.Race(peelGesture, swipe),
    [peelGesture, swipe],
  );

  const completionStyle = useAnimatedStyle(() => {
    const progress = Math.max(0, Math.min(1, (turn.value - count + 1) * 2));
    return {
      opacity: progress,
      zIndex: turn.value >= count - 0.5 ? count + 1 : 0,
      transform: [
        { translateY: reducedMotion ? 0 : (1 - progress) * -18 },
        { scale: reducedMotion ? 1 : 0.965 + progress * 0.035 },
      ],
    };
  });

  return (
    <View
      pointerEvents="box-none"
      style={{
        height: cardHeight + DECK_TOP_SPACE + DECK_BOTTOM_SPACE,
        overflow: "visible",
        zIndex: 1,
      }}
    >
      <GestureDetector gesture={gesture}>
        <View
          collapsable={false}
          onLayout={(event) => {
            width.value = event.nativeEvent.layout.width;
          }}
          style={[styles.stage, { height: cardHeight }]}
        >
          {renderedOrdinals.map((ordinal) => (
            <DeckCard
              key={cards[ordinal]!.id}
              card={cards[ordinal]!}
              ordinal={ordinal}
              count={count}
              turn={turn}
              width={width}
              peelOrdinal={peelOrdinal}
              peelTipX={peelTipX}
              peelTipY={peelTipY}
              swipeMotion={swipeMotion}
              flights={flights}
              resolveAssetUrl={resolveAssetUrl}
              reducedMotion={reducedMotion}
              cardHeight={cardHeight}
              canReveal={
                ordinal === index &&
                !disabled &&
                correct === undefined &&
                !revealed
              }
              onReveal={revealOrdinal}
              active={ordinal === index}
              // Resolve the incoming image before its card reaches the front.
              showContent={ordinal <= index + 1}
              correct={
                ordinal === index ? correct : completedAnswers[ordinal]?.correct
              }
              revealed={
                ordinal === index
                  ? revealed
                  : (completedAnswers[ordinal]?.revealed ?? false)
              }
            />
          ))}
          <Animated.View
            accessibilityElementsHidden={index < cards.length}
            importantForAccessibility={
              index < cards.length ? "no-hide-descendants" : "auto"
            }
            style={[
              styles.card,
              styles.center,
              { backgroundColor: colors.card, borderColor: colors.border },
              completionStyle,
            ]}
          >
            <View
              style={[
                styles.completionMark,
                { backgroundColor: withOpacity(colors.primary, 0.15) },
              ]}
            >
              <Text style={{ color: colors.primary, fontSize: 28 }}>✓</Text>
            </View>
            <Text className="text-center text-2xl font-black text-foreground">
              Round complete
            </Text>
            <Text
              accessibilityLiveRegion="polite"
              className="text-center text-sm text-muted-foreground"
            >
              You’ve reached the end of this mix.
            </Text>
          </Animated.View>
        </View>
      </GestureDetector>
    </View>
  );
});

const DeckCard = memo(function DeckCard({
  card,
  ordinal,
  count,
  turn,
  width,
  peelOrdinal,
  peelTipX,
  peelTipY,
  swipeMotion,
  flights,
  resolveAssetUrl,
  reducedMotion,
  active,
  showContent,
  correct,
  revealed,
  cardHeight,
  canReveal,
  onReveal,
}: {
  card: VocabularyPracticeDeckCard;
  ordinal: number;
  count: number;
  turn: SharedValue<number>;
  width: SharedValue<number>;
  peelOrdinal: SharedValue<number>;
  peelTipX: SharedValue<number>;
  peelTipY: SharedValue<number>;
  swipeMotion: SharedValue<VocabularySwipeMotion>;
  flights: SharedValue<VocabularyDeckFlight[]>;
  resolveAssetUrl: AssetUrlResolver;
  reducedMotion: boolean;
  active: boolean;
  showContent: boolean;
  correct: boolean | undefined;
  revealed: boolean;
  cardHeight: number;
  canReveal: boolean;
  onReveal: (ordinal: number) => void;
}) {
  const { colors, colorScheme } = useAppTheme();
  const revealThisCard = useCallback(
    () => onReveal(ordinal),
    [onReveal, ordinal],
  );
  const poseStyle = useAnimatedStyle(() => {
    const pose = vocabularyDeckPose(ordinal, count, turn.value);
    const returning = flights.value.find((entry) => entry.ordinal === ordinal);
    if (returning && !reducedMotion) {
      const flight = returning.flight;
      return {
        zIndex: flight.behind ? pose.zIndex : count + 1,
        shadowOpacity: 0.12 * (1 - flight.landing),
        transformOrigin: "center center",
        transform: [
          { translateX: flight.x },
          { translateY: flight.y },
          { rotate: "0deg" },
          { scale: flight.scale },
        ],
      };
    }
    if (swipeMotion.value.ordinal === ordinal && !reducedMotion) {
      const flight = vocabularySwipeCardPose(swipeMotion.value, turn.value);
      return {
        zIndex: pose.zIndex,
        shadowOpacity:
          0.12 * Math.min(1, Math.max(0, (ordinal + 1 - turn.value) * 2)),
        transformOrigin: "center center",
        transform: [
          { translateX: flight.x },
          { translateY: flight.y },
          { rotate: `${flight.rotation}deg` },
          { scale: flight.scale },
        ],
      };
    }
    return {
      zIndex: pose.zIndex,
      transformOrigin: "left bottom",
      shadowOpacity: pose.depth < 1 ? 0.12 * (1 - pose.depth) : 0,
      transform: [
        { translateX: (width.value * (1 - pose.scale)) / 2 },
        { translateY: pose.translateY },
        { rotate: `${pose.rotation}deg` },
        { scale: pose.scale },
      ],
    };
  });

  return (
    <Animated.View
      accessibilityElementsHidden={!active}
      importantForAccessibility={active ? "auto" : "no-hide-descendants"}
      style={[
        styles.card,
        styles.pivot,
        { backgroundColor: colors.card, borderColor: colors.border },
        poseStyle,
      ]}
    >
      <View
        style={[
          styles.surface,
          {
            backgroundColor: withOpacity(
              colors.primary,
              colorScheme === "dark" ? 0.22 : 0.08,
            ),
          },
        ]}
      >
        {showContent ? (
          <MemoCardContent
            card={card}
            correct={correct}
            revealed={revealed}
            height={cardHeight - 2}
            width={width}
            ordinal={ordinal}
            peelOrdinal={peelOrdinal}
            peelTipX={peelTipX}
            peelTipY={peelTipY}
            canReveal={canReveal}
            onReveal={revealThisCard}
            counter={`${ordinal + 1} of ${count}`}
            resolveAssetUrl={resolveAssetUrl}
          />
        ) : (
          <View style={styles.center}>
            <Text
              style={{
                color: withOpacity(colors.primary, 0.3),
                fontSize: 28,
                fontWeight: "900",
              }}
            >
              한
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
});

function CardContent({
  card,
  correct,
  revealed,
  height,
  width,
  ordinal,
  peelOrdinal,
  peelTipX,
  peelTipY,
  canReveal,
  onReveal,
  counter,
  resolveAssetUrl,
}: {
  card: VocabularyPracticeDeckCard;
  correct: boolean | undefined;
  revealed: boolean;
  height: number;
  width: SharedValue<number>;
  ordinal: number;
  peelOrdinal: SharedValue<number>;
  peelTipX: SharedValue<number>;
  peelTipY: SharedValue<number>;
  canReveal: boolean;
  onReveal: () => void;
  counter: string;
  resolveAssetUrl: AssetUrlResolver;
}) {
  const { colors, colorScheme } = useAppTheme();
  const answerVisible = revealed || correct !== undefined;
  const reveal = useSharedValue(answerVisible ? 1 : 0);
  const reducedMotion = useReducedMotion();
  const [image, setImage] = useState<{ url: string | null }>();
  const promptText = vocabularyPromptTextLayout(
    card.prompt,
    Boolean(card.imageAssetId),
  );
  const answerText = vocabularyAnswerTextLayout(card.answer);

  useEffect(() => {
    reveal.value = withTiming(answerVisible ? 1 : 0, {
      duration: reducedMotion ? 0 : answerVisible ? 680 : 180,
      easing: Easing.bezier(0.42, 0, 0.32, 1),
    });
  }, [answerVisible, reducedMotion, reveal]);

  useEffect(() => {
    if (!card.imageAssetId) return;
    let active = true;
    void resolveAssetUrl(card.imageAssetId)
      .then((url) => {
        if (active) setImage({ url });
      })
      .catch(() => {
        if (active) setImage({ url: null });
      });
    return () => {
      active = false;
    };
  }, [card.imageAssetId, resolveAssetUrl]);

  const peel = useDerivedValue(() => {
    const cardWidth = Math.max(1, width.value - 2);
    return peelOrdinal.value === ordinal
      ? vocabularyStickerPeelAtTip(
          peelTipX.value,
          peelTipY.value,
          cardWidth,
          height,
        )
      : vocabularyStickerPeel(reveal.value, cardWidth, height);
  });
  // The clipping plane rotates with the live perpendicular-bisector crease.
  // Counter-rotation keeps the printed prompt stationary under that plane.
  const planeStyle = useAnimatedStyle(() => ({
    opacity: peel.value.opacity,
    transform: [
      { translateX: peel.value.maskLeft },
      { translateY: peel.value.maskTop },
      { rotate: `${peel.value.angle}rad` },
    ],
  }));
  // These sizes depend only on the card bounds. Keep the large clipping planes
  // out of Yoga layout while dragging; translation composes before rotation.
  const planeSizeStyle = useAnimatedStyle(() => {
    const span = Math.hypot(Math.max(1, width.value - 2), height) * 2.5 + 64;
    return { width: span * 2, height: span };
  });
  const printSizeStyle = useAnimatedStyle(() => ({
    width: Math.max(1, width.value - 2),
    height,
  }));
  const printStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: peel.value.contentLeft },
      { translateY: peel.value.contentTop },
      { rotate: `${-peel.value.angle}rad` },
    ],
  }));
  const backStyle = useAnimatedStyle(() => {
    // Fabric rejects a matrix mixed with other transform operations. Fold the
    // parent-space translation into the reflection so this stays one matrix.
    const fold = peel.value;
    const matrix = [...fold.backMatrix];
    matrix[12] = fold.backLeft;
    matrix[13] = fold.backTop;
    return { transform: [{ matrix }] };
  });
  const curlStyle = useAnimatedStyle(() => ({
    left: peel.value.creaseLeft,
    width: peel.value.creaseWidth,
    height: peel.value.curlHeight,
  }));
  const peelShadowStyle = useAnimatedStyle(() => ({
    left: peel.value.creaseLeft,
    top: peel.value.creaseTop - 1,
    width: peel.value.creaseWidth,
    height: peel.value.curlHeight * 1.4,
    opacity: peel.value.shadowOpacity * (colorScheme === "dark" ? 0.35 : 1),
  }));
  const feedbackColor =
    correct === undefined
      ? colors.mutedForeground
      : correct === false
        ? colors.destructive
        : colors.primary;
  const stickerBackColor =
    colorScheme === "dark" ? colors.highlightGrayBackground : colors.secondary;
  const stickerBackGradient =
    colorScheme === "dark"
      ? "linear-gradient(135deg, rgba(255,255,255,0.18), rgba(255,255,255,0.025))"
      : `linear-gradient(135deg, ${withOpacity(colors.foreground, 0.1)}, ${withOpacity(colors.foreground, 0)})`;
  const creaseShadowGradient =
    colorScheme === "dark"
      ? "linear-gradient(to bottom, rgba(0,0,0,0.34), rgba(0,0,0,0))"
      : "linear-gradient(to bottom, rgba(0,0,0,0.7), rgba(0,0,0,0))";
  const curlGradient =
    colorScheme === "dark"
      ? "linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0.1) 42%, rgba(255,255,255,0.34) 82%, rgba(255,255,255,0.1))"
      : "linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0.18) 48%, rgba(255,255,255,0.16) 88%, rgba(255,255,255,0.06))";

  return (
    <>
      <View
        pointerEvents="none"
        accessibilityElementsHidden={!answerVisible}
        importantForAccessibility={
          answerVisible ? "auto" : "no-hide-descendants"
        }
        style={[
          styles.face,
          // Match the exposed corner exactly; an alpha tint here lets the
          // blue front surface bleed into the revealed definition.
          { backgroundColor: colors.card },
        ]}
      >
        {correct !== undefined ? (
          <Text
            accessibilityLiveRegion="polite"
            style={{
              color: feedbackColor,
              fontSize: 12,
              fontWeight: "800",
              letterSpacing: 1.2,
            }}
          >
            {correct ? "✓  CORRECT" : "LET’S REMEMBER THIS"}
          </Text>
        ) : null}
        <Text
          numberOfLines={answerText.numberOfLines}
          adjustsFontSizeToFit
          minimumFontScale={answerText.minimumFontScale}
          style={{
            color: colors.foreground,
            fontSize: answerText.fontSize,
            fontWeight: "900",
            lineHeight: answerText.lineHeight,
            textAlign: "center",
          }}
        >
          {card.answer}
        </Text>
        <Text
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.72}
          style={{
            color: colors.mutedForeground,
            fontSize: 14,
            lineHeight: 18,
            textAlign: "center",
          }}
        >
          {card.prompt}
        </Text>
      </View>
      <View
        accessible={canReveal}
        accessibilityRole={canReveal ? "button" : undefined}
        accessibilityLabel={
          canReveal ? `${card.prompt}. Reveal answer` : undefined
        }
        accessibilityHint={
          canReveal
            ? "Shows the answer without earning XP or changing your streak."
            : undefined
        }
        onAccessibilityTap={canReveal ? onReveal : undefined}
        accessibilityActions={
          canReveal ? [{ name: "activate", label: "Reveal answer" }] : undefined
        }
        onAccessibilityAction={(event) => {
          if (canReveal && event.nativeEvent.actionName === "activate")
            onReveal();
        }}
        accessibilityElementsHidden={answerVisible}
        importantForAccessibility={
          answerVisible ? "no-hide-descendants" : "auto"
        }
        style={StyleSheet.absoluteFill}
      >
        <View pointerEvents="none" style={styles.peelEffectsClip}>
          <Animated.View style={[styles.peelPlane, planeSizeStyle, planeStyle]}>
            <Animated.View
              style={[
                styles.peelShadow,
                {
                  experimental_backgroundImage: creaseShadowGradient,
                },
                peelShadowStyle,
              ]}
            />
          </Animated.View>
        </View>
        <Animated.View
          style={[
            styles.peelPlane,
            styles.stickerMask,
            planeSizeStyle,
            planeStyle,
          ]}
        >
          <Animated.View
            style={[
              styles.stickerPrint,
              { backgroundColor: colors.card },
              printSizeStyle,
              printStyle,
            ]}
          >
            <View
              style={[
                styles.face,
                {
                  backgroundColor: withOpacity(
                    colors.primary,
                    colorScheme === "dark" ? 0.22 : 0.08,
                  ),
                },
              ]}
            >
              {card.imageAssetId && image === undefined ? (
                <View
                  style={[styles.image, { height: promptText.imageHeight }]}
                >
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : image?.url ? (
                <Image
                  accessibilityIgnoresInvertColors
                  accessibilityLabel={
                    card.imageAccessibilityLabel ??
                    `${card.prompt} illustration`
                  }
                  resizeMode="contain"
                  source={{ uri: image.url }}
                  style={[styles.image, { height: promptText.imageHeight }]}
                />
              ) : null}
              <Text
                numberOfLines={promptText.numberOfLines}
                adjustsFontSizeToFit
                minimumFontScale={promptText.minimumFontScale}
                style={{
                  color: colors.foreground,
                  fontSize: promptText.fontSize,
                  fontWeight: "900",
                  lineHeight: promptText.lineHeight,
                  textAlign: "center",
                }}
              >
                {card.prompt}
              </Text>
            </View>
          </Animated.View>
          <Animated.View
            pointerEvents="none"
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            style={[
              styles.stickerBack,
              {
                backgroundColor: stickerBackColor,
                borderColor:
                  colorScheme === "dark"
                    ? withOpacity(colors.foreground, 0.22)
                    : "transparent",
                borderWidth: colorScheme === "dark" ? 1 : 0,
                experimental_backgroundImage: stickerBackGradient,
              },
              printSizeStyle,
              backStyle,
            ]}
          />
        </Animated.View>
        <View pointerEvents="none" style={styles.peelEffectsClip}>
          <Animated.View style={[styles.peelPlane, planeSizeStyle, planeStyle]}>
            <Animated.View
              pointerEvents="none"
              accessible={false}
              importantForAccessibility="no-hide-descendants"
              style={[
                styles.peelCurl,
                {
                  experimental_backgroundImage: curlGradient,
                },
                curlStyle,
              ]}
            />
          </Animated.View>
        </View>
      </View>
      <Text
        style={styles.counter}
        className="text-center text-xs text-muted-foreground"
      >
        {counter}
      </Text>
    </>
  );
}

const MemoCardContent = memo(CardContent);

const styles = StyleSheet.create({
  stage: { marginHorizontal: 16, marginTop: DECK_TOP_SPACE },
  card: {
    ...StyleSheet.absoluteFill,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
  },
  pivot: { transformOrigin: "left bottom" },
  surface: { flex: 1, borderRadius: 19, overflow: "visible" },
  peelPlane: {
    position: "absolute",
    left: 0,
    top: 0,
    transformOrigin: "top left",
  },
  peelEffectsClip: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 19,
    overflow: "hidden",
  },
  stickerMask: { overflow: "hidden" },
  stickerPrint: {
    position: "absolute",
    left: 0,
    top: 0,
    transformOrigin: "top left",
    borderRadius: 19,
    overflow: "hidden",
  },
  stickerBack: {
    position: "absolute",
    left: 0,
    top: 0,
    transformOrigin: "top left",
    borderRadius: 19,
  },
  peelShadow: {
    position: "absolute",
    borderRadius: 3,
  },
  peelCurl: {
    position: "absolute",
    bottom: 0,
    borderRadius: 3,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  face: {
    ...StyleSheet.absoluteFill,
    borderRadius: 19,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 36,
  },
  image: {
    height: 96,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  counter: { position: "absolute", bottom: 16, left: 12, right: 12 },
  completionMark: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
});
