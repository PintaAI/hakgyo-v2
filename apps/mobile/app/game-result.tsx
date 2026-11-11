import { router } from "expo-router";
import { useEffect, useRef } from "react";

import { GameResult } from "../src/games/game-result";
import { useGameResult } from "../src/games/game-result-sheet";

/**
 * The end of a vocabulary game, as a sheet over the game. The game owns what
 * it shows (`GameResultSheet`). An action closes the sheet first, then runs;
 * a sheet swiped away leaves the game like "Selesai" does (or goes on, when
 * the game is only paused).
 */
export default function GameResultScreen() {
  const result = useGameResult();
  const latest = useRef(result);
  if (result) latest.current = result;
  const acted = useRef(false);
  useEffect(
    () => () => {
      if (acted.current) return;
      const closed = latest.current;
      (closed?.onDismiss ?? closed?.secondary?.onPress)?.();
    },
    [],
  );
  if (!result) return null;
  return (
    <GameResult
      {...result}
      scroll
      onAct={() => {
        acted.current = true;
        router.back();
      }}
    />
  );
}
