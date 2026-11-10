import type { materialPosition } from "@hakgyo/shared/learning";
import { Text, View } from "react-native";

import { Eyebrow } from "../learning-ui";

/** What the learner is about to study: the material's place, title and one-line summary. */
export function MaterialHeader({
  title,
  description,
  position,
}: {
  title: string;
  description: string | null;
  position: ReturnType<typeof materialPosition>;
}) {
  return (
    <View className="mb-6 gap-2 border-b border-border pb-6">
      {position ? (
        <Eyebrow>
          {`Bab ${position.chapter} · Materi ${position.index} dari ${position.total}`}
        </Eyebrow>
      ) : null}
      <Text
        accessibilityRole="header"
        className="text-2xl font-black leading-8 tracking-tight text-foreground"
      >
        {title}
      </Text>
      {description?.trim() ? (
        <Text className="text-base leading-6 text-muted-foreground">
          {description}
        </Text>
      ) : null}
    </View>
  );
}
