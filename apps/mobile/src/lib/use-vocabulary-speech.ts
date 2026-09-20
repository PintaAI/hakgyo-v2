import { useCallback, useEffect, useRef, useState } from "react";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
  type ExpoSpeechRecognitionErrorEvent,
  type ExpoSpeechRecognitionResultEvent,
} from "expo-speech-recognition";

import {
  speechLangForMode,
  type VocabularySpeechMode,
} from "./vocabulary-speech";

export type VocabularySpeechStatus =
  "idle" | "requesting" | "listening" | "stopping";

const INITIAL_SILENCE_MS = 8_000;
const TRAILING_SILENCE_MS = 1_100;
const SPEECH_END_GRACE_MS = 300;
const RESTART_GUARD_MS = 400;
const MAX_SERVICE_RETRIES = 4;

function wait(delay: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, delay));
}

type UseVocabularySpeechOptions = {
  mode: VocabularySpeechMode;
  /** Bias the recognizer towards the current queue (terms or definitions). */
  contextualStrings?: readonly string[];
  disabled?: boolean;
  onInterim?: (text: string) => void;
  onFinal?: (transcripts: string[]) => void;
};

function alternativesFromEvent(event: ExpoSpeechRecognitionResultEvent) {
  return event.results
    .map((result) => result.transcript.trim())
    .filter((text) => text.length > 0);
}

