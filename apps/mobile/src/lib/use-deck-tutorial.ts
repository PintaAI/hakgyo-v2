import { useCallback, useEffect, useState } from "react";

import type { DeckTutorialStep } from "../components/onboarding-deck-tutorial";
import { hasSeenDeckTutorial, markDeckTutorialSeen } from "./deck-tutorial";

/** How long the "done" coach stays before the tutorial leaves for good. */
const DONE_MS = 2000;
/** Cards after which a step the learner skips is not asked again. */
const MAX_PEEL_CARDS = 3;
const MAX_TUTORIAL_CARDS = 5;

/**
 * The deck tutorial a learner sees on their first vocabulary deck: peel the
 * card, swipe it, then switch the answer language with the flag. Onboarding
 * already teaches peel and swipe and marks the tutorial seen. Feed it the
 * deck's reveal, advance and interaction events and the flag's changes; it
 * marks itself seen when every step was tried, or after a few cards.
 */
export function useDeckTutorial() {
  const [active] = useState(() => !hasSeenDeckTutorial());
  const [peeled, setPeeled] = useState(false);
  const [advances, setAdvances] = useState(0);
  const [switched, setSwitched] = useState(false);
  const [touching, setTouching] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const step: DeckTutorialStep =
    !peeled && advances < MAX_PEEL_CARDS
      ? "peel"
      : advances === 0
        ? "swipe"
        : !switched && advances < MAX_TUTORIAL_CARDS
          ? "language"
          : "done";
  const done = step === "done";

  useEffect(() => {
    if (!active || !done) return;
    markDeckTutorialSeen();
    const timer = setTimeout(() => setDismissed(true), DONE_MS);
    return () => clearTimeout(timer);
  }, [active, done]);

  const visible = active && !dismissed;
  return {
    /** Show the coach card in place of the deck's status line. */
    visible,
    step,
    steps: 3,
    /** Show the hand over the card; it steps aside while a finger is on it. */
    showHand: visible && (step === "peel" || step === "swipe") && !touching,
    /** Pulse the flag button. */
    highlightLanguage: visible && step === "language",
    onReveal: useCallback(() => setPeeled(true), []),
    onAdvance: useCallback(() => setAdvances((count) => count + 1), []),
    onLanguageChange: useCallback(() => setSwitched(true), []),
    onInteractionChange: setTouching,
  };
}
