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
    expect(modalSource).toContain("<SymbolView");
    expect(modalSource).not.toContain("StudyGlass");
    expect(modalSource).toContain("StudyAction");
    expect(modalSource).not.toContain("useGameSheetSync");
    expect(modalSource).not.toContain("useGameSheetsOptional");
    expect(modalSource).not.toContain("dismissAction");
  });

  test("pops to Practice without forcing a sync checkpoint", () => {
    const routeSource = readFileSync(
      resolve(import.meta.dir, "../../app/games/[gameKey].tsx"),
      "utf8",
    );
    const cardsSource = readFileSync(
      resolve(import.meta.dir, "../components/vocabulary-session.tsx"),
      "utf8",
    );

    expect(routeSource).toContain(
      'router.dismissTo("/(home)/(tabs)/assessments")',
    );
    expect(routeSource).not.toContain("finishGameAndLeave");
    expect(cardsSource).not.toContain("finishGameAndLeave");
  });

  test("keeps keyboard controls and progress in the Cards native header", () => {
    const cardsSource = readFileSync(
      resolve(import.meta.dir, "../components/vocabulary-session.tsx"),
      "utf8",
    );
    const wordFallSource = readFileSync(
      resolve(import.meta.dir, "./word-fall/word-fall-screen.tsx"),
      "utf8",
    );

    expect(cardsSource).toContain('<Stack.Toolbar placement="right">');
    expect(cardsSource).toContain("onPress={toggleKeyboard}");
    expect(cardsSource).toContain("ref={answerInputRef}");
    expect(cardsSource).toContain(
      "{practicedCount}/{usableWords.length} practiced",
    );
    const revealAnswer = cardsSource.slice(
      cardsSource.indexOf("function revealAnswer"),
      cardsSource.indexOf("async function saveReveal"),
    );
    expect(revealAnswer).not.toContain("dismissKeyboard()");
    expect(cardsSource).not.toContain(
      'className="absolute inset-x-0 top-0 z-10',
    );
    expect(wordFallSource).not.toContain("toggleKeyboard");
    expect(wordFallSource).not.toContain("keyboardProbe");
    expect(wordFallSource).not.toContain("keyboardHeight");
  });
});
