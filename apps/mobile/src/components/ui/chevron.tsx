import { Text } from "react-native";

/** The disclosure arrow at the end of a tappable row. */
export function Chevron({ className = "" }: { className?: string }) {
  return (
    <Text
      accessibilityElementsHidden
      className={`text-lg text-muted-foreground ${className}`}
      importantForAccessibility="no"
    >
      ›
    </Text>
  );
}
