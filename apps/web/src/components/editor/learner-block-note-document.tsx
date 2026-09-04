"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/shadcn/style.css";

import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";

import { api } from "~/trpc/react";

import { AssetUploadProvider } from "./asset-upload-context";
import {
  hakgyoBlockNoteSchema,
  type HakgyoPartialBlock,
} from "./block-note-schema";
import {
  ResourceReferenceProvider,
  type LearnerReferenceResources,
} from "./resource-reference-context";

const assetUrlPrefix = "hakgyo-asset:";

export type LearnerBlockNoteDocumentProps = {
  content: HakgyoPartialBlock[];
  theme: "light" | "dark";
  resources?: LearnerReferenceResources;
};

export function LearnerBlockNoteDocument({
  content,
  theme,
  resources,
}: LearnerBlockNoteDocumentProps) {
  const utils = api.useUtils();
  const editor = useCreateBlockNote({
    initialContent: content,
    resolveFileUrl: async (url) => {
      if (!url.startsWith(assetUrlPrefix)) return url;
      const result = await utils.client.storage.createDownloadUrl.mutate({
        assetId: url.slice(assetUrlPrefix.length),
        disposition: "inline",
      });
      return result.downloadUrl;
    },
    schema: hakgyoBlockNoteSchema,
    trailingBlock: false,
  });

  const document = (
    <div className="[&_.bn-container]:mx-auto [&_.bn-container]:max-w-none [&_.bn-editor]:bg-transparent [&_.bn-editor]:px-0">
      <AssetUploadProvider value={null}>
        <BlockNoteView editable={false} editor={editor} theme={theme} />
      </AssetUploadProvider>
    </div>
  );
  return resources ? (
    <ResourceReferenceProvider learnerResources={resources}>
      {document}
    </ResourceReferenceProvider>
  ) : (
    document
  );
}
