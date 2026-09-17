import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import * as jsx from "react/jsx-runtime";
import { themeColors, withOpacity } from "../theme/colors";

const require = createRequire(import.meta.url);
const compilerRequire = createRequire(
  require.resolve("react-native-worklets/plugin"),
);
const { transformSync } = compilerRequire("@babel/core");
type RenderNode = {
  props: { children?: unknown; pointerEvents?: string; style?: unknown };
};
const filename = new URL("./vocabulary-practice-deck.tsx", import.meta.url)
  .pathname;
const { code } = transformSync(
  `${readFileSync(filename, "utf8")}\nexport { CardContent, styles };`,
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
      compilerRequire.resolve("@babel/plugin-transform-modules-commonjs"),
    ],
  },
);

test("the revealed surface uses the opaque exposed-corner color in every answer state", () => {
  for (const colorScheme of ["dark", "light"] as const) {
    const colors = themeColors[colorScheme];
    const dependencies: Record<string, unknown> = {
      react: {
        memo: (component: unknown) => component,
        useState: () => [undefined],
        useEffect() {},
      },
      "react/jsx-runtime": jsx,
      "react-native": {
        View: "View",
        Text: "Text",
        StyleSheet: { create: (value: unknown) => value },
      },
      "react-native-reanimated": {
        __esModule: true,
        default: { View: "AnimatedView" },
        useSharedValue: (value: unknown) => ({ value }),
        useReducedMotion: () => false,
        useAnimatedStyle: (calculate: () => unknown) => calculate(),
        useDerivedValue: (calculate: () => unknown) => ({ value: calculate() }),
      },
      "../providers/AppThemeProvider": {
        useAppTheme: () => ({ colors, colorScheme }),
      },
      "../theme/colors": { withOpacity },
    };
    const exports: Record<string, any> = {};
    runInNewContext(`(function(require, exports) { ${code}\n })`)(
      (id: string) =>
        id === "../lib/vocabulary-sticker-peel" ||
        id === "../lib/vocabulary-card-text"
          ? require(id)
          : (dependencies[id] ?? {}),
      exports,
    );
    expect(exports.styles.surface.overflow).toBe("visible");
    expect(exports.styles.face.overflow).toBe("hidden");
    expect(exports.styles.peelShadow.right).toBeUndefined();
    expect(exports.styles.peelCurl.right).toBeUndefined();
    expect(exports.styles.peelShadow.borderRadius).toBeLessThanOrEqual(4);
    expect(exports.styles.peelCurl.borderRadius).toBeLessThanOrEqual(4);
    expect(exports.styles.peelEffectsClip?.overflow).toBe("hidden");
    expect(exports.styles.peelEffectsClip?.borderRadius).toBe(19);
    for (const correct of [undefined, true, false]) {
      const result = exports.CardContent!({
        card: { id: "one", prompt: "회사원", answer: "Karyawan Perusahaan" },
        correct,
        revealed: true,
        height: 222,
        width: { value: 328 },
        ordinal: 0,
        peelOrdinal: { value: -1 },
        peelTipX: { value: 0 },
        peelTipY: { value: 0 },
        canReveal: false,
        onReveal() {},
        counter: "8 of 21",
        resolveAssetUrl: async () => null,
      });
      const answer = result.props.children[0];
      const style = Object.assign({}, ...answer.props.style);
      expect(style.backgroundColor).toBe(colors.card);
      if (correct === undefined)
        expect(JSON.stringify(result)).not.toContain("REVEALED FOR STUDY");

      const styles: Record<string, unknown>[] = [];
      function collectStyles(node: unknown) {
        if (Array.isArray(node)) {
          for (const child of node) collectStyles(child);
          return;
        }
        if (!node || typeof node !== "object" || !("props" in node)) return;
        const element = node as unknown as RenderNode;
        if (element.props.style) {
          styles.push(
            Object.assign(
              {},
              ...(Array.isArray(element.props.style)
                ? element.props.style.flat()
                : [element.props.style]),
            ),
          );
        }
        collectStyles(element.props.children);
      }
      collectStyles(result);

      const effectClips: RenderNode[] = [];
      const stickerMasks: RenderNode[] = [];
      function collectEffectClips(node: unknown) {
        if (Array.isArray(node)) {
          for (const child of node) collectEffectClips(child);
          return;
        }
        if (!node || typeof node !== "object" || !("props" in node)) return;
        const element = node as unknown as RenderNode;
        const nodeStyles = Array.isArray(element.props.style)
          ? element.props.style.flat()
          : [element.props.style];
        if (nodeStyles.includes(exports.styles.peelEffectsClip))
          effectClips.push(element);
        if (nodeStyles.includes(exports.styles.stickerMask))
          stickerMasks.push(element);
        collectEffectClips(element.props.children);
      }
      function subtreeUsesStyle(node: unknown, target: unknown): boolean {
        if (Array.isArray(node))
          return node.some((child) => subtreeUsesStyle(child, target));
        if (!node || typeof node !== "object" || !("props" in node))
          return false;
        const element = node as unknown as RenderNode;
        const nodeStyles = Array.isArray(element.props.style)
          ? element.props.style.flat()
          : [element.props.style];
        return (
          nodeStyles.includes(target) ||
          subtreeUsesStyle(element.props.children, target)
        );
      }
      collectEffectClips(result);
      expect(effectClips).toHaveLength(2);
      // The transform-only peel plane has a deliberately oversized native
      // layout. It must stay visual-only or its hit box covers the input below.
      expect(stickerMasks).toHaveLength(1);
      expect(stickerMasks[0]?.props.pointerEvents).toBe("none");
      expect(
        effectClips.some((clip) =>
          subtreeUsesStyle(clip, exports.styles.peelShadow),
        ),
      ).toBeTrue();
      expect(
        effectClips.some((clip) =>
          subtreeUsesStyle(clip, exports.styles.peelCurl),
        ),
      ).toBeTrue();
      const back = styles.find((candidate) => {
        const transform = candidate.transform as
          Array<Record<string, unknown>> | undefined;
        return transform?.some((item) => Array.isArray(item.matrix));
      });
      expect(back?.backgroundColor).toBe(
        colorScheme === "dark"
          ? colors.highlightGrayBackground
          : colors.secondary,
      );
      expect(back?.borderWidth).toBe(colorScheme === "dark" ? 1 : 0);
    }
  }
});
