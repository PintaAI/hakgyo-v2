import { describe, expect, mock, test } from "bun:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import * as jsx from "react/jsx-runtime";
import * as todayPractice from "../lib/today-vocabulary-practice";
import * as vocabularyPractice from "../lib/vocabulary-practice";

const require = createRequire(import.meta.url);
const compilerRequire = createRequire(
  require.resolve("react-native-worklets/plugin"),
);
const { transformSync } = compilerRequire("@babel/core");

type Element = { type: string; props: Record<string, any> };

// Run the actual screen handlers with isolated hooks and inert native leaves.
// This checks API/storage effects and same-tick input races, not native layout.
function screenHarness(kind: "today" | "course") {
  const slots: unknown[] = [];
  let cursor = 0;
  let dirty = false;
  let effects: (() => void)[] = [];
  const hooks = {
    useState(initial: unknown) {
      const slot = cursor++;
      if (!(slot in slots))
        slots[slot] = typeof initial === "function" ? initial() : initial;
      return [
        slots[slot],
        (next: unknown) => {
          slots[slot] = typeof next === "function" ? next(slots[slot]) : next;
          dirty = true;
        },
      ];
    },
    useRef(initial: unknown) {
      const slot = cursor++;
      if (!(slot in slots)) slots[slot] = { current: initial };
      return slots[slot];
    },
    useMemo: (calculate: () => unknown) => calculate(),
    useEffect(effect: () => void, dependencies: unknown[]) {
      const slot = cursor++;
      const previous = slots[slot] as unknown[] | undefined;
      if (!previous || dependencies.some((item, i) => item !== previous[i])) {
        slots[slot] = dependencies;
        effects.push(effect);
      }
    },
  };
  const words = [
    { id: "one", term: "학교", definition: "School", imageAssetId: null },
    { id: "two", term: "책", definition: "Book", imageAssetId: null },
  ];
  const pool = {
    hasAvailableContent: true,
    items: words.map((word) => ({
      ...word,
      entryId: word.id,
      vocabularySetId: "set",
      setEntryCount: 2,
      setVersion: "v1",
      sourceCourseItemId: "item",
      vocabularySetTitle: "Words",
      courseTitle: "Korean",
    })),
  };
  const evidence = { items: [], practiced: false, remembered: false };
  const review = mock(async () => undefined);
  const submit = mock(async () => ({ ...evidence, correct: true }));
  const start = mock(async ({ entryId }: { entryId: string }) => ({
    entryId,
    challengeId: `challenge-${entryId}`,
    prompt: words.find((word) => word.id === entryId)?.definition,
  }));
  const storageWrite = mock(() => undefined);
  const complete = mock(async () => undefined);
  const advance = mock(() => undefined);
  const mutation = (mutateAsync: unknown) => ({
    mutateAsync,
    reset() {},
    isPending: false,
  });
  const dependencies: Record<string, unknown> = {
    react: hooks,
    "react/jsx-runtime": jsx,
    "expo-sqlite/kv-store": {
      getItemSync: () => null,
      setItemSync: storageWrite,
    },
    "expo-router": {
      Stack: {
        Toolbar: Object.assign("Toolbar", {
          View: "ToolbarView",
          Button: "ToolbarButton",
        }),
      },
    },
    "expo-symbols": { SymbolView: "SymbolView" },
    "react-native": {
      View: "View",
      Text: "Text",
      TextInput: "TextInput",
      Pressable: "Pressable",
      ActivityIndicator: "ActivityIndicator",
      Keyboard: { dismiss() {} },
      useWindowDimensions: () => ({ width: 390 }),
    },
    "../lib/trpc": {
      api: {
        useUtils: () => ({ gamification: { invalidate() {} } }),
        practice: {
          getVocabularyPool: { useQuery: () => ({ data: pool }) },
          recordVocabularyCardReview: { useMutation: () => mutation(review) },
        },
        learning: {
          getVocabularyMemory: {
            useQuery: () => ({
              data: evidence,
              refetch: async () => ({ data: evidence }),
            }),
          },
          startVocabularyRecall: { useMutation: () => mutation(start) },
          submitVocabularyRecall: { useMutation: () => mutation(submit) },
        },
      },
    },
    "../lib/today-vocabulary-practice": todayPractice,
    "../lib/vocabulary-practice": vocabularyPractice,
    "../providers/AppThemeProvider": {
      useAppTheme: () => ({
        colors: { primary: "#ffffff" },
        colorScheme: "light",
      }),
    },
    "../theme/colors": { withOpacity: (color: string) => color },
    "../theme/toolbar-icons": { toolbarIcons: {} },
    "./learning-ui": {
      Action: "Action",
      Empty: "Empty",
      QueryState: "QueryState",
    },
    "./GlassBox": { GlassBox: "GlassBox" },
    "./vocabulary-practice-deck": { VocabularyPracticeDeck: "Deck" },
  };
  const filename = new URL(
    kind === "today"
      ? "./today-vocabulary-practice.tsx"
      : "./vocabulary-session.tsx",
    import.meta.url,
  ).pathname;
  const { code } = transformSync(readFileSync(filename, "utf8"), {
    filename,
    babelrc: false,
    configFile: false,
    presets: [compilerRequire.resolve("@babel/preset-typescript")],
    plugins: [
      [
        compilerRequire.resolve("@babel/plugin-transform-react-jsx"),
        { runtime: "automatic" },
      ],
      compilerRequire.resolve("@babel/plugin-transform-modules-commonjs"),
    ],
  });
  const exports: Record<string, (props: unknown) => Element> = {};
  runInNewContext(`(function(require, exports) { ${code}\n })`)(
    (id: string) => {
      if (!(id in dependencies))
        throw new Error(`Unmocked native dependency: ${id}`);
      return dependencies[id];
    },
    exports,
  );
  const component =
    exports[
      kind === "today" ? "TodayVocabularyPractice" : "VocabularySession"
    ]!;
  const props = {
    organizationId: "org",
    userId: "user",
    scrollGesture: {},
    words,
    vocabularySetId: "set",
    sourceCourseItemId: "item",
    onComplete: complete,
    saving: false,
  };
  let tree: Element;
  function render() {
    let renders = 0;
    do {
      if (++renders > 20) throw new Error("Render did not settle");
      cursor = 0;
      dirty = false;
      effects = [];
      tree = component(props);
      for (const effect of effects) effect();
    } while (dirty);
  }
  function find(type: string): Element {
    function visit(node: unknown): Element | undefined {
      if (Array.isArray(node)) {
        for (const child of node) {
          const found = visit(child);
          if (found) return found;
        }
      } else if (node && typeof node === "object" && "props" in node) {
        const element = node as Element;
        if (element.type === type) return element;
        return visit(element.props.children);
      }
    }
    const found = visit(tree);
    if (!found) throw new Error(`No ${type} in screen`);
    return found;
  }
  async function flush() {
    await Promise.resolve();
    await Promise.resolve();
    render();
    try {
      find("Deck").props.ref.current = { advance };
    } catch {
      /* inactive course round */
    }
  }
  render();
  return {
    kind,
    render,
    find,
    flush,
    review,
    submit,
    start,
    storageWrite,
    complete,
    advance,
  };
}

