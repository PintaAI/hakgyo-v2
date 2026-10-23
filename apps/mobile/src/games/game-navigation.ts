import { router, useNavigation } from "expo-router";
import { useCallback, useEffect, useRef } from "react";

import { gameExitAction, type GameSource } from "./game-exit";

/** Leaves a game: to the lesson that opened it, or to the Latihan tab. */
export function leaveGame(source?: GameSource) {
  const action = gameExitAction(source, router.canGoBack());
  if (action.type === "back") router.back();
  else if (action.type === "replace") router.replace(action.href);
  else router.dismissTo(action.href);
}

/**
 * Routes every active-game back action through the game's exit handler and
 * ignores repeated presses while navigation is already leaving the screen.
 */
export function useGameExitGuard({
  active,
  locked,
  onExit,
}: {
  active: boolean;
  locked: boolean;
  onExit: () => void;
}) {
  const navigation = useNavigation();
  const leavingRef = useRef(false);
  const stateRef = useRef({ active, locked, onExit });
  stateRef.current = { active, locked, onExit };

  const exit = useCallback(() => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    stateRef.current.onExit();
  }, []);

  useEffect(
    () =>
      navigation.addListener("beforeRemove", (event) => {
        if (leavingRef.current) return;
        const state = stateRef.current;
        if (!state.active) return;
        event.preventDefault();
        if (state.locked) return;
        exit();
      }),
    [navigation, exit],
  );

  return exit;
}
