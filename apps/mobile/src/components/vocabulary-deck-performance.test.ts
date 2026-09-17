import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import * as jsx from "react/jsx-runtime";
import { memo } from "react";
import * as motion from "../lib/vocabulary-deck-motion";
import * as peel from "../lib/vocabulary-sticker-peel";
import * as textLayout from "../lib/vocabulary-card-text";
import { themeColors, withOpacity } from "../theme/colors";

const require = createRequire(import.meta.url);
const compilerRequire = createRequire(
  require.resolve("react-native-worklets/plugin"),
);
const { transformSync } = compilerRequire("@babel/core");
const filename = new URL("./vocabulary-practice-deck.tsx", import.meta.url)
  .pathname;
const { code } = transformSync(
  `${readFileSync(filename, "utf8")}\nexport { CardContent };`,
  {
    filename,
    babelrc: false,
    configFile: false,
    presets: [compilerRequire.resolve("@babel/preset-typescript")],
    plugins: [
      [
        compilerRequire.resolve("@babel/plugin-transform-react-jsx"),
        { runtime: "automatic" },
      ],
      [
        compilerRequire.resolve("react-native-worklets/plugin"),
        { disableSourceMaps: true },
      ],
      compilerRequire.resolve("@babel/plugin-transform-modules-commonjs"),
    ],
  },
);

function onUI(callback: any): any {
  if (!callback.__initData) return callback;
  const closure = Object.fromEntries(
    Object.entries(callback.__closure).map(([name, value]) => [
      name,
      typeof value === "function" ? onUI(value) : value,
    ]),
  );
  return runInNewContext(`(${callback.__initData.code})`).bind({
    __closure: closure,
  });
}