for (const kind of ["today", "course"] as const) {
  describe(`${kind} study reveal`, () => {
    async function setup() {
      const screen = screenHarness(kind);
      if (kind === "course") screen.find("Action").props.onPress();
      await screen.flush();
      screen
        .find("TextInput")
        .props.onChangeText(kind === "today" ? "School" : "학교");
      screen.render();
      return screen;
    }

    test("corner peel earns no credit, including a queued submit and repeated gesture", async () => {
      const screen = await setup();
      const queuedSubmit = screen.find("TextInput").props.onSubmitEditing;
      const reveal = screen.find("Deck").props.onReveal;
      reveal();
      reveal();
      queuedSubmit();
      await screen.flush();
      expect(screen.find("Deck").props.revealed).toBeTrue();
      expect(screen.find("Deck").props.correct).toBeUndefined();
      expect(screen.review).not.toHaveBeenCalled();
      expect(screen.submit).not.toHaveBeenCalled();
      expect(screen.storageWrite).not.toHaveBeenCalled();
      expect(screen.complete).not.toHaveBeenCalled();
      screen.find("TextInput").props.onSubmitEditing();
      expect(screen.advance).toHaveBeenCalledTimes(1);

      screen.find("Deck").props.onAdvanceComplete();
      await screen.flush();
      expect(screen.find("Deck").props.revealed).toBeFalse();
      expect(screen.find("Deck").props.correct).toBeUndefined();
      screen
        .find("TextInput")
        .props.onChangeText(kind === "today" ? "Book" : "책");
      screen.render();
      screen.find("TextInput").props.onSubmitEditing();
      await screen.flush();
      expect(
        kind === "today" ? screen.review : screen.submit,
      ).toHaveBeenCalledTimes(1);
      expect(screen.find("Deck").props.correct).toBeTrue();
    });

    test("an answer submitted first keeps its graded feedback when reveal follows", async () => {
      const screen = await setup();
      const reveal = screen.find("Deck").props.onReveal;
      screen.find("TextInput").props.onSubmitEditing();
      reveal();
      await screen.flush();
      expect(screen.find("Deck").props.revealed).toBeFalse();
      expect(screen.find("Deck").props.correct).toBeTrue();
      expect(
        kind === "today" ? screen.review : screen.submit,
      ).toHaveBeenCalledTimes(1);
    });

    test("a whole round of reveals earns no credit and a new round starts covered", async () => {
      const screen = await setup();
      for (let index = 0; index < 2; index++) {
        screen.find("Deck").props.onReveal();
        await screen.flush();
        screen.find("Deck").props.onAdvanceComplete();
        await screen.flush();
      }
      expect(screen.review).not.toHaveBeenCalled();
      expect(screen.submit).not.toHaveBeenCalled();
      expect(screen.storageWrite).not.toHaveBeenCalled();
      expect(screen.complete).not.toHaveBeenCalled();

      screen.find("Action").props.onPress();
      await screen.flush();
      expect(screen.find("Deck").props.index).toBe(0);
      expect(screen.find("Deck").props.revealed).toBeFalse();
      expect(screen.find("Deck").props.correct).toBeUndefined();
    });
  });
}
