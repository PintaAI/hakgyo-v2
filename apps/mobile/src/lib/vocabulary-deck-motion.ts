import {
  startVocabularyCardFlight,
  stepVocabularyCardFlight,
  type VocabularyCardFlight,
} from "./vocabulary-card-physics";

export const DECK_CARD_HEIGHT = 224;
export const DECK_TOP_SPACE = 40;
// Controls sit immediately below the card; the parent gap provides the visual
// breathing room without reserving another card-sized spacer here.
export const DECK_BOTTOM_SPACE = 0;

/** Four visible layers plus the layer uncovered while they are promoted.
 * Keep returning flights mounted until physics settles, even after a new swipe.
 * Sorting preserves the original native sibling order, including small decks.
 */
export function vocabularyDeckOrdinals(
  index: number,
  count: number,
  flyingOrdinals: readonly number[],
) {
  if (count === 0) return [];
  const ordinals = new Set(flyingOrdinals);
  let restingLayers = 0;
  for (let rank = 0; rank < count && restingLayers < 5; rank++) {
    const ordinal = (index + rank) % count;
    if (!ordinals.has(ordinal)) restingLayers++;
    ordinals.add(ordinal);
  }
  return [...ordinals].sort((a, b) => a - b);
}

/** Promote the underlying cards as the front card is pulled upward. */
export function vocabularyDeckSwipe(
  translationY: number,
  velocityY: number,
  cardHeight: number,
) {
  "worklet";
  const distance = Math.max(0, -translationY);
  const resistance = cardHeight * 0.55;
  const attenuation = Math.exp(-distance / resistance);
  return {
    // Stay before the stacking-order handoff until the user releases.
    progress: 0.38 * (1 - attenuation),
    // A short flick counts; a tiny touch or a deliberate pull back does not.
    commit:
      distance >= 18 &&
      velocityY <= 200 &&
      distance + Math.max(0, -velocityY) * 0.12 >= cardHeight * 0.28,
  };
}

export type VocabularySwipeMotion = {
  ordinal: number;
  x: number;
  y: number;
  releaseProgress: number;
  flight: VocabularyCardFlight | null;
  status: "dragging" | "throwing" | "settling";
};

export type VocabularyDeckFlight = {
  ordinal: number;
  flight: VocabularyCardFlight;
};

export function prepareVocabularySwipeThrow(
  motion: VocabularySwipeMotion,
  releaseProgress: number,
  velocityX: number,
  velocityY: number,
  width: number,
  height: number,
  count: number,
): VocabularySwipeMotion {
  "worklet";
  return {
    ...motion,
    releaseProgress,
    status: "throwing",
    flight: startVocabularyCardFlight(
      motion.x,
      motion.y,
      velocityX,
      velocityY,
      width,
      height,
      count,
      releaseProgress * 2,
    ),
  };
}

/** Swipe transforms come from physical position, not a timed path. */
export function vocabularySwipeCardPose(
  motion: VocabularySwipeMotion,
  turn: number,
) {
  "worklet";
  if (motion.status === "throwing" && motion.flight) {
    return {
      x: motion.flight.x,
      y: motion.flight.y,
      scale: motion.flight.scale,
      rotation: 0,
    };
  }
  const progress = turn - motion.ordinal;
  const remaining =
    motion.status === "settling"
      ? Math.max(0, Math.min(1, progress / (motion.releaseProgress || 1)))
      : 1;
  return {
    x: motion.x * remaining,
    y: motion.y * remaining,
    scale: 1,
    rotation: 0,
  };
}

/** A continuous turn counter keeps every card in sync across the React handoff. */
export function vocabularyDeckPose(
  ordinal: number,
  count: number,
  turn: number,
) {
  "worklet";
  const whole = Math.floor(turn);
  const progress = turn - whole;
  const rank = (ordinal - (whole % count) + count) % count;
  const promotion = Math.min(progress * 2, 1);
  const returning = Math.max(progress * 2 - 1, 0);
  const depth =
    rank === 0
      ? Math.min(count - 1, 3) * returning
      : Math.min(rank - promotion, 3);

  return {
    depth,
    scale: 1 - depth * 0.035,
    // At -96 degrees the departing card is entirely left of the incoming face.
    // Changing the stacking order here cannot cut through overlapping content.
    rotation: rank === 0 ? -96 * Math.sin(progress * Math.PI) : 0,
    translateY: -depth * 18,
    zIndex: rank === 0 && progress >= 0.5 ? 0 : count - rank,
  };
}

/** Returning cards no longer own the front card's gesture or turn counter. */
// Define this after vocabularyDeckPose: worklet closures capture dependencies
// at initialization, so unlike ordinary functions they cannot use hoisting.
export function stepVocabularyDeckFlights(
  previous: readonly VocabularyDeckFlight[],
  elapsedSeconds: number,
  turn: number,
  count: number,
) {
  "worklet";
  const flights: VocabularyDeckFlight[] = [];
  let nextTurn = turn;
  let advanceOrdinal: number | null = null;
  for (const entry of previous) {
    let initial = entry.flight;
    if (initial.behind) {
      // Further swipes can promote the returning card within a small deck.
      // Move its spring target rather than snapping it to a stale stack slot.
      const target = vocabularyDeckPose(
        entry.ordinal,
        count,
        Math.max(turn, entry.ordinal + 1),
      );
      initial = {
        ...initial,
        targetScale: target.scale,
        targetY: target.translateY + (initial.height * (1 - target.scale)) / 2,
      };
    }
    const flight = stepVocabularyCardFlight(initial, elapsedSeconds);
    if (!entry.flight.behind) {
      nextTurn = entry.ordinal + (flight.behind ? 1 : flight.promotion * 0.5);
      if (flight.behind) advanceOrdinal = entry.ordinal;
    }
    if (!flight.settled) flights.push({ ordinal: entry.ordinal, flight });
  }
  return { flights, turn: nextTurn, advanceOrdinal };
}