// Runs the real component tree with native leaves stubbed. Measures mounted
// animation work, not device FPS; native frame timing needs a release build.
function harness() {
  const slots: any[] = [];
  let cursor = 0;
  let dirty = false;
  let effects: (() => void)[] = [];
  const memoResults = new Map<any, { props: any; tree: any }>();
  const hook = (initial: any) => {
    const slot = cursor++;
    if (!(slot in slots))
      slots[slot] = typeof initial === "function" ? initial() : initial;
    return [
      slots[slot],
      (value: any) => {
        slots[slot] = typeof value === "function" ? value(slots[slot]) : value;
        dirty = true;
      },
    ];
  };
  const useMemo = (calculate: () => any, deps: any[]) => {
    const slot = cursor++;
    const previous = slots[slot];
    if (
      !previous ||
      deps.some((value, i) => !Object.is(value, previous.deps[i]))
    ) {
      slots[slot] = { value: calculate(), deps };
    }
    return slots[slot].value;
  };
  const styles: (() => any)[] = [];
  const gestures: Record<string, Function>[] = [];
  let frame: ((value: any) => void) | undefined;
  const dependencies: Record<string, any> = {
    react: {
      memo,
      useState: hook,
      useRef: (value: any) => hook(() => ({ current: value }))[0],
      useCallback: (callback: any, deps: any[]) =>
        useMemo(() => callback, deps),
      useMemo,
      useEffect(effect: () => void, deps: any[]) {
        useMemo(() => {
          effects.push(effect);
        }, deps);
      },
      useImperativeHandle() {},
    },
    "react/jsx-runtime": jsx,
    "react-native": {
      View: "View",
      Text: "Text",
      Image: "Image",
      StyleSheet: { create: (value: any) => value },
      useWindowDimensions: () => ({ fontScale: 1 }),
    },
    "react-native-reanimated": {
      __esModule: true,
      default: { View: "AnimatedView" },
      useSharedValue: (value: any) => hook(() => ({ value }))[0],
      useReducedMotion: () => false,
      useAnimatedStyle: (calculate: any) => {
        calculate = onUI(calculate);
        styles.push(calculate);
        return calculate();
      },
      useDerivedValue: (calculate: any) => {
        const worklet = onUI(calculate);
        return {
          get value() {
            return worklet();
          },
        };
      },
      useFrameCallback: (callback: any) => {
        frame = onUI(callback);
        return { setActive() {} };
      },
      Easing: { cubic: null, inOut() {}, out() {}, bezier() {} },
      cancelAnimation() {},
      withTiming: (value: any) => value,
      withSpring: (value: any) => value,
    },
    "react-native-worklets": {
      scheduleOnRN: (fn: Function, ...args: any[]) => fn(...args),
      scheduleOnUI: (fn: Function, ...args: any[]) => onUI(fn)(...args),
    },
    "react-native-gesture-handler": {
      GestureDetector: "GestureDetector",
      Gesture: {
        Race: (...items: any[]) => ({ composition: "race", items }),
        Exclusive: (...items: any[]) => ({ composition: "exclusive", items }),
        Pan() {
          const callbacks: Record<string, Function> = {};
          const target = { __id: gestures.length };
          const proxy: any = new Proxy(target, {
            get: (object, key: string) => {
              if (key === "__id") return object.__id;
              return (value: any) => {
                if (key.startsWith("on")) callbacks[key] = onUI(value);
                return proxy;
              };
            },
          });
          gestures.push(callbacks);
          return proxy;
        },
      },
    },
    "../providers/AppThemeProvider": {
      useAppTheme: () => ({ colors: themeColors.light, colorScheme: "light" }),
    },
    "../theme/colors": { withOpacity },
    "../lib/vocabulary-deck-motion": motion,
    "../lib/vocabulary-card-text": textLayout,
    "../lib/vocabulary-sticker-peel": peel,
    "./content-renderer": { useApiAssetResolver: () => async () => null },
  };
  const exports: Record<string, any> = {};
  runInNewContext(`(function(require, exports) { ${code}\n })`, {
    global: { Error },
  })((id: string) => dependencies[id], exports);
  return {
    render(name: string, props: any) {
      cursor = 0;
      styles.length = 0;
      gestures.length = 0;
      effects = [];
      let result = exports[name](props);
      // Allow a public callback bridge around the memoized scene.
      while (typeof result?.type === "function" || result?.type?.type) {
        const component = result.type;
        if (component.type) {
          const cached = memoResults.get(component);
          if (
            !dirty &&
            cached &&
            Object.keys(result.props).length ===
              Object.keys(cached.props).length &&
            Object.keys(result.props).every((key) =>
              Object.is(result.props[key], cached.props[key]),
            )
          ) {
            result = cached.tree;
          } else {
            const tree = component.type(result.props);
            memoResults.set(component, { props: result.props, tree });
            result = tree;
          }
        } else result = component(result.props);
      }
      dirty = false;
      for (const effect of effects) effect();
      return result;
    },
    styles,
    gestures,
    tick() {
      frame?.({ timeSincePreviousFrame: 1000 / 60 });
    },
  };
}

function cardNodes(tree: any): any[] {
  if (Array.isArray(tree)) return tree.flatMap(cardNodes);
  if (!tree?.props) return [];
  if (tree.props.card && typeof tree.props.ordinal === "number") return [tree];
  return cardNodes(tree.props.children);
}

function gestureDetector(tree: any): any {
  if (Array.isArray(tree)) {
    for (const child of tree) {
      const detector = gestureDetector(child);
      if (detector) return detector;
    }
    return undefined;
  }
  if (!tree?.props) return undefined;
  if (tree.type === "GestureDetector") return tree;
  return gestureDetector(tree.props.children);
}

