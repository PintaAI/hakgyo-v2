import { Directory, File, Paths } from "expo-file-system";

import type { AssetDownload, AssetFileStore } from "./asset-cache";

function safePathSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}

export function createDeviceAssetFileStore(userId: string): AssetFileStore {
  const directory = new Directory(
    Paths.document,
    "hakgyo-assets",
    safePathSegment(userId),
  );
  let indexedFiles: Map<string, string> | undefined;

  function fileExtension(download: AssetDownload) {
    const fileNameExtension = /\.[a-zA-Z0-9]{1,10}$/.exec(
      download.fileName ?? "",
    )?.[0];
    if (fileNameExtension) return fileNameExtension.toLowerCase();
    const byContentType: Record<string, string> = {
      "audio/aac": ".aac",
      "audio/m4a": ".m4a",
      "audio/mpeg": ".mp3",
      "audio/ogg": ".ogg",
      "audio/wav": ".wav",
      "audio/x-m4a": ".m4a",
      "image/gif": ".gif",
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
    };
    return byContentType[download.contentType ?? ""] ?? ".asset";
  }

  function indexFiles() {
    if (indexedFiles) return indexedFiles;
    indexedFiles = new Map();
    if (!directory.exists) return indexedFiles;
    for (const entry of directory.list()) {
      if (!(entry instanceof File) || !entry.exists || (entry.size ?? 0) <= 0)
        continue;
      const separator = entry.name.lastIndexOf("--");
      if (separator > 0) {
        indexedFiles.set(entry.name.slice(0, separator), entry.uri);
      }
    }
    return indexedFiles;
  }

  return {
    getUri(assetId) {
      return indexFiles().get(safePathSegment(assetId)) ?? null;
    },
    async download(assetId, download) {
      directory.create({ idempotent: true, intermediates: true });
      const file = new File(
        directory,
        `${safePathSegment(assetId)}--media${fileExtension(download)}`,
      );
      const downloaded = await File.downloadFileAsync(
        download.downloadUrl,
        file,
        { idempotent: true },
      );
      indexFiles().set(safePathSegment(assetId), downloaded.uri);
      return downloaded.uri;
    },
  };
}
