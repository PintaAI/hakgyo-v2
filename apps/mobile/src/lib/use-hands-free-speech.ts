import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo } from "react-native";
import {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { useVocabularySpeech } from "./use-vocabulary-speech";
import {
  matchSpeechAlternative,
  type VocabularySpeechMode,
} from "./vocabulary-speech";

const AUTO_ADVANCE_MS = 650;
const MISS_DISPLAY_MS = 1_500;

type UseHandsFreeSpeechOptions = {
  mode: VocabularySpeechMode;
  /** Bias the recognizer towards the current queue (terms or definitions). */
  contextualStrings: readonly string[];
  expectedAnswer: string;
  /** Speech must stay off, e.g. there is no card or the deck is moving. */
  blocked: boolean;
  /** The current card is still waiting for an answer. */
  canAnswer: boolean;
  /** The current answer is correct and saved, so hands-free may move on. */
  canAutoAdvance: boolean;
  onAdvance: () => void;
  onInterim: (text: string) => void;
  /** A final transcript that matches the expected answer. */
  onAnswer: (transcripts: string[]) => void;
  /** A final transcript that does not match; the caller clears its answer. */
  onMiss: () => void;
};

/**
 * Hands-free vocabulary practice: listens on every card, submits a matching
 * word, flags a wrong one in the answer field, and moves on once a correct
 * answer is saved, until the learner stops it or a fatal error occurs.
 */
export function useHandsFreeSpeech({
  mode,
  contextualStrings,
  expectedAnswer,
  blocked,
  canAnswer,
  canAutoAdvance,
  onAdvance,
  onInterim,
  onAnswer,
  onMiss,
}: UseHandsFreeSpeechOptions) {
  const [handsFree, setHandsFree] = useState(false);
  const [typing, setTyping] = useState(false);
  // A word that did not match: shown in red in the answer field for a moment,
  // then the field asks the learner to say it again.
  const [misheard, setMisheard] = useState<string | null>(null);
  const [retryPrompt, setRetryPrompt] = useState(false);
  const latest = useRef({ canAnswer, expectedAnswer, handsFree, misheard });
  latest.current = { canAnswer, expectedAnswer, handsFree, misheard };
  const callbacks = useRef({ onAdvance, onInterim, onAnswer, onMiss });
  callbacks.current = { onAdvance, onInterim, onAnswer, onMiss };
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const missTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }],
  }));

  function clearAutoTimer() {
    if (autoAdvanceTimer.current !== undefined) {
      clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = undefined;
    }
  }

  function clearMissTimer() {
    if (missTimer.current !== undefined) {
      clearTimeout(missTimer.current);
      missTimer.current = undefined;
    }
  }

  function clearMiss() {
    clearMissTimer();
    setMisheard(null);
    setRetryPrompt(false);
  }

  function showMiss(text: string) {
    clearMissTimer();
    setMisheard(text);
    setRetryPrompt(false);
    shake.value = withSequence(
      withTiming(-7, { duration: 60 }),
      withTiming(7, { duration: 70 }),
      withTiming(-4, { duration: 60 }),
      withTiming(0, { duration: 60 }),
    );
    AccessibilityInfo.announceForAccessibility(
      `Terdengar ${text}. Ucapkan lagi.`,
    );
    missTimer.current = setTimeout(() => {
      missTimer.current = undefined;
      setMisheard(null);
      setRetryPrompt(true);
    }, MISS_DISPLAY_MS);
  }

  const speech = useVocabularySpeech({
    mode,
    contextualStrings,
    disabled: blocked || typing,
    onInterim: (text) => {
      if (!latest.current.canAnswer) return;
      // The learner is speaking again: replace the red word right away.
      if (latest.current.misheard !== null) {
        clearMissTimer();
        setMisheard(null);
      }
      callbacks.current.onInterim(text);
    },
    onFinal: (transcripts) => {
      const current = latest.current;
      // A continuous session can outlive the answer; ignore what it hears
      // once the card is graded so it cannot flag a miss on a saved answer.
      if (!current.canAnswer) return;
      if (
        current.handsFree &&
        !matchSpeechAlternative(current.expectedAnswer, transcripts)
      ) {
        if (transcripts[0]) showMiss(transcripts[0]);
        callbacks.current.onMiss();
        return;
      }
      callbacks.current.onAnswer(transcripts);
    },
  });
  const fatalError = Boolean(speech.errorMessage && !speech.recoverableError);
  const { start, status } = speech;

  useEffect(() => {
    if (!handsFree || !canAnswer || typing || fatalError || status !== "idle")
      return;
    void start();
  }, [canAnswer, fatalError, handsFree, start, status, typing]);

  const { abort: abortSpeech } = speech;
  // Close the mic once the card no longer takes an answer (graded, saving or
  // revealed), instead of leaving a continuous session open until the next card.
  useEffect(() => {
    if (handsFree && !canAnswer && status === "listening") abortSpeech();
  }, [abortSpeech, canAnswer, handsFree, status]);

  useEffect(() => {
    if (handsFree && fatalError) setHandsFree(false);
  }, [fatalError, handsFree]);

  useEffect(() => {
    if (!handsFree || !canAutoAdvance) return;
    clearAutoTimer();
    autoAdvanceTimer.current = setTimeout(() => {
      autoAdvanceTimer.current = undefined;
      callbacks.current.onAdvance();
    }, AUTO_ADVANCE_MS);
    return clearAutoTimer;
  }, [canAutoAdvance, handsFree]);

  useEffect(
    () => () => {
      clearAutoTimer();
      clearMissTimer();
    },
    [],
  );

  /** Pauses listening for a card change, reveal or drag. */
  function interrupt() {
    clearAutoTimer();
    setTyping(false);
    clearMiss();
    speech.abort();
  }

  function stop() {
    interrupt();
    setHandsFree(false);
  }

  return {
    handsFree,
    typing,
    // Hands-free restarts the recognizer after every miss or silence. Treat
    // the whole session as listening so hints stay steady across restarts.
    listening: handsFree && !typing && canAnswer,
    speechBusy: status !== "idle",
    // Errors hands-free retries on its own are not worth showing.
    speechError:
      speech.errorMessage && !(handsFree && speech.recoverableError)
        ? speech.errorMessage
        : undefined,
    misheard,
    retryPrompt,
    shakeStyle,
    levels: speech.levels,
    toggle() {
      if (handsFree) {
        stop();
        return;
      }
      speech.clearError();
      setTyping(false);
      setHandsFree(true);
    },
    stop,
    interrupt,
    clearMiss,
    /** The learner focused or edited the field: hold listening while they type. */
    beginTyping() {
      if (!handsFree) return;
      clearAutoTimer();
      setTyping(true);
      clearMiss();
      speech.abort();
    },
    endTyping() {
      setTyping(false);
    },
    /**
     * Flags a typed hands-free answer that does not match, like a misheard
     * word. Returns true when the caller should clear the field instead of
     * grading it.
     */
    rejectTyped(answer: string) {
      if (!handsFree || matchSpeechAlternative(expectedAnswer, [answer]))
        return false;
      if (answer.trim()) showMiss(answer.trim());
      return true;
    },
  };
}
