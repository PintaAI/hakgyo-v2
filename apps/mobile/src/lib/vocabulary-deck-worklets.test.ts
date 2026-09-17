import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { startVocabularyCardFlight } from "./vocabulary-card-physics";
import type { VocabularyDeckFlight } from "./vocabulary-deck-motion";

// Use the installed native compiler, not Bun's untransformed JS functions:
// worklet dependencies are captured when the module is initialized.
const localRequire = createRequire(import.meta.url);
const compilerRequire = createRequire(
  localRequire.resolve("react-native-worklets/plugin"),
);
const { transformSync } = compilerRequire("@babel/core");
const modules = new Map<string, Record<string, unknown>>();

function compileModule(name: string): Record<string, unknown> {
  const cached = modules.get(name);
  if (cached) return cached;
  const filename = new URL(`./${name}.ts`, import.meta.url).pathname;
  const source = new Bun.Transpiler({ loader: "ts" }).transformSync(
    readFileSync(filename, "utf8"),
  );
  const { code } = transformSync(source, {
    filename,
    babelrc: false,
    configFile: false,
    plugins: [
      [
        compilerRequire.resolve("react-native-worklets/plugin"),
        { disableSourceMaps: true },
      ],
      compilerRequire.resolve("@babel/plugin-transform-modules-commonjs"),
      compilerRequire.resolve("@babel/plugin-transform-block-scoping"),
    ],
  });
  const exports: Record<string, unknown> = {};
  runInNewContext(`(function(require, exports) { ${code}\n })`, {
    global: { Error },
  })((id: string) => compileModule(id.replace("./", "")), exports);
  modules.set(name, exports);
  return exports;
}

type CompiledWorklet = Function & {
  __closure: Record<string, unknown>;
  __initData: { code: string };
};

function onUI(value: unknown): unknown {
  if (typeof value !== "function") return value;
  const worklet = value as CompiledWorklet;
  const closure = Object.fromEntries(
    Object.entries(worklet.__closure).map(([key, dependency]) => [
      key,
      onUI(dependency),
    ]),
  );
  // Execute the serialized UI code with only its captured dependencies.
  return runInNewContext(`(${worklet.__initData.code})`).bind({
    __closure: closure,
  });
}

const step = onUI(
  compileModule("vocabulary-deck-motion").stepVocabularyDeckFlights,
) as typeof import("./vocabulary-deck-motion").stepVocabularyDeckFlights;

test("the sticker's diagonal fold runs on the UI thread and fully leaves the answer", () => {
  const peel = onUI(
    compileModule("vocabulary-sticker-peel").vocabularyStickerPeel,
  ) as typeof import("./vocabulary-sticker-peel").vocabularyStickerPeel;
  for (const [width, height] of [
    [328, 222],
    [600, 310],
  ]) {
    const start = peel(0, width!, height!);
    const middle = peel(0.5, width!, height!);
    const end = peel(1, width!, height!);
    expect(start.opacity).toBe(1);
    expect(middle.opacity).toBe(1);
    expect(middle.curlHeight).toBeGreaterThan(start.curlHeight);
    expect(middle.tipX).toBeLessThan(start.tipX);
    expect(middle.tipY).toBeLessThan(start.tipY);
    expect(middle.angle).toBeCloseTo(start.angle);
    expect(middle.backMatrix).toHaveLength(16);
    expect(end.opacity).toBe(0);
    expect(end.shadowOpacity).toBe(0);
  }
});

test("the deck wires reveal to a finger-driven bottom-right peel", () => {
  const filename = new URL(
    "../components/vocabulary-practice-deck.tsx",
    import.meta.url,
  ).pathname;
  const source = readFileSync(filename, "utf8");
  expect(source).toContain("Gesture.Exclusive(peelGesture, swipe)");
  expect(source).toContain("vocabularyStickerPeelAtTip(");
  expect(source).toContain("vocabularyStickerPeelGesture(");
  expect(source).toContain("right: 0, bottom: 0, width: 104, height: 104");
  expect(source).not.toContain("Gesture.Tap()");
});

describe("compiled overlapping card flights", () => {
  test("background returns neither change the new gesture's turn nor advance again", () => {
    const flight = {
      ...startVocabularyCardFlight(50, -260, 100, 200, 328, 224, 3, 1),
      behind: true,
      captureDistance: 260,
    };
    // Includes new pulls, canceled pulls, and the button's full rotation range.
    for (const turn of [1, 1.1, 1.38, 1.2, 1, 1.5, 1.8, 2]) {
      const next = step([{ ordinal: 0, flight }], 1 / 120, turn, 3);
      expect(next.turn).toBe(turn);
      expect(next.advanceOrdinal).toBeNull();
      expect(next.flights[0]?.flight.y).not.toBe(flight.y);
    }
  });

  test("can swipe again while earlier cards return, advancing each card exactly once", () => {
    for (const count of [1, 2, 3, 24]) {
      const launch = (ordinal: number): VocabularyDeckFlight => ({
        ordinal,
        flight: startVocabularyCardFlight(
          0,
          -80,
          180,
          -1500,
          328,
          224,
          count,
          0.3,
        ),
      });
      let flights = [launch(0)];
      let turn = 0;
      let peakConcurrent = 0;
      const advances: number[] = [];
      for (let frame = 0; frame < 2400 && flights.length; frame++) {
        const next = step(flights, 1 / 120, turn, count);
        flights = next.flights;
        turn = next.turn;
        if (next.advanceOrdinal !== null) {
          advances.push(next.advanceOrdinal);
          // The next swipe starts before the old card settles.
          expect(
            flights.some((entry) => entry.ordinal === next.advanceOrdinal),
          ).toBeTrue();
          if (next.advanceOrdinal + 1 < count)
            flights.push(launch(next.advanceOrdinal + 1));
        }
        peakConcurrent = Math.max(peakConcurrent, flights.length);
      }
      expect(advances).toEqual(Array.from({ length: count }, (_, i) => i));
      expect(flights).toHaveLength(0);
      expect(turn).toBe(count);
      if (count > 1) expect(peakConcurrent).toBeGreaterThan(1);
    }
  });
});
