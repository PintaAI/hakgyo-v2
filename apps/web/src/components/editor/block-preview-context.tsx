"use client";

import { createContext, useContext, type ReactNode } from "react";

type PreviewBlock = (block: unknown) => void;

const BlockPreviewContext = createContext<PreviewBlock | null>(null);

export function BlockPreviewProvider({
  children,
  previewBlock,
}: {
  children: ReactNode;
  previewBlock: PreviewBlock;
}) {
  return (
    <BlockPreviewContext.Provider value={previewBlock}>
      {children}
    </BlockPreviewContext.Provider>
  );
}

export function useBlockPreview() {
  return useContext(BlockPreviewContext);
}
