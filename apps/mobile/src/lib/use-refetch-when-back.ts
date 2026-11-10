import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";

/**
 * Refreshes a screen's data when the learner comes back to it: the app
 * returns to the foreground while the screen is in front, or the screen is
 * shown again after one above it closes (a sheet). Not on the first show,
 * which the query's own mount refresh covers, and never on a timer.
 */
export function useRefetchWhenBack(refetch: () => unknown, enabled = true) {
  const focused = useRef(false);
  const shownBefore = useRef(false);
  const latest = useRef(refetch);
  latest.current = refetch;

  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      if (shownBefore.current && enabled) void latest.current();
      shownBefore.current = true;
      return () => {
        focused.current = false;
      };
    }, [enabled]),
  );

  useEffect(() => {
    if (!enabled) return;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && focused.current) void latest.current();
    });
    return () => subscription.remove();
  }, [enabled]);
}
