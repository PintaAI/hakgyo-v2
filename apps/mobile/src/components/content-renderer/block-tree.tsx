import { Text, View } from "react-native";

import { inlinePlainText } from "./normalize";
import { useContentRenderer } from "./context";
import type { ContentBlock } from "./types";

function UnsupportedBlock({ block }: { block: ContentBlock }) {
  const text = inlinePlainText(block.content);

  // Unknown blocks without text (for example a new embed type) are skipped
  // rather than shown as a placeholder.
  return text ? (
    <Text className="text-base leading-7 text-foreground">{text}</Text>
  ) : null;
}

export function BlockTree({
  blocks,
  depth = 0,
}: {
  blocks: ContentBlock[];
  depth?: number;
}) {
  const { renderers } = useContentRenderer();
  let orderedIndex = 0;

  return (
    <View className={depth === 0 ? "gap-4" : "gap-3"}>
      {blocks.map((block, index) => {
        orderedIndex = block.type === "numberedListItem" ? orderedIndex + 1 : 0;
        const Renderer = renderers[block.type];

        return (
          <View key={block.id ?? `${depth}-${index}-${block.type}`}>
            {Renderer ? (
              <Renderer
                block={block}
                depth={depth}
                index={index}
                orderedIndex={orderedIndex}
              />
            ) : (
              <UnsupportedBlock block={block} />
            )}
            {block.children.length ? (
              <View className="mt-3 border-l border-border pl-4">
                <BlockTree blocks={block.children} depth={depth + 1} />
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
