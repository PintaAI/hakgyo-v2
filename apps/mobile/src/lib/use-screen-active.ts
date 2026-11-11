import { useIsFocused } from "expo-router";
import { useEffect, useState } from "react";
import { AppState } from "react-native";

/** Whether the app is in the foreground. */
export function useAppForeground() {
  const [foreground, setForeground] = useState(
    AppState.currentState === "active",
  );
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) =>
      setForeground(state === "active"),
    );
    return () => subscription.remove();
  }, []);
  return foreground;
}

/**
 * Whether the screen is in front of the learner: focused (no tab, pushed
 * screen or sheet over it) with the app in the foreground. Tabs and the
 * screens under a pushed one stay mounted, so anything that keeps working by
 * itself (an endless animation, the microphone) must stop while this is
 * false, or it runs unseen for as long as the app is open.
 */
export function useScreenActive() {
  const focused = useIsFocused();
  const foreground = useAppForeground();
  return focused && foreground;
}
