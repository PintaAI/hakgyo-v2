import { useIsFocused } from "expo-router";
import { type RefObject, useEffect } from "react";
import type { ScrollView, View } from "react-native";

type ScrollRef = RefObject<ScrollView | null>;

// Most recently focused last. Screens leave it when they lose focus, so the
// last entry is the screen on view.
const focused: { ref: ScrollRef }[] = [];
/**
 * Each scroll view's content offset at rest at the top: negative by the
 * header inset where the content runs under a transparent header. The lowest
 * offset seen, since a view never rests above its top.
 */
const restingTop = new WeakMap<ScrollRef, number>();

function noteOffset(ref: ScrollRef, offset: number) {
  if (offset > 0) return;
  const known = restingTop.get(ref);
  if (known === undefined || offset < known) restingTop.set(ref, offset);
}

/** Wait for the screen's first layout before measuring its resting offset. */
const MEASURE_TOP_AFTER_MS = 300;

export type ScrollMetrics = {
  /** Current content offset, as `scrollTo` takes it. */
  offset: number;
  /** The offset at rest at the top, if it is known. */
  top: number | null;
  /** The furthest offset that keeps content in view (a little short). */
  max: number;
  /** The scroll view's frame in the window. */
  frame: { y: number; height: number };
};

type MeasurableScrollView = ScrollView & {
  // In ScrollView.js, not yet in its type definitions.
  getInnerViewRef?: () => View | null;
};

function measure(view: View | null) {
  return new Promise<{ y: number; height: number } | null>((resolve) => {
    if (!view) return resolve(null);
    view.measureInWindow((_x, y, width, height) =>
      resolve(width > 0 && height > 0 ? { y, height } : null),
    );
  });
}

/**
 * Where the scroll view is: the content's window position against the scroll
 * view's own frame gives the offset, the content's height the end.
 */
export async function scrollMetrics(
  scroll: ScrollView,
  bottomInset: number,
  top: number | null,
): Promise<ScrollMetrics | null> {
  const frame = await measure(scroll.getNativeScrollRef() as View | null);
  const inner = await measure(
    (scroll as MeasurableScrollView).getInnerViewRef?.() ?? null,
  );
  if (!frame || !inner) return null;
  return {
    offset: frame.y - inner.y,
    top,
    max: inner.height - frame.height + bottomInset,
    frame,
  };
}

/**
 * Lets a scripted demo scroll this screen while it is focused. `StudyScreen`
 * registers itself; screens with their own scroll view call this directly.
 */
export function useDemoScroll(ref: RefObject<ScrollView | null>) {
  const isFocused = useIsFocused();
  useEffect(() => {
    if (!isFocused) return;
    const entry = { ref };
    focused.push(entry);
    const timer = setTimeout(() => {
      const scroll = ref.current;
      if (!scroll) return;
      void scrollMetrics(scroll, 0, null).then((metrics) => {
        if (metrics) noteOffset(ref, metrics.offset);
      });
    }, MEASURE_TOP_AFTER_MS);
    return () => {
      clearTimeout(timer);
      const index = focused.indexOf(entry);
      if (index >= 0) focused.splice(index, 1);
    };
  }, [isFocused, ref]);
}

/** The scroll view of the screen on view, if it registered one. */
export function focusedScroll(): {
  view: ScrollView;
  /** The resting top offset, once it has been seen. */
  top: () => number | null;
  /** Records an offset measured on the view (see `restingTop`). */
  noteOffset: (offset: number) => void;
} | null {
  for (let index = focused.length - 1; index >= 0; index--) {
    const { ref } = focused[index]!;
    if (ref.current) {
      return {
        view: ref.current,
        top: () => restingTop.get(ref) ?? null,
        noteOffset: (offset) => noteOffset(ref, offset),
      };
    }
  }
  return null;
}
