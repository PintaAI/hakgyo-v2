import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { relative, resolve, sep } from "node:path";

import { getRoutes } from "expo-router/build/getRoutes";

function getAppRouteKeys() {
  const appDirectory = resolve(import.meta.dir, "../../app");

  return readdirSync(appDirectory, { recursive: true })
    .filter((path) => /\.[jt]sx?$/.test(path.toString()))
    .map(
      (path) =>
        `./${relative(appDirectory, resolve(appDirectory, path.toString())).replaceAll(sep, "/")}`,
    );
}

describe("game routes", () => {
  test("registers one game screen without a nested sheet navigator", () => {
    const routeKeys = getAppRouteKeys();
    const context = Object.assign((_id: string) => ({ default: () => null }), {
      id: "game-routes-test",
      keys: () => routeKeys,
      resolve: (id: string) => id,
    });
    const routeTree = getRoutes(context, {
      ignoreEntryPoints: true,
      ignoreRequireErrors: true,
      importMode: "async",
      platform: "ios",
    });
    const gameRoute = routeTree?.children.find(
      (route) => route.route === "games/[gameKey]",
    );

    expect(gameRoute).toBeDefined();
    expect(gameRoute?.children).toEqual([]);
    expect(
      existsSync(
        resolve(import.meta.dir, "../../app/games/[gameKey]/_layout.tsx"),
      ),
    ).toBe(false);
    expect(
      existsSync(
        resolve(import.meta.dir, "../../app/games/[gameKey]/sheet.tsx"),
      ),
    ).toBe(false);
  });

  test("uses an inline native form-sheet modal", () => {
    const modalSource = readFileSync(
      resolve(import.meta.dir, "./game-modals.tsx"),
      "utf8",
    );
    expect(modalSource).toContain('presentationStyle="formSheet"');
    expect(modalSource).toContain("allowSwipeDismissal={false}");
    expect(modalSource).toContain("gameSymbols");
    expect(modalSource).toContain("<SymbolIcon");
    expect(modalSource).toContain("StudyAction");
  });

  test("pops to Practice", () => {
    const routeSource = readFileSync(
      resolve(import.meta.dir, "../../app/games/[gameKey].tsx"),
      "utf8",
    );

    expect(routeSource).toContain(
      'router.dismissTo("/(home)/(tabs)/assessments")',
    );
  });

  test("returns Hangeul games launched from a lesson to the lesson", () => {
    const routeSource = readFileSync(
      resolve(import.meta.dir, "../../app/games/[gameKey].tsx"),
      "utf8",
    );
    expect(routeSource).toContain(
      "getHangeulGameStage(firstParam(params.stage))",
    );
    for (const screen of [
      "./hangeul/hangeul-screen.tsx",
      "./syllable-forge/syllable-forge-screen.tsx",
      "./word-builder/word-builder-screen.tsx",
    ]) {
      const source = readFileSync(resolve(import.meta.dir, screen), "utf8");
      expect(source).toContain("leaveGame(source)");
      expect(source).toContain("gameLeaveLabel(source)");
      expect(source).not.toContain("router.dismissTo");
    }
  });
});
