import type { ReactNode } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "../../providers/AppThemeProvider";
import { withOpacity } from "../../theme/colors";
import { DoodleBackground } from "../doodle-background";

const ios = Platform.OS === "ios";

/**
 * A hero title. The line height is set here rather than with a class, so a
 * two-line title keeps tight leading next to the 28pt size.
 */
export const HERO_TITLE = { fontSize: 28, lineHeight: 34 };
/** The navigation bar plus some air, above the hero's content on iOS. */
const HEADER_CLEARANCE = 64;

/**
 * The top of a learning screen in Hakgyo's look: edge to edge on the
 * doodles and a wash of the brand colour, both fading into the page at the
 * bottom so the hero has no edge. On iOS it runs up under the status bar
 * and the transparent header, like the cohort cards on Belajar: give the
 * scroll view no automatic content inset. Place it first in content with
 * the screen's 20pt gutter (`className` can pull it up over top padding).
 */
export function HakgyoHero({
  children,
  className = "",
  inSheet = false,
}: {
  children: ReactNode;
  className?: string;
  /** At the top of a sheet: no status bar or navigation bar to clear. */
  inSheet?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { colors, colorScheme } = useAppTheme();
  return (
    <View
      className={`-mx-5 overflow-hidden px-5 pb-6 ${className}`}
      style={{
        paddingTop: inSheet ? 28 : ios ? insets.top + HEADER_CLEARANCE : 24,
      }}
    >
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            experimental_backgroundImage: `linear-gradient(to bottom, ${withOpacity(colors.primary, colorScheme === "dark" ? 0.22 : 0.12)}, ${withOpacity(colors.primary, 0)})`,
          },
        ]}
      />
      <DoodleBackground tile={160} />
      {/* The doodles and the wash fade out toward the bottom, into the page
          behind, so the hero has no edge. */}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            experimental_backgroundImage: `linear-gradient(to bottom, ${withOpacity(colors.background, 0)} 40%, ${colors.background} 100%)`,
          },
        ]}
      />
      <View className="gap-6">{children}</View>
    </View>
  );
}

/** Back to front: the last card lies on top, straight. */
const POSES = [
  { rotate: "-7deg", translateX: -26, translateY: 6 },
  { rotate: "6deg", translateX: 24, translateY: 4 },
  { rotate: "0deg", translateX: 0, translateY: 0 },
];

/**
 * Up to three small cards fanned like the practice deck, `faces[0]` on
 * top: a preview of what a set or a task holds. Decorative; hidden from
 * screen readers.
 */
export function CardFan({ faces }: { faces: ReactNode[] }) {
  const { colors } = useAppTheme();
  const shown = faces.slice(0, 3);
  if (!shown.length) return null;
  const poses = POSES.slice(3 - shown.length);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="h-28 items-center justify-center"
    >
      {[...shown].reverse().map((face, layer) => {
        const pose = poses[layer]!;
        const top = layer === shown.length - 1;
        return (
          <View
            className="absolute h-24 w-40 items-center justify-center rounded-[20px] border px-3"
            key={layer}
            style={{
              backgroundColor: colors.card,
              borderColor: top
                ? withOpacity(colors.primary, 0.35)
                : colors.border,
              opacity: top ? 1 : 0.92,
              transform: [
                { translateX: pose.translateX },
                { translateY: pose.translateY },
                { rotate: pose.rotate },
              ],
              shadowColor: "#000",
              shadowOpacity: top ? 0.12 : 0.06,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 4 },
            }}
          >
            {face}
          </View>
        );
      })}
    </View>
  );
}
