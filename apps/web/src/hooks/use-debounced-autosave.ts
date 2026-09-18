"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { AutosaveStatus } from "~/lib/autosave-registry";

type PendingValue<T> = { value: T } | null;

export function useDebouncedAutosave<T>(
  save: (value: T) => Promise<unknown>,
  delay = 700,
) {
  const saveRef = useRef(save);
  const pendingRef = useRef<PendingValue<T>>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const [status, setStatus] = useState<AutosaveStatus>("idle");

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
      setStatus("saving");
      try {
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
        setStatus("saved");
      } catch (error) {
        setStatus("error");
        throw error;
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
      setStatus("pending");
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
    setStatus("idle");
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

  return { cancel, flush, schedule, status };
}
