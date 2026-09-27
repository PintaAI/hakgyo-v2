import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";

import { useAppTheme } from "../../providers/AppThemeProvider";

/** A sidebar row with the course thumbnail (or its initial), title and subtitle. */
export function CourseRow({
  title,
  subtitle,
  thumbnailUrl,
  accessibilityHint,
  onPress,
}: {
  title: string;
  subtitle: string;
  thumbnailUrl: string | null;
  accessibilityHint: string;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();
  const initial = title.trim().charAt(0).toUpperCase() || "C";
  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityRole="button"
      className="flex-row items-center gap-2.5 rounded-xl px-2.5 py-2"
      onPress={onPress}
      style={{ backgroundColor: "transparent" }}
    >
      {thumbnailUrl ? (
        <Image
          accessibilityIgnoresInvertColors
          cachePolicy="memory-disk"
          contentFit="cover"
          source={{ uri: thumbnailUrl }}
          style={{ width: 44, height: 44, borderRadius: 12 }}
          transition={0}
        />
      ) : (
        <View
          className="items-center justify-center"
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: colors.sidebarAccent,
          }}
        >
          <Text
            className="text-base font-black"
            style={{ color: colors.primary }}
          >
            {initial}
          </Text>
        </View>
      )}
      <View className="min-w-0 flex-1">
        <Text
          className="font-semibold"
          numberOfLines={1}
          style={{ color: colors.foreground, fontSize: 13 }}
        >
          {title}
        </Text>
        <Text
          className="text-xs"
          numberOfLines={1}
          style={{ color: colors.mutedForeground }}
        >
          {subtitle}
        </Text>
      </View>
      <Text
        className="text-lg font-bold"
        style={{ color: colors.mutedForeground }}
      >
        ›
      </Text>
    </Pressable>
  );
}
