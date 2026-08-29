"use client";

import { useCallback, useEffect, useRef } from "react";

type PendingValue<T> = { value: T } | null;

export function useDebouncedAutosave<T>(
  save: (value: T) => Promise<unknown>,
  delay = 700,
) {
  const saveRef = useRef(save);
  const pendingRef = useRef<PendingValue<T>>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const flush = useCallback((): Promise<void> => {
    clearTimer();

    if (inFlightRef.current) return inFlightRef.current;
    if (!pendingRef.current) return Promise.resolve();

    const run = async () => {
      while (pendingRef.current) {
        const pending = pendingRef.current;
        pendingRef.current = null;

        try {
          await saveRef.current(pending.value);
        } catch (error) {
          // Preserve a failed value unless a newer edit is already waiting.
          pendingRef.current ??= pending;
          throw error;
        }
      }
    };

    const inFlight = run().finally(() => {
      inFlightRef.current = null;
    });
    inFlightRef.current = inFlight;
    return inFlight;
  }, [clearTimer]);

  const schedule = useCallback(
    (value: T) => {
      pendingRef.current = { value };
      clearTimer();
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        void flush().catch(() => undefined);
      }, delay);
    },
    [clearTimer, delay, flush],
  );

  const cancel = useCallback(() => {
    clearTimer();
    pendingRef.current = null;
  }, [clearTimer]);

  useEffect(
    () => () => {
      clearTimer();
      if (pendingRef.current) {
        void flush().catch(() => undefined);
      }
    },
    [clearTimer, flush],
  );

  return { cancel, flush, schedule };
}