test("mounted animated cards stay bounded as a vocabulary round grows", () => {
  for (const count of [24, 240, 2400]) {
    const h = harness();
    const cards = Array.from({ length: count }, (_, id) => ({
      id: `${id}`,
      prompt: "학교",
      answer: "school",
    }));
    const tree = h.render("VocabularyPracticeDeck", {
      cards,
      index: 0,
      correct: undefined,
      revealed: false,
      scrollGesture: {},
      onReveal() {},
      onInteractionChange() {},
      onAdvanceComplete() {},
    });
    expect(cardNodes(tree).length).toBeLessThanOrEqual(5);
    expect(cardNodes(tree).map((node) => node.props.ordinal)).toEqual([
      0, 1, 2, 3, 4,
    ]);
  }
});

test("keyboard parent updates reuse the scene while callbacks stay fresh", () => {
  const h = harness();
  let firstCalls = 0,
    latestCalls = 0;
  const props = {
    cards: [{ id: "one", prompt: "학교", answer: "school" }],
    index: 0,
    correct: undefined,
    revealed: false,
    scrollGesture: {},
    onReveal: () => {
      firstCalls++;
    },
    onInteractionChange() {},
    onAdvanceComplete() {},
  };
  const first = h.render("VocabularyPracticeDeck", props);
  const second = h.render("VocabularyPracticeDeck", {
    ...props,
    onReveal: () => {
      latestCalls++;
    },
    onInteractionChange() {},
    onAdvanceComplete() {},
  });
  expect(second).toBe(first);
  expect(h.gestures.length).toBe(0);
  cardNodes(second)[0].props.onReveal(0);
  expect(firstCalls).toBe(0);
  expect(latestCalls).toBe(1);
});

test("a peel starting in the corner has priority over the upward card swipe", () => {
  const h = harness();
  const tree = h.render("VocabularyPracticeDeck", {
    cards: [{ id: "one", prompt: "학교", answer: "school" }],
    index: 0,
    correct: undefined,
    revealed: false,
    scrollGesture: {},
    onReveal() {},
    onInteractionChange() {},
    onAdvanceComplete() {},
  });
  const gesture = gestureDetector(tree)?.props.gesture;
  // Exclusive recognizers make the first item win. Since the peel's hitSlop
  // confines it to the corner, a swipe outside that area still activates.
  expect(gesture?.composition).toBe("exclusive");
  expect(gesture?.items.map((item: any) => item.__id)).toEqual([1, 0]);
});

test("an outgoing card stays mounted through handoff and is released only after landing", () => {
  const h = harness();
  let index = 0;
  const cards = Array.from({ length: 24 }, (_, id) => ({
    id: `${id}`,
    prompt: "학교",
    answer: "school",
  }));
  const props = {
    cards,
    correct: true,
    revealed: false,
    scrollGesture: {},
    onReveal() {},
    onInteractionChange() {},
    onAdvanceComplete() {
      index++;
    },
  };
  const initial = h.render("VocabularyPracticeDeck", { ...props, index });
  // Supply measured native width before the swipe.
  initial.props.children.props.children.props.onLayout({
    nativeEvent: { layout: { width: 328 } },
  });
  const swipe = h.gestures[0]!;
  swipe.onStart!();
  const release = {
    translationX: 0,
    translationY: -80,
    velocityX: 180,
    velocityY: -1500,
    numberOfPointers: 1,
  };
  swipe.onUpdate!(release);
  swipe.onEnd!(release, true);
  for (let frame = 0; frame < 300 && index === 0; frame++) h.tick();
  expect(index).toBe(1);
  const inFlight = h.render("VocabularyPracticeDeck", { ...props, index });
  const outgoing = cardNodes(inFlight).find((node) => node.props.ordinal === 0);
  expect(outgoing).toBeDefined();
  expect(outgoing.props.correct).toBe(true);
  for (let frame = 0; frame < 300; frame++) h.tick();
  const landed = h.render("VocabularyPracticeDeck", { ...props, index });
  expect(cardNodes(landed).map((node) => node.props.ordinal)).toEqual([
    1, 2, 3, 4, 5,
  ]);
  expect(index).toBe(1);
});

