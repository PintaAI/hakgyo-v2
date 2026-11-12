import { router } from "expo-router";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AppState,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FullWindowOverlay } from "react-native-screens";

import { nativeAnchorRect, type Rect } from "../tour/native-anchors";
import { useTourControl } from "../tour/tour-provider";
import type { NativeAnchor, TourTargetId } from "../tour/tours";
import { focusedScroll, scrollMetrics } from "./demo-scroll";
import {
  type DemoScriptId,
  demoScripts,
  type DemoStep,
  type DemoTap,
} from "./demo-scripts";

type DemoContextValue = {
  start: (id: DemoScriptId) => void;
  stop: () => void;
  running: DemoScriptId | null;
};

const DemoContext = createContext<DemoContextValue | null>(null);

/** How long a target may take to appear after navigating to its screen. */
const TARGET_TIMEOUT_MS = 2000;
const POLL_MS = 100;
/** From the touch showing to the step acting, as a finger would press. */
const PRESS_MS = 420;
/** Where a revealed target comes to rest, below the header. */
const REVEAL_TOP = 132;
const TOUCH_SIZE = 46;

class Aborted extends Error {}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function measure(view: View | null): Promise<Rect | null> {
  return new Promise((resolve) => {
    if (!view) return resolve(null);
    view.measureInWindow((x, y, width, height) =>
      resolve(width > 0 && height > 0 ? { x, y, width, height } : null),
    );
  });
}

