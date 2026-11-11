import { router } from "expo-router";
import { useEffect, useSyncExternalStore } from "react";

import type { GameResultProps } from "./game-result";

// The result a game is showing now. The sheet is a route of its own, so the
// game hands it the page (with its callbacks) through here.
let current: GameResultProps | undefined;
const listeners = new Set<() => void>();
function publish(next: GameResultProps | undefined) {
  current = next;
  for (const listener of listeners) listener();
}

/** The result the open game is showing, for the `/game-result` sheet. */
export function useGameResult() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current,
  );
}

/**
 * The end of a game as a form sheet over it, like the sheet a game starts
 * from. A game renders this while its round is over; the sheet follows the
 * props as they change. Closing the sheet without choosing leaves the game.
 */
export function GameResultSheet(props: GameResultProps) {
  useEffect(() => {
    publish(props);
  });
  useEffect(() => {
    router.push("/game-result");
    return () => publish(undefined);
  }, []);
  return null;
}
