import { type ReactNode, useEffect, useRef } from "react";
import { Pressable, Text, View } from "react-native";

import { hapticSuccess } from "../../lib/haptics";
import { useAppTheme } from "../../providers/AppThemeProvider";
import { withOpacity } from "../../theme/colors";
import { Eyebrow } from "../ui/eyebrow";
import { SymbolIcon } from "../ui/symbol-icon";
import type { SymbolName } from "../ui/symbol-names";
import { ConfettiBurst } from "./confetti";
import { CardFan, HERO_TITLE } from "./hakgyo-hero";

// The parts a `HakgyoHero` is built from on every page that opens or closes
// an activity (a tugas and its result, a game's source sheet and its result,
// "Bab selesai"): the fanned cards with a mark, the title block and the row
// of fact chips. Change the look here, not per page.

/** The box the fanned cards sit in, which the confetti bursts from. */
const FAN_BOX = { width: 220, height: 112 };
const DONE_GREEN = "#10b981";

/**
 * The fanned cards with `face` on the front one: a score, a count, a chapter
 * number. `done` adds the green check, and `celebrate` plays the confetti
 * (once: the caller decides when).
 */
export function HeroMark({
  face,
  done = false,
  celebrate = false,
}: {
  face: ReactNode;
  done?: boolean;
  celebrate?: boolean;
}) {
  const { colors } = useAppTheme();
  // One success buzz with the burst, timed to its default 250 ms delay. The
  // ref keeps a re-published sheet (game result) from buzzing twice.
  const celebrated = useRef(false);
  useEffect(() => {
    if (!celebrate || celebrated.current) return;
    const timer = setTimeout(() => {
      celebrated.current = true;
      hapticSuccess();
    }, 250);
    return () => clearTimeout(timer);
  }, [celebrate]);
  return (
    <View className="items-center">
      <View style={FAN_BOX}>
        <CardFan
          faces={[
            <View className="items-center" key="face">
              {face}
            </View>,
            <View key="second" />,
            <View key="third" />,
          ]}
        />
        {done ? (
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            className="absolute size-8 items-center justify-center rounded-full"
            style={{
              left: FAN_BOX.width / 2 + 80 - 18,
              top: -4,
              backgroundColor: DONE_GREEN,
              borderWidth: 3,
              borderColor: colors.background,
            }}
          >
            <SymbolIcon
              name="checkmark"
              size={14}
              weight="bold"
              tintColor="#ffffff"
            />
          </View>
        ) : null}
        <ConfettiBurst
          fire={celebrate}
          width={FAN_BOX.width}
          height={FAN_BOX.height}
          colors={[colors.primary, "#F2C14E", "#F472B6", "#34D399", "#60A5FA"]}
        />
      </View>
    </View>
  );
}

/** The big number or word on the front card of a `HeroMark`. */
export function HeroMarkValue({
  value,
  label,
}: {
  value: string;
  label?: string;
}) {
  return (
    <>
      <Text
        adjustsFontSizeToFit
        className="text-4xl font-black tabular-nums tracking-tight text-foreground"
        minimumFontScale={0.6}
        numberOfLines={1}
      >
        {value}
      </Text>
      {label ? (
        <Text className="text-xs font-semibold text-muted-foreground">
          {label}
        </Text>
      ) : null}
    </>
  );
}

/** Eyebrow, title and one or two lines under it, centred in the hero. */
export function HeroTitle({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string | null;
  /** Under the description: a badge, a note. */
  children?: ReactNode;
}) {
  return (
    <View className="items-center gap-2">
      <Eyebrow size="md" tone="primary">
        {eyebrow}
      </Eyebrow>
      <Text
        accessibilityRole="header"
        className="text-center font-black tracking-tight text-foreground"
        numberOfLines={2}
        style={HERO_TITLE}
      >
        {title}
      </Text>
      {description ? (
        <Text className="text-center text-sm leading-6 text-muted-foreground">
          {description}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

export type Fact = {
  icon: SymbolName;
  text: string;
  /** Read out instead of `text` ("Waktu: 20 menit"). */
  accessibilityLabel?: string;
  /** A tappable chip changes a setting. */
  onPress?: () => void;
  accessibilityHint?: string;
  active?: boolean;
};

/**
 * A fact under the hero title as a small chip with an icon. A tappable chip
 * changes a setting and shows a chevron.
 */
export function FactChip({
  icon,
  text,
  accessibilityLabel,
  onPress,
  accessibilityHint,
  active = false,
}: Fact) {
  const { colors } = useAppTheme();
  const body = (
    <View
      className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
      style={{
        backgroundColor: active
          ? withOpacity(colors.primary, 0.14)
          : colors.muted,
      }}
    >
      <SymbolIcon
        name={icon}
        size={13}
        tintColor={onPress ? colors.primary : colors.mutedForeground}
        weight="semibold"
      />
      <Text className="text-sm font-semibold text-foreground">{text}</Text>
      {onPress ? (
        <SymbolIcon
          name="chevron.down"
          size={10}
          tintColor={colors.mutedForeground}
          weight="bold"
        />
      ) : null}
    </View>
  );
  if (!onPress) {
    return (
      <View accessible accessibilityLabel={accessibilityLabel ?? text}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel ?? text}
      accessibilityRole="button"
      className="active:opacity-60"
      onPress={onPress}
    >
      {body}
    </Pressable>
  );
}

/** A centred, wrapping row of fact chips. */
export function FactChips({
  facts,
  children,
}: {
  facts?: readonly Fact[];
  /** Chips of the caller's own (tappable ones). */
  children?: ReactNode;
}) {
  return (
    <View className="flex-row flex-wrap justify-center gap-2">
      {facts?.map((fact) => (
        <FactChip key={fact.text} {...fact} />
      ))}
      {children}
    </View>
  );
}