function easeInOut(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function isNativeAnchor(tap: DemoTap): tap is NativeAnchor {
  return tap.startsWith("native:");
}

/**
 * Plays a scripted walk through the app for screen recordings: it switches
 * tabs, opens screens and scrolls by itself, and shows a touch wherever it
 * "taps". Started from Pengaturan > Pengembangan; tours stay away meanwhile.
 */
export function DemoProvider({ children }: { children: ReactNode }) {
  const tours = useTourControl();
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [running, setRunning] = useState<DemoScriptId | null>(null);
  const [touch, setTouch] = useState<{ x: number; y: number; key: number }>();
  const run = useRef(0);
  // The latest layout, read by a script that is already running.
  const layout = useRef({ window, insets });
  useEffect(() => {
    layout.current = { window, insets };
  }, [insets, window]);

  const stop = useCallback(() => {
    run.current += 1;
    tours.setPaused(false);
    setRunning(null);
    setTouch(undefined);
  }, [tours]);

  const start = useCallback(
    (id: DemoScriptId) => {
      const token = ++run.current;
      const alive = () => {
        if (token !== run.current) throw new Aborted();
      };
      const sleep = async (ms: number) => {
        await wait(ms);
        alive();
      };
      // Screens open above the tabs: the Profil sheet the demo starts from,
      // then whatever the script opens. `back` closes only those, so a step
      // skipped for a missing target cannot back out of the tabs.
      let depth = 1;

      const locate = async (tap: DemoTap): Promise<Rect | null> => {
        if (isNativeAnchor(tap)) {
          const organization = tours.getTarget("header.organization");
          return nativeAnchorRect(tap, {
            ...layout.current,
            organization: await measure(organization?.ref.current ?? null),
          });
        }
        return measure(tours.getTarget(tap)?.ref.current ?? null);
      };

      /** The target once its screen has rendered it, or null in time. */
      const waitForTarget = async (target: TourTargetId) => {
        for (let waited = 0; waited < TARGET_TIMEOUT_MS; waited += POLL_MS) {
          const rect = await locate(target);
          alive();
          if (rect) return rect;
          await sleep(POLL_MS);
        }
        return null;
      };

      const showTouch = async (rect: Rect) => {
        setTouch({
          x: rect.x + rect.width / 2,
          y: rect.y + rect.height / 2,
          key: Date.now(),
        });
        await sleep(PRESS_MS);
      };

      const tapThen = async (tap: DemoTap | undefined, act: () => void) => {
        const rect = tap ? await locate(tap) : null;
        alive();
        if (rect) await showTouch(rect);
        act();
      };

      /**
       * Eases the focused screen to `to`, kept within its content. False
       * when there was nothing to scroll.
       */
      const scrollTo = async (
        to: (offset: number, top: number) => number,
      ): Promise<boolean> => {
        const scroll = focusedScroll();
        if (!scroll) return false;
        const metrics = await scrollMetrics(
          scroll.view,
          layout.current.insets.bottom,
          scroll.top(),
        );
        alive();
        if (!metrics) return false;
        // A view seen above its known top is resting there (the header
        // inset), so that is where "top" is from now on.
        scroll.noteOffset(metrics.offset);
        const top = Math.min(scroll.top() ?? 0, metrics.offset, 0);
        const from = metrics.offset;
        const target = Math.max(top, Math.min(to(from, top), metrics.max));
        const distance = target - from;
        if (Math.abs(distance) < 2) return false;
        const duration = Math.min(
          1600,
          Math.max(550, Math.abs(distance) * 1.6),
        );
        const began = Date.now();
        await new Promise<void>((resolve) => {
          const frame = () => {
            if (token !== run.current) return resolve();
            const t = Math.min(1, (Date.now() - began) / duration);
            scroll.view.scrollTo({
              y: from + distance * easeInOut(t),
              animated: false,
            });
            if (t < 1) requestAnimationFrame(frame);
            else resolve();
          };
          requestAnimationFrame(frame);
        });
        alive();
        return true;
      };

      /** Runs a step; false when it had nothing to do (a missing target). */
      const perform = async (step: DemoStep): Promise<boolean> => {
        switch (step.kind) {
          case "wait":
            await sleep(step.ms);
            return true;
          case "navigate":
            await tapThen(step.tap, () => router.navigate(step.href));
            return true;
          case "push":
            await tapThen(step.tap, () => {
              depth += 1;
              router.push(step.href);
            });
            return true;
          case "back":
            if (depth === 0 || !router.canGoBack()) return false;
            await tapThen(step.tap, () => {
              depth -= 1;
              router.back();
            });
            return true;
          case "press": {
            const rect = await waitForTarget(step.target);
            const press = tours.getTarget(step.target)?.press.current;
            if (!rect || !press) return false;
            await showTouch(rect);
            // A target's press opens its screen (a lesson, a game).
            depth += 1;
            press();
            return true;
          }
          case "reveal": {
            const rect = await waitForTarget(step.target);
            if (!rect) return false;
            const desired = layout.current.insets.top + REVEAL_TOP;
            return scrollTo((offset) => offset + rect.y - desired);
          }
          case "scroll":
            return scrollTo((offset) => offset + step.by);
          case "scrollTop":
            return scrollTo((_offset, top) => top);
        }
      };

      tours.setPaused(true);
      setRunning(id);
      void (async () => {
        try {
          const steps = demoScripts[id].steps;
          for (let index = 0; index < steps.length; index++) {
            const acted = await perform(steps[index]!);
            // The pause after a step that did nothing (a section this
            // account lacks, a page too short to scroll) would only show a
            // still screen.
            if (!acted && steps[index + 1]?.kind === "wait") index += 1;
            // Each screen gets a moment to settle after a step acts.
            await sleep(150);
          }
        } catch (cause) {
          if (!(cause instanceof Aborted)) console.warn("Demo stopped", cause);
        } finally {
          if (token === run.current) stop();
        }
      })();
    },
    [stop, tours],
  );

  // Leaving the app (or locking the phone) ends the demo.
  useEffect(() => {
    if (!running) return;
    const subscription = AppState.addEventListener("change", (next) => {
      if (next !== "active") stop();
    });
    return () => subscription.remove();
  }, [running, stop]);

  const value = useMemo<DemoContextValue>(
    () => ({ start, stop, running }),
    [running, start, stop],
  );

  return (
    <DemoContext.Provider value={value}>
      {children}
      {running && touch ? (
        <TouchOverlay>
          <TouchDot key={touch.key} x={touch.x} y={touch.y} />
        </TouchOverlay>
      ) : null}
    </DemoContext.Provider>
  );
}

/** Above native headers, tab bars and sheets on iOS; over the app elsewhere. */
function TouchOverlay({ children }: { children: ReactNode }) {
  const layer = (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {children}
    </View>
  );
  return Platform.OS === "ios" ? (
    <FullWindowOverlay>{layer}</FullWindowOverlay>
  ) : (
    layer
  );
}

/** A finger's press: it lands, pushes in, lets go and fades. */
function TouchDot({ x, y }: { x: number; y: number }) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(1.35);
  useEffect(() => {
    const ease = Easing.out(Easing.cubic);
    opacity.value = withSequence(
      withTiming(1, { duration: 120 }),
      withDelay(PRESS_MS + 80, withTiming(0, { duration: 260 })),
    );
    scale.value = withSequence(
      withTiming(1, { duration: 180, easing: ease }),
      withDelay(PRESS_MS - 300, withTiming(0.8, { duration: 110 })),
      withTiming(1.1, { duration: 200, easing: ease }),
    );
  }, [opacity, scale]);
  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));
  return (
    <Animated.View
      style={[
        styles.touch,
        { left: x - TOUCH_SIZE / 2, top: y - TOUCH_SIZE / 2 },
        style,
      ]}
    />
  );
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) throw new Error("DemoProvider is missing");
  return context;
}

const styles = StyleSheet.create({
  touch: {
    position: "absolute",
    width: TOUCH_SIZE,
    height: TOUCH_SIZE,
    borderRadius: TOUCH_SIZE / 2,
    backgroundColor: "rgba(255, 255, 255, 0.55)",
    borderWidth: 2,
    borderColor: "rgba(0, 0, 0, 0.18)",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
});
