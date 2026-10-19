import { Text, View } from "react-native";

import { Eyebrow } from "./eyebrow";

const sizes = {
  md: { title: "text-3xl", description: "text-sm leading-5" },
  lg: { title: "text-4xl leading-tight", description: "text-base leading-6" },
} as const;

/** The introduction at the top of a sheet or onboarding page. */
export function HeroHeader({
  eyebrow,
  title,
  description,
  size = "md",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  size?: keyof typeof sizes;
}) {
  return (
    <View className={size === "lg" ? "gap-3" : "gap-2"}>
      {eyebrow ? (
        <Eyebrow tone={size === "lg" ? "primary" : "muted"} size="md">
          {eyebrow}
        </Eyebrow>
      ) : null}
      <Text
        accessibilityRole="header"
        className={`${sizes[size].title} font-black tracking-tight text-foreground`}
      >
        {title}
      </Text>
      {description ? (
        <Text className={`${sizes[size].description} text-muted-foreground`}>
          {description}
        </Text>
      ) : null}
    </View>
  );
}
