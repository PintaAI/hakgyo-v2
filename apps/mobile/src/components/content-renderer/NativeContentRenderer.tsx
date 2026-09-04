import { useMemo } from "react";
import { Text, View } from "react-native";

import { BlockTree } from "./block-tree";
import { ContentRendererProvider } from "./context";
import { customBlockRenderers } from "./custom-blocks";
import { normalizeContent } from "./normalize";
import { standardBlockRenderers } from "./standard-blocks";
import type { NativeContentRendererProps } from "./types";

export function NativeContentRenderer({
  content,
  emptyState,
  onOpenUrl,
  onOpenResource,
  renderers,
  resourceReferences,
  resolveAssetUrl,
}: NativeContentRendererProps) {
  const blocks = useMemo(() => normalizeContent(content), [content]);
  const rendererMap = useMemo(
    () => ({
      ...standardBlockRenderers,
      ...customBlockRenderers,
      ...renderers,
    }),
    [renderers],
  );

  return (
    <ContentRendererProvider
      onOpenUrl={onOpenUrl}
      onOpenResource={onOpenResource}
      renderers={rendererMap}
      resourceReferences={resourceReferences}
      resolveAssetUrl={resolveAssetUrl}
    >
      {blocks.length ? (
        <View className="w-full bg-transparent">
          <BlockTree blocks={blocks} />
        </View>
      ) : (
        (emptyState ?? (
          <View className="rounded-xl border border-dashed border-border p-6">
            <Text className="text-center text-sm text-muted-foreground">
              No content yet.
            </Text>
          </View>
        ))
      )}
    </ContentRendererProvider>
  );
}
