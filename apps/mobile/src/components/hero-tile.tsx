import { Image } from "expo-image";
import {
  ActivityIndicator,
  type ImageSourcePropType,
  Pressable,
  Text,
  View,
} from "react-native";

import { useAppTheme } from "../providers/AppThemeProvider";
import { StudyGlass } from "./study-glass";
import { Eyebrow } from "./ui/eyebrow";

/** Matches the card-level surfaces of a Belajar class card. */
const TILE_RADIUS = 20;

export type HeroTileContent = {
  eyebrow: string;
  /** A red dot and a red eyebrow, for something happening now. */
  live?: boolean;
  title: string;
  meta: string;
  /** The action's label in the pill on the right ("Mulai", "Lanjutkan"). */
  pill?: string;
  pillIcon?: ImageSourcePropType;
  onPress?: () => void;
};

/**
 * The glass tile that starts or continues something: what it is on the left
 * (eyebrow, title, one line of detail), the action as a pill on the right,
 * and the whole tile tappable. The one way to start in Hakgyo: the next
 * lesson on a Belajar class card, a game's source in Latihan, a tugas, a
 * latihan or tryout, a vocabulary session, the next activity after a tugas.
 */
export function HeroTile({
  compact = false,
  disabled = false,
  loading = false,
  accessibilityHint,
  ...hero
}: HeroTileContent & {
  /** Smaller title and padding, for a tile among others. */
  compact?: boolean;
  /** Shows the pill dimmed and ignores taps (a class still to pick). */
  disabled?: boolean;
  /** A spinner in the pill while the action starts. */
  loading?: boolean;
  accessibilityHint?: string;
}) {
  const hasAction = !!hero.pill && !!hero.onPress;
  const pressable = hasAction && !disabled && !loading;
  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={
        hasAction ? `${hero.pill}: ${hero.title}. ${hero.meta}` : undefined
      }
      accessibilityRole={hero.onPress ? "button" : undefined}
      accessibilityState={
        hasAction ? { disabled: !pressable, busy: loading } : undefined
      }
      className={pressable ? "active:opacity-80" : ""}
      disabled={!pressable}
      onPress={hero.onPress}
    >
      <StudyGlass
        isInteractive={pressable}
        radius={TILE_RADIUS}
        bordered={false}
        contentClassName=""
      >
        {hasAction ? (
          // One row: copy left (truncates), pill pinned right so a long
          // title never pushes the button down.
          <View
            className={`flex-row items-center gap-3 px-5 ${compact ? "py-4" : "py-5"}`}
          >
            <View className="min-w-0 flex-1 gap-1">
              <HeroTileCopy
                hero={hero}
                compact={compact}
                truncateTitle={!compact}
              />
            </View>
            <View
              className="shrink-0"
              style={disabled ? { opacity: 0.45 } : undefined}
            >
              <HeroTilePill hero={hero} loading={loading} />
            </View>
          </View>
        ) : (
          <View className="gap-1.5 px-5 py-5">
            <HeroTileCopy hero={hero} />
          </View>
        )}
      </StudyGlass>
    </Pressable>
  );
}

function HeroTileCopy({
  hero,
  compact = false,
  truncateTitle = false,
}: {
  hero: HeroTileContent;
  compact?: boolean;
  truncateTitle?: boolean;
}) {
  return (
    <>
      <View className="flex-row items-center gap-1.5">
        {hero.live ? (
          <View className="size-2 rounded-full bg-destructive" />
        ) : null}
        <Eyebrow tone={hero.live ? "destructive" : "primary"} numberOfLines={1}>
          {hero.eyebrow}
        </Eyebrow>
      </View>
      <Text
        className={
          compact
            ? "text-lg font-black leading-6 text-foreground"
            : "text-xl font-black leading-7 text-foreground"
        }
        ellipsizeMode="tail"
        numberOfLines={truncateTitle ? 1 : 2}
      >
        {hero.title}
      </Text>
      <Text
        className="text-xs font-semibold text-muted-foreground"
        numberOfLines={1}
      >
        {hero.meta}
      </Text>
    </>
  );
}

function HeroTilePill({
  hero,
  loading,
}: {
  hero: HeroTileContent;
  loading: boolean;
}) {
  const { colors } = useAppTheme();
  return (
    <View className="flex-row items-center gap-1.5 rounded-full bg-primary px-4 py-2">
      {loading ? (
        <ActivityIndicator size="small" color={colors.primaryForeground} />
      ) : hero.pillIcon ? (
        <Image
          accessibilityIgnoresInvertColors
          cachePolicy="memory-disk"
          contentFit="contain"
          source={hero.pillIcon}
          style={{ width: 14, height: 14 }}
          transition={0}
        />
      ) : null}
      <Text className="text-sm font-bold text-primary-foreground">
        {hero.pill}
      </Text>
    </View>
  );
}
