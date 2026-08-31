import type { ReactNode } from "react";
import { Text, type StyleProp, type TextStyle } from "react-native";

import { normalizeInlineContent } from "./normalize";
import { useContentRenderer } from "./context";

function textStyle(styles: Record<string, boolean | string>): TextStyle {
  const decorations = [
    styles.underline ? "underline" : "",
    styles.strike ? "line-through" : "",
  ].filter(Boolean);

  return {
    fontStyle: styles.italic ? "italic" : undefined,
    fontWeight: styles.bold ? "700" : undefined,
    textDecorationLine: decorations.length
      ? (decorations.join(" ") as TextStyle["textDecorationLine"])
      : undefined,
  };
}

export function InlineContent({
  children,
  className,
  content,
  style,
}: {
  children?: ReactNode;
  className?: string;
  content: unknown;
  style?: StyleProp<TextStyle>;
}) {
  const { colors, onOpenUrl } = useContentRenderer();
  const nodes = normalizeInlineContent(content);

  return (
    <Text className={className} style={style}>
      {nodes.map((node, nodeIndex) =>
        node.type === "text" ? (
          <Text key={nodeIndex} style={textStyle(node.styles)}>
            {node.text}
          </Text>
        ) : (
          <Text
            accessibilityRole="link"
            key={nodeIndex}
            onPress={() => void onOpenUrl(node.href)}
            style={{ color: colors.primary, textDecorationLine: "underline" }}
          >
            {node.content.map((child, childIndex) => (
              <Text key={childIndex} style={textStyle(child.styles)}>
                {child.text}
              </Text>
            ))}
          </Text>
        ),
      )}
      {children}
    </Text>
  );
}
