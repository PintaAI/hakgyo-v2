import Storage from "expo-sqlite/kv-store";
import { useCallback, useState } from "react";

import type { WordFallAnswerMode } from "./engine";

/**
 * Hujan Kata's settings, chosen in Latihan's source sheet and kept on this
 * device: the language answers are typed in and the starting level.
 */
export type WordFallSettings = {
  answerMode: WordFallAnswerMode;
  startLevel: number;
};

export const MAX_START_LEVEL = 10;
export const START_LEVEL_OPTIONS = Array.from(
  { length: MAX_START_LEVEL },
  (_, index) => index + 1,
);

const KEY = "hakgyo:word-fall-settings:v1";
const DEFAULTS: WordFallSettings = { answerMode: "ID", startLevel: 1 };

export function readWordFallSettings(): WordFallSettings {
  try {
    const raw = Storage.getItemSync(KEY);
    const saved: unknown = raw ? JSON.parse(raw) : null;
    if (!saved || typeof saved !== "object") return DEFAULTS;
    const record = saved as Record<string, unknown>;
    return {
      answerMode: record.answerMode === "KR" ? "KR" : "ID",
      startLevel:
        typeof record.startLevel === "number" &&
        START_LEVEL_OPTIONS.includes(record.startLevel)
          ? record.startLevel
          : 1,
    };
  } catch {
    return DEFAULTS;
  }
}

/** The saved settings and a setter that saves a change at once. */
export function useWordFallSettings() {
  const [settings, setSettings] = useState(readWordFallSettings);
  const update = useCallback((change: Partial<WordFallSettings>) => {
    setSettings((current) => {
      const next = { ...current, ...change };
      try {
        Storage.setItemSync(KEY, JSON.stringify(next));
      } catch {
        // Kept for this session; the default returns next time.
      }
      return next;
    });
  }, []);
  return [settings, update] as const;
}
