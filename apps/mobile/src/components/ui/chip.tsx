import { Pressable, Text, View } from "react-native";

/** A selectable filter pill. */
export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className="active:opacity-70"
      onPress={onPress}
    >
      <View
        className={`min-h-9 max-w-52 items-center justify-center rounded-full px-3.5 ${selected ? "bg-primary" : "bg-muted"}`}
      >
        <Text
          className={`text-xs font-bold ${selected ? "text-primary-foreground" : "text-foreground"}`}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
