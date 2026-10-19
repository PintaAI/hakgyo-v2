import { Image } from "expo-image";
import { Text, View } from "react-native";

/** A round picture, or the initials when there is no picture. */
export function Avatar({
  uri,
  initials,
  size = 36,
  tone = "primary",
}: {
  uri?: string | null;
  initials: string;
  /** Diameter in points. */
  size?: number;
  tone?: "primary" | "muted";
}) {
  return (
    <View
      className={`items-center justify-center overflow-hidden rounded-full ${tone === "primary" ? "bg-primary" : "border border-border bg-muted"}`}
      style={{ width: size, height: size }}
    >
      {uri ? (
        <Image
          accessibilityIgnoresInvertColors
          cachePolicy="memory-disk"
          contentFit="cover"
          source={{ uri }}
          style={{ width: "100%", height: "100%" }}
          transition={0}
        />
      ) : (
        <Text
          className={`font-extrabold ${tone === "primary" ? "text-primary-foreground" : "text-primary"}`}
          style={{ fontSize: Math.max(12, Math.round(size / 2.75)) }}
        >
          {initials}
        </Text>
      )}
    </View>
  );
}
