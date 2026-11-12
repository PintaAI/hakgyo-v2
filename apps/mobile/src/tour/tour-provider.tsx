import { useIsFocused } from "expo-router";
import {
  createContext,
  type ReactNode,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AccessibilityInfo,
  type ScrollView,
  useWindowDimensions,
  type View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { nativeAnchorRect, type Rect } from "./native-anchors";
import { TourOverlay } from "./tour-overlay";
import { forgetSeenTours, hasSeenTour, markTourSeen } from "./tour-storage";
import {
  tours,
  type NativeAnchor,
  type TourId,
  type TourStep,
  type TourTargetId,
} from "./tours";

export type TargetEntry = {
  ref: RefObject<View | null>;
  /** The screen's scroll view, to bring the target into view first. */
  scrollRef: RefObject<ScrollView | null> | null;
  /** What a scripted demo's tap on the target does, if anything. */
  press: RefObject<(() => void) | undefined>;
};

type TourContextValue = {
  register: (id: TourTargetId, entry: TargetEntry) => () => void;
  /** The registered target on the focused screen (for `src/demo`). */
  getTarget: (id: TourTargetId) => TargetEntry | undefined;
  /** While paused, no tour starts (a scripted demo is running). */
  setPaused: (paused: boolean) => void;
  start: (id: TourId) => void;
  /** Shows every tour again on its screen ("Lihat tur aplikasi"). */
  replay: () => Promise<void>;
  activeId: TourId | null;
  /** Bumped by `replay`, so screens check their tour again. */
  replayCount: number;
};

const TourContext = createContext<TourContextValue | null>(null);

/**
 * The scroll view of the current screen. `StudyScreen` provides it, so a
 * target anywhere in a screen can be scrolled into view before it is lit.
 */
export const TourScrollContext =
  createContext<RefObject<ScrollView | null> | null>(null);

/** How often, and how long at most, to wait for a scroll to come to rest. */
const SETTLE_POLL_MS = 32;
const SETTLE_MAX_MS = 600;
/** Space kept clear above a target scrolled into view (header, title). */
const TOP_CLEARANCE = 72;
/** The tab bar and the tooltip below the target. */
const BOTTOM_CLEARANCE = 220;

function measure(view: View | null): Promise<Rect | null> {
  return new Promise((resolve) => {
    if (!view) return resolve(null);
    view.measureInWindow((x, y, width, height) =>
      resolve(width > 0 && height > 0 ? { x, y, width, height } : null),
    );
  });
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * The target's place once a scroll into view has stopped: measured every
 * frame or two until it holds still, so the step shows as soon as the
 * scroll ends instead of after a fixed delay.
 */
async function settledRect(view: View): Promise<Rect | "missing"> {
  let last: Rect | null = null;
  for (let waited = 0; waited < SETTLE_MAX_MS; waited += SETTLE_POLL_MS) {
    await wait(SETTLE_POLL_MS);
    const rect = await measure(view);
    if (!rect) return "missing";
    if (last && Math.abs(rect.y - last.y) < 0.5) return rect;
    last = rect;
  }
  return last ?? "missing";
}

function isNativeAnchor(target: TourStep["target"]): target is NativeAnchor {
  return target !== null && target.startsWith("native:");
}

/**
 * Coach-mark tours: the screen dims, one element at a time stays lit, and a
 * card next to it explains it. Render inside the root navigator; the overlay
 * covers native headers and tab bars too.
 */
export function TourProvider({ children }: { children: ReactNode }) {
  const targets = useRef(new Map<TourTargetId, TargetEntry>());
  const [active, setActive] = useState<{
    id: TourId;
    /** Indexes of the tour's steps whose target is on this screen. */
    order: number[];
    /** Position in `order`. */
    position: number;
    rect: Rect | null;
  } | null>(null);
  const [replayCount, setReplayCount] = useState(0);
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // Each step lookup supersedes the previous one.
  const lookup = useRef(0);
  // Set from `start` until the tour ends: the first step is located before
  // `active` is set, and a second start in between must not run.
  const running = useRef<TourId | null>(null);
  const paused = useRef(false);

  /**
   * Where the step's target is. A target that has to scroll into view gets
   * the place the scroll will put it, so the step shows while the page is
   * still moving; `settled` is its measured place once the scroll stopped
   * (different only when the scroll hit the end of the content).
   */
  const locate = useCallback(
    async (
      step: TourStep,
    ): Promise<
      { rect: Rect | null; settled?: Promise<Rect | "missing"> } | "missing"
    > => {
      if (step.target === null) return { rect: null };
      if (isNativeAnchor(step.target)) {
        const organization = targets.current.get("header.organization");
        return {
          rect: nativeAnchorRect(step.target, {
            window,
            insets,
            organization: await measure(organization?.ref.current ?? null),
          }),
        };
      }
      const entry = targets.current.get(step.target);
      const view = entry?.ref.current;
      if (!entry || !view) return "missing";
      const rect = await measure(view);
      if (!rect) return "missing";
      const top = insets.top + TOP_CLEARANCE;
      const bottom = window.height - insets.bottom - BOTTOM_CLEARANCE;
      const scroll = entry.scrollRef?.current;
      if (!scroll || (rect.y >= top && rect.y + rect.height <= bottom)) {
        return { rect };
      }
      // Scroll so the target starts just below the header. A target's
      // window y is the scroll view's top plus its content y minus the
      // offset, so the offset that puts it at `top` follows directly.
      const scrollTop =
        (await measure(scroll.getNativeScrollRef() as View | null))?.y ?? 0;
      const contentY = await new Promise<number | null>((resolve) => {
        // In ScrollView.js, not yet in its type definitions.
        const inner = (
          scroll as ScrollView & { getInnerViewRef?: () => View | null }
        ).getInnerViewRef?.();
        if (!inner) return resolve(null);
        view.measureLayout(
          inner,
          (_x, y) => resolve(y),
          () => resolve(null),
        );
      });
      if (contentY === null) return { rect };
      const offset = scrollTop + contentY - rect.y;
      const nextOffset = Math.max(0, scrollTop + contentY - top);
      scroll.scrollTo({ y: nextOffset });
      return {
        rect: { ...rect, y: rect.y - (nextOffset - offset) },
        settled: settledRect(view),
      };
    },
    [insets, window],
  );

  const show = useCallback(
    async (id: TourId, order: number[], from: number) => {
      const request = ++lookup.current;
      const steps = tours[id].steps;
      let remaining = order;
      for (let position = from; position < remaining.length; position++) {
        const step = steps[remaining[position]!]!;
        const located = await locate(step);
        if (request !== lookup.current) return;
        if (located === "missing") {
          // Gone since the tour started (a list emptied): drop the step.
          remaining = remaining.filter((_, at) => at !== position);
          position -= 1;
          continue;
        }
        setActive({ id, order: remaining, position, rect: located.rect });
        AccessibilityInfo.announceForAccessibility(
          `${step.title}. ${step.body}`,
        );
        const settled = await located.settled;
        if (request !== lookup.current || !settled || !located.rect) return;
        if (settled !== "missing" && Math.abs(settled.y - located.rect.y) > 1) {
          setActive((current) =>
            current ? { ...current, rect: settled } : current,
          );
        }
        return;
      }
      markTourSeen(id);
      running.current = null;
      setActive(null);
    },
    [locate],
  );

  const start = useCallback(
    (id: TourId) => {
      if (running.current || paused.current) return;
      running.current = id;
      // Steps whose target is not on this screen (no cohorts yet, no class
      // tasks) are left out, so the counter only counts what can show.
      const order = tours[id].steps.flatMap((step, index) =>
        step.target === null ||
        isNativeAnchor(step.target) ||
        targets.current.has(step.target)
          ? [index]
          : [],
      );
      void show(id, order, 0);
    },
    [show],
  );

  const finish = useCallback(() => {
    lookup.current += 1;
    if (active) markTourSeen(active.id);
    running.current = null;
    setActive(null);
  }, [active]);

  const next = useCallback(() => {
    if (active) void show(active.id, active.order, active.position + 1);
  }, [active, show]);

  const replay = useCallback(async () => {
    lookup.current += 1;
    running.current = null;
    setActive(null);
    await forgetSeenTours();
    setReplayCount((count) => count + 1);
  }, []);

  const register = useCallback((id: TourTargetId, entry: TargetEntry) => {
    targets.current.set(id, entry);
    return () => {
      if (targets.current.get(id) === entry) targets.current.delete(id);
    };
  }, []);

  const getTarget = useCallback(
    (id: TourTargetId) => targets.current.get(id),
    [],
  );
  const setPaused = useCallback((next: boolean) => {
    paused.current = next;
  }, []);

  const value = useMemo<TourContextValue>(
    () => ({
      register,
      getTarget,
      setPaused,
      start,
      replay,
      activeId: active?.id ?? null,
      replayCount,
    }),
    [active?.id, getTarget, register, replay, replayCount, setPaused, start],
  );

  const step = active
    ? tours[active.id].steps[active.order[active.position]!]
    : undefined;

  return (
    <TourContext.Provider value={value}>
      {children}
      {active && step ? (
        <TourOverlay
          step={step}
          index={active.position}
          count={active.order.length}
          rect={active.rect}
          onNext={next}
          onSkip={finish}
        />
      ) : null}
    </TourContext.Provider>
  );
}

function useTour() {
  const context = useContext(TourContext);
  if (!context) throw new Error("TourProvider is missing");
  return context;
}

/**
 * Marks a view as a tour target. Attach the returned ref to a host `View`
 * (with `collapsable={false}`). Registered only while the screen is
 * focused: every tab mounts its own header, and the focused one counts.
 */
export function useTourTarget(
  id: TourTargetId,
  enabled = true,
  onDemoPress?: () => void,
) {
  const { register } = useTour();
  const scrollRef = useContext(TourScrollContext);
  const ref = useRef<View>(null);
  const press = useRef(onDemoPress);
  useEffect(() => {
    press.current = onDemoPress;
  });
  const focused = useIsFocused();
  useEffect(() => {
    if (!focused || !enabled) return;
    return register(id, { ref, scrollRef, press });
  }, [enabled, focused, id, register, scrollRef]);
  return ref;
}

/** Reads targets and holds tours back, for the scripted demo (`src/demo`). */
export function useTourControl() {
  const { getTarget, setPaused } = useTour();
  return useMemo(() => ({ getTarget, setPaused }), [getTarget, setPaused]);
}

/** Delay after a screen settles before its tour starts. */
const AUTO_START_MS = 700;

/**
 * Starts the screen's tour once, the first time it is focused with its
 * content (`ready`) on screen. `replay` shows it again.
 */
export function useAutoTour(id: TourId, ready: boolean) {
  const { start, activeId, replayCount } = useTour();
  const focused = useIsFocused();
  useEffect(() => {
    if (!focused || !ready || activeId || hasSeenTour(id)) return;
    const timer = setTimeout(() => start(id), AUTO_START_MS);
    return () => clearTimeout(timer);
  }, [activeId, focused, id, ready, replayCount, start]);
}

export function useTourReplay() {
  return useTour().replay;
}
