import type { materialPosition } from "@hakgyo/shared/learning";
import { Platform, useWindowDimensions, View } from "react-native";

import { MarqueeText } from "../ui/marquee-text";

/**
 * Room each side of the header keeps for its button: the margin, the button
 * (a 44pt glass circle on iOS, a 48dp icon button on Android) and a gap.
 */
const HEADER_SIDE = Platform.OS === "ios" ? 16 + 44 + 12 : 16 + 48 + 12;

/** "Bab 1 · Materi 2 dari 8", or null when the outline does not list it. */
export function materialPositionLabel(
  position: ReturnType<typeof materialPosition>,
) {
  return position
    ? `Bab ${position.chapter} · Materi ${position.index} dari ${position.total}`
    : null;
}

/**
 * The material's title in the native header, its place in the course under
 * it. A title too long for the header slides to its end and back.
 */
export function MaterialHeaderTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string | null;
}) {
  const window = useWindowDimensions();
  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      style={{ width: Math.max(120, window.width - HEADER_SIDE * 2) }}
    >
      {/* iOS's own header title size (17pt), the place a step smaller. */}
      <MarqueeText
        align="center"
        className="text-[17px] font-semibold leading-[22px] text-foreground"
      >
        {title}
      </MarqueeText>
      {subtitle ? (
        <MarqueeText
          align="center"
          className="text-[13px] leading-[18px] text-muted-foreground"
        >
          {subtitle}
        </MarqueeText>
      ) : null}
    </View>
  );
}
