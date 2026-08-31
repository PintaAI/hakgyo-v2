"use client";

import { createContext, useContext } from "react";

export type UploadedEditorAsset = {
  assetId: string;
  fileName: string;
  contentType: string;
};

export type UploadEditorAsset = (
  file: File,
  kind: "audio" | "file" | "image",
) => Promise<UploadedEditorAsset>;

export type RemoveEditorAsset = (assetId: string) => Promise<void>;

export type EditorAssetStorage = {
  upload: UploadEditorAsset;
  remove?: RemoveEditorAsset;
};

const AssetUploadContext = createContext<EditorAssetStorage | null>(null);

export const AssetUploadProvider = AssetUploadContext.Provider;

export function useEditorAssetUpload() {
  return useContext(AssetUploadContext);
}
