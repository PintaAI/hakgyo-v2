import type { ReactNode } from "react";
import { Text, View } from "react-native";

import { useAppTheme } from "../providers/AppThemeProvider";
import { withOpacity } from "../theme/colors";

// A fixed gold, the same in light and dark mode, so the medal reads as an
// award rather than another brand-coloured control.
const GOLD = {
  rim: "#B7791F",
  face: "#F2C14E",
  ring: "#FFF4D6",
  glyph: "#4A2F05",
  glow: "#D69E2E",
} as const;

/** The Hangeul Mastery medal: a gold disc with 한 inside a fine ring. */
export function HangeulMasteryMedal({ size = 56 }: { size?: number }) {
  const rim = Math.max(2, Math.round(size / 18));
  const inset = Math.max(3, Math.round(size / 9));
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: GOLD.rim,
        padding: rim,
        shadowColor: GOLD.glow,
        shadowOpacity: 0.45,
        shadowRadius: size / 6,
        shadowOffset: { width: 0, height: size / 14 },
        elevation: 4,
      }}
    >
      <View
        className="flex-1 items-center justify-center"
        style={{ borderRadius: size / 2, backgroundColor: GOLD.face }}
      >
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: inset - rim,
            right: inset - rim,
            bottom: inset - rim,
            left: inset - rim,
            borderRadius: size / 2,
            borderWidth: 1,
            borderColor: withOpacity(GOLD.ring, 0.85),
          }}
        />
        <Text
          allowFontScaling={false}
          style={{
            color: GOLD.glyph,
            fontSize: Math.round(size * 0.44),
            lineHeight: Math.round(size * 0.52),
            fontWeight: "900",
          }}
        >
          한
        </Text>
      </View>
    </View>
  );
}

/**
 * The featured badge row: medal, title and a supporting line (for example
 * the date it was earned).
 */
export function HangeulMasteryBadge({
  eyebrow = "Lencana",
  detail,
  children,
}: {
  eyebrow?: string;
  detail?: string;
  children?: ReactNode;
}) {
  const { colors, colorScheme } = useAppTheme();
  return (
    <View
      accessible
      accessibilityLabel={`Lencana Hangeul Mastery${detail ? `, ${detail}` : ""}`}
      className="flex-row items-center gap-4 rounded-2xl border p-4"
      style={{
        borderColor: withOpacity(GOLD.glow, 0.35),
        backgroundColor: withOpacity(
          GOLD.face,
          colorScheme === "dark" ? 0.14 : 0.16,
        ),
      }}
    >
      <HangeulMasteryMedal />
      <View className="min-w-0 flex-1 gap-0.5">
        <Text
          className="text-[11px] font-bold uppercase tracking-[1.5px]"
          style={{ color: colorScheme === "dark" ? GOLD.face : GOLD.rim }}
        >
          {eyebrow}
        </Text>
        <Text
          className="text-base font-black leading-5"
          style={{ color: colors.foreground }}
        >
          Hangeul Mastery
        </Text>
        {detail ? (
          <Text className="text-sm leading-5 text-muted-foreground">
            {detail}
          </Text>
        ) : null}
        {children}
      </View>
    </View>
  );
}
