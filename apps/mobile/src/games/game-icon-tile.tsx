import { Image } from "expo-image";
import { useMemo, useState, type ReactNode } from "react";
import { View } from "react-native";

import { useAppTheme } from "../providers/AppThemeProvider";
import { gameIconPalette, gameIconUri, hasGameIcon } from "./game-icons";

/** Icons fill this share of their tile, which gives them all one edge. */
const GAME_ICON_INSET = 0.66;

/**
 * A game's flat icon in the theme's colors (`game-icons.ts`) on a tinted
 * rounded square, so icons of different proportions share one edge. Shows
 * `fallback` inside the square when the game has no icon or it cannot be
 * drawn.
 */
export function GameIconTile({
  iconKey,
  size,
  fallback = null,
}: {
  iconKey: string;
  size: number;
  fallback?: ReactNode;
}) {
  const { colors } = useAppTheme();
  const [failed, setFailed] = useState(false);
  const uri = useMemo(
    () =>
      hasGameIcon(iconKey)
        ? gameIconUri(iconKey, gameIconPalette(colors.primary))
        : null,
    [colors.primary, iconKey],
  );
  const inner = Math.round(size * GAME_ICON_INSET);
  return (
    <View
      className="items-center justify-center bg-primary/10"
      style={{ width: size, height: size, borderRadius: size * 0.28 }}
    >
      {uri && !failed ? (
        <Image
          accessible={false}
          cachePolicy="memory"
          contentFit="contain"
          onError={() => setFailed(true)}
          source={{ uri }}
          style={{ width: inner, height: inner }}
          transition={0}
        />
      ) : (
        fallback
      )}
    </View>
  );
}
