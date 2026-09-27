import { useSyncExternalStore } from "react";

/**
 * A one-shot request for the Belajar tab to slide its carousel to a cohort
 * (sent from the main sidebar). Each request gets a fresh id so tapping the
 * same cohort again slides again.
 */
export type LearnCohortFocus = { id: number; cohortId: string };

let current: LearnCohortFocus | null = null;
let nextId = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function requestLearnCohortFocus(cohortId: string) {
  nextId += 1;
  current = { id: nextId, cohortId };
  emit();
}

/** Clears the request once handled; a newer request is left alone. */
export function completeLearnCohortFocus(id: number) {
  if (current?.id !== id) return;
  current = null;
  emit();
}

export function useLearnCohortFocus() {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
}
