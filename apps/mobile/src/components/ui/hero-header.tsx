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
  align = "start",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  size?: keyof typeof sizes;
  /** `center` for centered compositions, such as under an app icon. */
  align?: "start" | "center";
}) {
  const centered = align === "center";
  return (
    <View
      className={`${size === "lg" ? "gap-3" : "gap-2"} ${centered ? "items-center" : ""}`}
    >
      {eyebrow ? (
        <Eyebrow tone={size === "lg" ? "primary" : "muted"} size="md">
          {eyebrow}
        </Eyebrow>
      ) : null}
      <Text
        accessibilityRole="header"
        className={`${sizes[size].title} font-black tracking-tight text-foreground ${centered ? "text-center" : ""}`}
      >
        {title}
      </Text>
      {description ? (
        <Text
          className={`${sizes[size].description} text-muted-foreground ${centered ? "text-center" : ""}`}
        >
          {description}
        </Text>
      ) : null}
    </View>
  );
}
