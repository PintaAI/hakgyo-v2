import { memo, useMemo } from "react";
import { View } from "react-native";

import { EmptyState } from "../learning-ui";
import { BlockTree } from "./block-tree";
import { ContentRendererProvider } from "./context";
import { customBlockRenderers } from "./custom-blocks";
import { normalizeContent } from "./normalize";
import { standardBlockRenderers } from "./standard-blocks";
import type { NativeContentRendererProps } from "./types";

/**
 * Memoized: a material is long, and its screen re-renders for reasons the
 * content does not depend on.
 */
export const NativeContentRenderer = memo(function NativeContentRenderer({
  content,
  courseItemId,
  emptyState,
  onBlockLayout,
  onOpenMaterialLink,
  onOpenUrl,
  onOpenResource,
  onReadingProgress,
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
      courseItemId={courseItemId}
      onBlockLayout={onBlockLayout}
      onOpenMaterialLink={onOpenMaterialLink}
      onOpenUrl={onOpenUrl}
      onOpenResource={onOpenResource}
      onReadingProgress={onReadingProgress}
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
          <EmptyState variant="dashed">Belum ada konten.</EmptyState>
        ))
      )}
    </ContentRendererProvider>
  );
});