export function useVocabularySpeech({
  mode,
  contextualStrings,
  disabled = false,
  onInterim,
  onFinal,
}: UseVocabularySpeechOptions) {
  const [status, setStatus] = useState<VocabularySpeechStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string>();
  const [recoverableError, setRecoverableError] = useState(false);
  const [volume, setVolume] = useState(0);
  const state = useRef({ mode, disabled, onInterim, onFinal, status });
  state.current = { mode, disabled, onInterim, onFinal, status };
  const contextRef = useRef<readonly string[]>(contextualStrings ?? []);
  contextRef.current = contextualStrings ?? [];
  // Last interim transcript without a final yet. Submitted on `end` so a
  // visible answer is still graded when the OS ends the session (manual
  // stop, timeout) without ever sending a final result.
  const pendingInterim = useRef<string | null>(null);
  const startGeneration = useRef(0);
  const stopKind = useRef<"abort" | "finalize" | null>(null);
  const nextStartAt = useRef(0);
  const restartDelay = useRef(RESTART_GUARD_MS);
  const serviceFailures = useRef(0);
  const endpointTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const clearEndpointTimer = useCallback(() => {
    if (endpointTimer.current !== undefined) {
      clearTimeout(endpointTimer.current);
      endpointTimer.current = undefined;
    }
  }, []);

  const finalizeAfter = useCallback(
    (delay: number) => {
      clearEndpointTimer();
      endpointTimer.current = setTimeout(() => {
        endpointTimer.current = undefined;
        if (state.current.status !== "listening") return;
        stopKind.current = "finalize";
        setStatus("stopping");
        try {
          // iOS may not emit a final result until stop() is requested.
          ExpoSpeechRecognitionModule.stop();
        } catch {
          /* The native recognizer already ended. */
        }
      }, delay);
    },
    [clearEndpointTimer],
  );

  const abort = useCallback(() => {
    const currentStatus = state.current.status;
    startGeneration.current += 1;
    clearEndpointTimer();
    pendingInterim.current = null;
    stopKind.current = "abort";
    if (currentStatus === "idle") return;
    if (currentStatus === "requesting") {
      setStatus("idle");
      return;
    }
    setStatus("stopping");
    try {
      ExpoSpeechRecognitionModule.abort();
    } catch {
      /* Recognition was not running or module unavailable (e.g. Expo Go). */
      nextStartAt.current = Date.now() + RESTART_GUARD_MS;
      setStatus("idle");
    }
  }, [clearEndpointTimer]);

  // Never leak recognition across unmount or language switches.
  useEffect(() => () => abort(), [abort]);
  useEffect(() => {
    abort();
  }, [mode, abort]);

  useSpeechRecognitionEvent("result", (event) => {
    const current = state.current;
    if (
      (current.status !== "listening" && current.status !== "stopping") ||
      stopKind.current === "abort"
    )
      return;
    const transcripts = alternativesFromEvent(event);
    if (!transcripts.length) return;
    serviceFailures.current = 0;
    restartDelay.current = RESTART_GUARD_MS;
    if (event.isFinal) {
      clearEndpointTimer();
      pendingInterim.current = null;
      current.onFinal?.(transcripts);
    } else {
      pendingInterim.current = transcripts[0]!;
      current.onInterim?.(transcripts[0]!);
      finalizeAfter(TRAILING_SILENCE_MS);
    }
  });

  useSpeechRecognitionEvent("start", () => {
    // Restart quietly if the learner has not begun speaking yet. Hands-free
    // mode will open a fresh recognition session after this one ends.
    finalizeAfter(INITIAL_SILENCE_MS);
  });

  useSpeechRecognitionEvent("speechstart", () => {
    clearEndpointTimer();
  });

  useSpeechRecognitionEvent("speechend", () => {
    // Give the recognizer a brief window to deliver its last partial before
    // requesting the final result.
    finalizeAfter(SPEECH_END_GRACE_MS);
  });

  useSpeechRecognitionEvent(
    "error",
    (event: ExpoSpeechRecognitionErrorEvent) => {
      if (state.current.status === "idle") return;
      clearEndpointTimer();
      const nativeError = event.error as string;
      // abort() is an intentional lifecycle transition (typing, reveal,
      // swipe, mode change, or user stop), not a recognition failure.
      if (nativeError === "aborted" && stopKind.current === "abort") return;
      const silenceError =
        nativeError === "no-speech" || nativeError === "speech-timeout";
      const throttled =
        event.code === 10 || nativeError === "too-many-requests";
      const serviceError =
        nativeError === "busy" ||
        nativeError === "client" ||
        nativeError === "network" ||
        nativeError === "interrupted";
      if (silenceError) {
        restartDelay.current = 600;
      } else if (serviceError) {
        serviceFailures.current += 1;
        restartDelay.current = Math.min(
          4_000,
          1_000 * 2 ** (serviceFailures.current - 1),
        );
      }
      const retryable =
        silenceError ||
        (serviceError && serviceFailures.current <= MAX_SERVICE_RETRIES);
      setRecoverableError(retryable);
      setErrorMessage(
        throttled
          ? "Speech recognition is temporarily rate-limited. Wait a moment, then try again."
          : serviceError && !retryable
            ? "Speech recognition needs a short break. Tap the mic to try again."
            : nativeError === "not-allowed"
              ? "Microphone or speech permission was denied. You can still type your answer."
              : silenceError
                ? "We didn’t hear anything. Try again or type instead."
                : nativeError === "language-not-supported"
                  ? "This language isn’t supported on this device. Typing still works."
                  : "Speech didn’t work. Try again or type instead.",
      );
    },
  );

  useSpeechRecognitionEvent("end", () => {
    clearEndpointTimer();
    const current = state.current;
    const active =
      current.status === "listening" || current.status === "stopping";
    const shouldSubmitFallback = stopKind.current !== "abort";
    const fallback = pendingInterim.current;
    pendingInterim.current = null;
    stopKind.current = null;
    if (!active) return;
    nextStartAt.current = Date.now() + restartDelay.current;
    setStatus("idle");
    // No final result arrived (manual stop, OS timeout): grade what the
    // user already saw instead of leaving the answer unsubmitted.
    if (shouldSubmitFallback && fallback) current.onFinal?.([fallback]);
  });

  useSpeechRecognitionEvent("volumechange", (event) => {
    setVolume(event.value);
  });

  const start = useCallback(async () => {
    const current = state.current;
    if (current.disabled || current.status !== "idle") return;
    const generation = ++startGeneration.current;
    setErrorMessage(undefined);
    setRecoverableError(false);
    pendingInterim.current = null;
    setStatus("requesting");
    try {
      const permission =
        await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (generation !== startGeneration.current) return;
      if (!permission.granted) {
        setRecoverableError(false);
        setErrorMessage(
          "Microphone or speech permission was denied. You can still type your answer.",
        );
        setStatus("idle");
        return;
      }
      if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
        setRecoverableError(false);
        setErrorMessage(
          "Speech recognition isn’t available on this device. Typing still works.",
        );
        setStatus("idle");
        return;
      }
      const guardDelay = nextStartAt.current - Date.now();
      if (guardDelay > 0) await wait(guardDelay);
      if (generation !== startGeneration.current) return;
      const nativeState = await ExpoSpeechRecognitionModule.getStateAsync();
      if (generation !== startGeneration.current) return;
      if (nativeState !== "inactive") {
        serviceFailures.current += 1;
        restartDelay.current = Math.min(
          4_000,
          1_000 * 2 ** (serviceFailures.current - 1),
        );
        nextStartAt.current = Date.now() + restartDelay.current;
        const retryable = serviceFailures.current <= MAX_SERVICE_RETRIES;
        setRecoverableError(retryable);
        setErrorMessage(
          retryable
            ? "Speech recognition is still finishing. Retrying…"
            : "Speech recognition needs a short break. Tap the mic to try again.",
        );
        setStatus("idle");
        return;
      }
      stopKind.current = null;
      ExpoSpeechRecognitionModule.start({
        lang: speechLangForMode(current.mode),
        interimResults: true,
        maxAlternatives: 5,
        continuous: false,
        contextualStrings: [...contextRef.current].slice(0, 20),
        androidIntentOptions: {
          EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 500,
          EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 700,
          EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS:
            TRAILING_SILENCE_MS,
        },
      });
      if (generation !== startGeneration.current) {
        ExpoSpeechRecognitionModule.abort();
        return;
      }
      setStatus("listening");
    } catch {
      if (generation !== startGeneration.current) return;
      setRecoverableError(false);
      setErrorMessage("Speech didn’t start. Try again or type instead.");
      setStatus("idle");
    }
  }, []);

  const stop = useCallback(() => {
    clearEndpointTimer();
    if (state.current.status !== "listening") return;
    stopKind.current = "finalize";
    setStatus("stopping");
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      /* Resolves via the end event or stays idle. */
      nextStartAt.current = Date.now() + RESTART_GUARD_MS;
      setStatus("idle");
    }
  }, [clearEndpointTimer]);

  const toggle = useCallback(() => {
    if (state.current.status === "listening") stop();
    else void start();
  }, [start, stop]);

  const clearError = useCallback(() => {
    serviceFailures.current = 0;
    restartDelay.current = RESTART_GUARD_MS;
    setErrorMessage(undefined);
    setRecoverableError(false);
  }, []);

  return {
    status,
    errorMessage,
    recoverableError,
    volume,
    start,
    stop,
    abort,
    toggle,
    clearError,
  };
}
