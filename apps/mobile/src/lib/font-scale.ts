import Storage from "expo-sqlite/kv-store";

/**
 * Ukuran teks: a multiplier for every text size in the app (`--font-scale` in
 * global.css), on top of the system text size, which React Native already
 * follows. Kept per device.
 */
export const FONT_SCALE = { min: 0.8, max: 1.4, step: 0.1, default: 1 };

const STORAGE_KEY = "hakgyo:font-scale:v1";

/** The nearest allowed step, within the range. */
export function snapFontScale(value: number) {
  const steps = Math.round((value - FONT_SCALE.min) / FONT_SCALE.step);
  const snapped = FONT_SCALE.min + steps * FONT_SCALE.step;
  return (
    Math.round(
      Math.min(FONT_SCALE.max, Math.max(FONT_SCALE.min, snapped)) * 100,
    ) / 100
  );
}

/** Read once at launch, synchronously, so the first frame has the right size. */
export function readFontScale() {
  try {
    const saved = Number(Storage.getItemSync(STORAGE_KEY));
    return Number.isFinite(saved) && saved > 0
      ? snapFontScale(saved)
      : FONT_SCALE.default;
  } catch {
    return FONT_SCALE.default;
  }
}

export function saveFontScale(value: number) {
  try {
    Storage.setItemSync(STORAGE_KEY, String(value));
  } catch {
    // Not saved: the app starts at the default size next time.
  }
}

/** "100%". */
export function fontScaleLabel(value: number) {
  return `${Math.round(value * 100)}%`;
}
