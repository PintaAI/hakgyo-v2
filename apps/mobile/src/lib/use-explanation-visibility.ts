import Storage from "expo-sqlite/kv-store";
import { useCallback, useState } from "react";

const EXPLANATIONS_HIDDEN_KEY = "hakgyo.explanations.hidden";

/**
 * Whether answer explanations show after an answer (Home's daily questions),
 * kept on the device like the vocabulary view mode. Shown until the learner
 * hides them.
 */
export function useExplanationVisibility() {
  const [visible, setVisibleState] = useState(() => {
    try {
      return Storage.getItemSync(EXPLANATIONS_HIDDEN_KEY) !== "1";
    } catch {
      return true;
    }
  });
  const setVisible = useCallback((next: boolean) => {
    setVisibleState(next);
    try {
      if (next) Storage.removeItemSync(EXPLANATIONS_HIDDEN_KEY);
      else Storage.setItemSync(EXPLANATIONS_HIDDEN_KEY, "1");
    } catch {
      // The display preference is optional.
    }
  }, []);
  return [visible, setVisible] as const;
}
