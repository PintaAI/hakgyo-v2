"use client";

import { createContext, useContext } from "react";

export type UploadedEditorAsset = {
  assetId: string;
  fileName: string;
  contentType: string;
};

export type UploadEditorAsset = (
  file: File,
  kind: "audio" | "image",
) => Promise<UploadedEditorAsset>;

const AssetUploadContext = createContext<UploadEditorAsset | null>(null);

export const AssetUploadProvider = AssetUploadContext.Provider;

export function useEditorAssetUpload() {
  return useContext(AssetUploadContext);
}
