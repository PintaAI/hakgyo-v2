import { VariableContextProvider } from "nativewind";
import { useEffect, useMemo, useRef, useState } from "react";
import { Text } from "react-native";

import { FONT_SCALE, fontScaleLabel, snapFontScale } from "../lib/font-scale";
import { useAppTheme } from "../providers/AppThemeProvider";
import { SettingsSliderRow } from "./settings-ui";

/**
 * Pengaturan > Tampilan > Ukuran teks. The preview follows the thumb; the app
 * takes the new size when the finger lifts, since resizing every screen on
 * each step of a drag would stutter.
 */
export function FontSizeSetting() {
  const { fontScale, setFontScale } = useAppTheme();
  const [pending, setPending] = useState(fontScale);
  // The lift can arrive in the same tick as the last move, before a render.
  const latest = useRef(fontScale);
  useEffect(() => {
    latest.current = fontScale;
    setPending(fontScale);
  }, [fontScale]);
  // Only the preview reads the size being chosen.
  const previewScale = useMemo(() => ({ "--font-scale": pending }), [pending]);

  return (
    <SettingsSliderRow
      label="Ukuran teks"
      symbol="textformat.size"
      valueText={fontScaleLabel(pending)}
      value={pending}
      min={FONT_SCALE.min}
      max={FONT_SCALE.max}
      step={FONT_SCALE.step}
      onValueChange={(value) => {
        latest.current = snapFontScale(value);
        setPending(latest.current);
      }}
      onCommit={() => setFontScale(latest.current)}
      preview={
        <VariableContextProvider value={previewScale}>
          <Text className="text-base text-foreground">
            안녕하세요! Belajar bahasa Korea sedikit demi sedikit setiap hari.
          </Text>
        </VariableContextProvider>
      }
    />
  );
}