test("the moving peel planes keep their native layout fixed while the finger moves", () => {
  const h = harness();
  const tipX = { value: 310 },
    tipY = { value: 204 };
  h.render("CardContent", {
    card: { id: "one", prompt: "학교", answer: "school" },
    height: 222,
    width: { value: 330 },
    ordinal: 0,
    peelOrdinal: { value: 0 },
    peelTipX: tipX,
    peelTipY: tipY,
    revealed: false,
    canReveal: true,
    onReveal() {},
    resolveAssetUrl: async () => null,
  });
  const before = h.styles.map((calculate) => calculate());
  tipX.value = 140;
  tipY.value = 90;
  const after = h.styles.map((calculate) => calculate());
  // The clipping plane, stationary print, and reflected sticker back move only
  // through transforms. Their dimensions can change on resize, not on drag.
  const planes = before.flatMap((style, i) =>
    style.transform?.some((t: any) => t.rotate !== undefined || t.matrix)
      ? [i]
      : [],
  );
  expect(planes.length).toBeGreaterThanOrEqual(3);
  for (const i of planes) {
    for (const key of ["left", "top", "width", "height"])
      expect(after[i][key]).toEqual(before[i][key]);
    expect(after[i].transform).not.toEqual(before[i].transform);
  }
});

test("Fabric-compatible positioning preserves the printed face and exact folded corner", () => {
  function point(style: any, x: number, y: number): [number, number] {
    // RN 0.86 Fabric's parseProcessedTransform returns identity if a matrix
    // shares a transform list with other operations. Modeling ideal matrix
    // multiplication here previously hid the missing folded-corner regression.
    // react-native/ReactCommon/react/renderer/components/view/conversions.h
    if (
      style.transform.length > 1 &&
      style.transform.some((transform: any) => transform.matrix)
    )
      return [x, y];
    for (const transform of [...style.transform].reverse()) {
      if (transform.translateX !== undefined) x += transform.translateX;
      if (transform.translateY !== undefined) y += transform.translateY;
      if (transform.rotate !== undefined) {
        const angle = parseFloat(transform.rotate);
        [x, y] = [
          x * Math.cos(angle) - y * Math.sin(angle),
          x * Math.sin(angle) + y * Math.cos(angle),
        ];
      }
      if (transform.matrix) {
        const m = transform.matrix;
        [x, y] = [m[0] * x + m[4] * y + m[12], m[1] * x + m[5] * y + m[13]];
      }
    }
    return [x, y];
  }
  for (const [width, height] of [
    [328, 222],
    [600, 310],
  ]) {
    for (const [x, y] of [
      [width! - 18, height! - 18],
      [width! * 0.4, height! * 0.5],
      [-width!, -height!],
    ]) {
      const h = harness();
      h.render("CardContent", {
        card: { id: "one", prompt: "학교", answer: "school" },
        height,
        width: { value: width! + 2 },
        ordinal: 0,
        peelOrdinal: { value: 0 },
        peelTipX: { value: x },
        peelTipY: { value: y },
        revealed: false,
        canReveal: true,
        onReveal() {},
        resolveAssetUrl: async () => null,
      });
      const styles = h.styles.map((calculate) => calculate());
      const rotations = styles.filter((style) =>
        style.transform?.some((t: any) => t.rotate),
      );
      const plane = rotations[0],
        print = rotations[1];
      const back = styles.find((style) =>
        style.transform?.some((t: any) => t.matrix),
      );
      for (const corner of [
        [0, 0],
        [width!, 0],
        [0, height!],
        [width!, height!],
      ]) {
        const printed = point(plane, ...point(print, corner[0]!, corner[1]!));
        expect(printed[0]).toBeCloseTo(corner[0]!, 8);
        expect(printed[1]).toBeCloseTo(corner[1]!, 8);
      }
      const folded = point(plane, ...point(back, width!, height!));
      expect(folded[0]).toBeCloseTo(x!, 8);
      expect(folded[1]).toBeCloseTo(y!, 8);
    }
  }
});
