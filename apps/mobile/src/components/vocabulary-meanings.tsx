import { Text, View } from "react-native";

/**
 * The meanings of a vocabulary entry: plain text for one meaning, a numbered
 * list when the word has several.
 */
export function VocabularyMeanings({
  meanings,
  className,
  numberOfLines,
}: {
  meanings: readonly string[];
  className?: string;
  /** Lines per meaning, for compact rows and cards. */
  numberOfLines?: number;
}) {
  if (meanings.length <= 1) {
    return (
      <Text className={className} numberOfLines={numberOfLines}>
        {meanings[0] ?? ""}
      </Text>
    );
  }
  return (
    <View className="gap-0.5">
      {meanings.map((meaning, index) => (
        <Text
          className={className}
          key={`${index}:${meaning}`}
          numberOfLines={numberOfLines}
        >
          {index + 1}. {meaning}
        </Text>
      ))}
    </View>
  );
}
