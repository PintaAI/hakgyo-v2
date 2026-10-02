"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(onChange: () => void) {
  const query = window.matchMedia(reducedMotionQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    () => window.matchMedia(reducedMotionQuery).matches,
    () => false,
  );
}

/**
 * Steps through a looping demo while its element is on screen. Each entry in
 * `durations` is how long that step stays visible; the demo restarts from the
 * first step whenever it scrolls back into view. With reduced motion the demo
 * stays on its final step.
 */
export function useTimeline<T extends HTMLElement>(
  durations: readonly number[],
) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  const [step, setStep] = useState(0);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry!.isIntersecting);
        if (!entry!.isIntersecting) setStep(0);
      },
      { threshold: 0.3 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || reducedMotion) return;
    const timeout = setTimeout(
      () => setStep((current) => (current + 1) % durations.length),
      durations[step],
    );
    return () => clearTimeout(timeout);
  }, [durations, inView, reducedMotion, step]);

  return {
    ref,
    step: reducedMotion ? durations.length - 1 : step,
    playing: inView && !reducedMotion,
  };
}

/** Counts down once per second while `playing`, wrapping back to `from`. */
export function useCountdown(from: number, playing: boolean) {
  const [seconds, setSeconds] = useState(from);
  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(
      () => setSeconds((current) => (current > 0 ? current - 1 : from)),
      1000,
    );
    return () => clearInterval(interval);
  }, [from, playing]);
  return seconds;
}

/** Whether the element is at least partly on screen (never with reduced motion). */
export function useInView<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry!.isIntersecting),
      { threshold: 0.2 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { ref, inView: inView && !reducedMotion };
}
