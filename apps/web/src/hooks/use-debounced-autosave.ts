"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { AutosaveStatus } from "~/lib/autosave-registry";
import { onPageHidden } from "~/lib/page-hidden";

type PendingValue<T> = { value: T } | null;

/**
 * Each save is a server call, so edits wait for a pause in typing (`delay`)
 * and arrive as one save. Uninterrupted typing still saves every `maxWait`,
 * and pending edits are saved at once when the tab is hidden or closed and
 * when the editor unmounts.
 */
export function useDebouncedAutosave<T>(
  save: (value: T) => Promise<unknown>,
  delay = 3000,
  maxWait = 30_000,
) {
  const saveRef = useRef(save);
  const pendingRef = useRef<PendingValue<T>>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // When the oldest unsaved edit was made, for `maxWait`.
  const pendingSinceRef = useRef<number | null>(null);
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
    pendingSinceRef.current = null;
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
      const pendingSince = pendingSinceRef.current ?? Date.now();
      clearTimer();
      pendingSinceRef.current = pendingSince;
      const wait = Math.min(delay, pendingSince + maxWait - Date.now());
      timerRef.current = setTimeout(
        () => {
          timerRef.current = null;
          void flush().catch(() => undefined);
        },
        Math.max(0, wait),
      );
    },
    [clearTimer, delay, flush, maxWait],
  );

  useEffect(
    () =>
      onPageHidden(() => {
        if (pendingRef.current) void flush().catch(() => undefined);
      }),
    [flush],
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
