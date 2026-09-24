import { useMemo, useState } from "react";
import {
  Dimensions,
  Image,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";

import { useAppTheme } from "../providers/AppThemeProvider";

const doodleSource = require("../../assets/background.png");

const DEFAULT_TILE = 192;

type DoodlePatternProps = {
  tint: string;
  size: number;
};

/**
 * Single doodle tile. The image is pre-processed: paper removed, alpha
 * baked at 6%, so `tintColor` only paints the strokes.
 */
export function DoodlePattern({ tint, size }: DoodlePatternProps) {
  return (
    <Image
      accessible={false}
      source={doodleSource}
      style={{ width: size, height: size }}
      tintColor={tint}
    />
  );
}

type DoodleBackgroundProps = {
  /** Tile edge length in points. Defaults to 160. */
  tile?: number;
  /** Extra style merged over the absolute-fill container. */
  style?: ViewStyle;
};

/**
 * Korean-doodle pattern overlay. Tiles are laid out in a manual grid
 * because RN `resizeMode="repeat"` scales the image to fill on iOS instead
 * of tiling (Android-only behavior). The tint is the theme `primary` so it
 * follows the active organization branding in both light and dark mode.
 *
 * Drop it inside any relative container:
 *
 * ```tsx
 * <View className="relative overflow-hidden">
 *   <DoodleBackground />
 *   <Text>Content on top</Text>
 * </View>
 * ```
 */
export function DoodleBackground({ tile = DEFAULT_TILE, style }: DoodleBackgroundProps) {
  const { colors } = useAppTheme();
  // Seed with window size so tiles render on the very first frame;
  // onLayout corrects it to the real container size (rotation, split view).
  const [size, setSize] = useState(() => {
    const window = Dimensions.get("window");
    return { width: window.width, height: window.height };
  });
  const grid = useMemo(() => {
    return {
      rows: Math.ceil(size.height / tile),
      cols: Math.ceil(size.width / tile),
    };
  }, [size, tile]);
  const rowList = useMemo(
    () => Array.from({ length: grid.rows }, (_, index) => index),
    [grid.rows],
  );
  const colList = useMemo(
    () => Array.from({ length: grid.cols }, (_, index) => index),
    [grid.cols],
  );

  return (
    <View
      pointerEvents="none"
      // Static layer: cache as one GPU texture so scrolling text above it
      // doesn't force alpha re-compositing every frame on Android.
      // (iOS rasterizes static layers by default.)
      renderToHardwareTextureAndroid
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setSize((current) =>
          current?.width === width && current?.height === height
            ? current
            : { width, height },
        );
      }}
      style={[StyleSheet.absoluteFill, style, { overflow: "hidden" }]}
    >
      {rowList.map((row) => (
        <View key={row} style={{ flexDirection: "row" }}>
          {colList.map((col) => (
            <DoodlePattern
              key={`${row}-${col}`}
              tint={colors.primary}
              size={tile}
            />
          ))}
        </View>
      ))}
    </View>
  );
}
