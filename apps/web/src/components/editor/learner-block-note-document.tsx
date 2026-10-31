"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/shadcn/style.css";

import { useRef, useState, type MouseEvent } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";

import { parseMaterialLinkHref } from "@hakgyo/shared/material-links";

import { useAssetUrlLoader } from "~/components/asset-download-url";
import { isValidEditorLink } from "~/lib/blocknote/material-links";

import { AssetUploadProvider } from "./asset-upload-context";
import { scrollToBlock, useBlockAnchorLanding } from "./block-anchor";
import {
  MaterialLinkPreview,
  type LearnerMaterialLinks,
  type OpenMaterialLink,
} from "./material-link-preview";
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
  /**
   * Resolved material links of a course item. Tapping one opens its preview,
   * and the page lands on the block named by the URL hash. Without it (block
   * previews, practice content) material links do nothing.
   */
  materialLinks?: LearnerMaterialLinks;
};

export function LearnerBlockNoteDocument({
  content,
  theme,
  resources,
  materialLinks,
}: LearnerBlockNoteDocumentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [openLink, setOpenLink] = useState<OpenMaterialLink | null>(null);
  useBlockAnchorLanding(
    containerRef,
    materialLinks ? materialLinks.courseItemId : "",
    Boolean(materialLinks),
  );
  const loadAssetUrl = useAssetUrlLoader();
  const editor = useCreateBlockNote({
    initialContent: content,
    resolveFileUrl: async (url) => {
      if (!url.startsWith(assetUrlPrefix)) return url;
      return loadAssetUrl(url.slice(assetUrlPrefix.length));
    },
    schema: hakgyoBlockNoteSchema,
    trailingBlock: false,
    links: { isValidLink: isValidEditorLink },
  });

  // Read-only links are plain anchors the browser would follow; material
  // links have no URL, so they open the preview instead.
  const handleClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    const link = (event.target as Element).closest?.("a[href]");
    const target = parseMaterialLinkHref(link?.getAttribute("href"));
    if (!link || !target) return;
    event.preventDefault();
    event.stopPropagation();
    if (!materialLinks) return;
    setOpenLink({
      element: link as HTMLElement,
      target,
      text: link.textContent?.trim() ?? "",
    });
  };

  const document = (
    // BlockNote's own stylesheet is unlayered and pads the editor by 54px on
    // each side, which beats plain utilities; learners need the full width.
    <div
      ref={containerRef}
      data-learner-document=""
      onClickCapture={handleClickCapture}
      className="[&_.bn-container]:mx-auto [&_.bn-container]:max-w-none [&_.bn-editor]:px-0!"
    >
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
      {materialLinks ? (
        <MaterialLinkPreview
          open={openLink}
          materialLinks={materialLinks}
          onClose={() => setOpenLink(null)}
          onScrollToBlock={(blockId) => {
            if (containerRef.current) {
              scrollToBlock(containerRef.current, blockId);
            }
          }}
        />
      ) : null}
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
