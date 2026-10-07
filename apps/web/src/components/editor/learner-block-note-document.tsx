"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/shadcn/style.css";

import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";

import { useAssetUrlLoader } from "~/components/asset-download-url";

import { AssetUploadProvider } from "./asset-upload-context";
import { PdfBookProvider } from "./pdf-book-context";
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
  const loadAssetUrl = useAssetUrlLoader();
  const editor = useCreateBlockNote({
    initialContent: content,
    resolveFileUrl: async (url) => {
      if (!url.startsWith(assetUrlPrefix)) return url;
      return loadAssetUrl(url.slice(assetUrlPrefix.length));
    },
    schema: hakgyoBlockNoteSchema,
    trailingBlock: false,
  });

  const document = (
    <div className="[&_.bn-container]:mx-auto [&_.bn-container]:max-w-none [&_.bn-editor]:px-0">
      <AssetUploadProvider value={null}>
        {/* Read-only, the toolbar only offers a file download button that pops over
            images, which gets in the way when an image is a tappable answer option. */}
        <BlockNoteView
          editable={false}
          editor={editor}
          formattingToolbar={false}
          theme={theme}
        />
      </AssetUploadProvider>
    </div>
  );
  return resources ? (
    <ResourceReferenceProvider learnerResources={resources}>
      <PdfBookProvider
        value={{ mode: "learner", books: resources.pdfBooks ?? [] }}
      >
        {document}
      </PdfBookProvider>
    </ResourceReferenceProvider>
  ) : (
    document
  );
}
