import type { PdfBookResource } from "@hakgyo/shared";
import type { MaterialLinkTarget } from "@hakgyo/shared/material-links";
import type { ComponentType, ReactNode } from "react";

export type ContentBlock = {
  children: ContentBlock[];
  content: unknown;
  id?: string;
  props: Record<string, unknown>;
  type: string;
};

export type InlineTextNode = {
  styles: Record<string, boolean | string>;
  text: string;
  type: "text";
};

export type InlineLinkNode = {
  content: InlineTextNode[];
  href: string;
  /** Set for links to another material (`hakgyo-material:` hrefs). */
  material?: MaterialLinkTarget;
  type: "link";
};

export type InlineNode = InlineLinkNode | InlineTextNode;

export type AssetUrlResolver = (assetId: string) => Promise<string | null>;

export type ResourceReferenceData = {
  sourceCourseItemId?: string;
  vocabularySets: Array<{
    id: string;
    title: string;
    description: string | null;
    courseItemId: string | null;
    entries: Array<{
      id: string;
      term: string;
      /** Read through `entryMeanings`; older caches only have `definition`. */
      meanings?: string[];
      definition: string;
      examples: unknown;
      audioAsset: { id: string; fileName: string } | null;
      imageAsset: { id: string; fileName: string } | null;
    }>;
  }>;
  assessments: Array<{
    id: string;
    title: string;
    description: string | null;
    questionCount: number;
    courseItemId: string | null;
  }>;
  pdfBooks?: PdfBookResource[];
};

export type ResourceReferenceType = "assessment" | "vocabulary";

export type BlockRendererProps = {
  block: ContentBlock;
  depth: number;
  index: number;
  orderedIndex: number;
};

export type ContentBlockRenderer = ComponentType<BlockRendererProps>;

export type NativeContentRendererProps = {
  content: unknown;
  /**
   * The course item the content belongs to. Hangeul game blocks open their
   * game from it and return to it; without one (assessment questions) they
   * only describe the game.
   */
  courseItemId?: string;
  emptyState?: ReactNode;
  onOpenUrl?: (url: string) => void | Promise<void>;
  onOpenResource?: (
    type: ResourceReferenceType,
    resourceId: string,
    courseItemId: string | null,
  ) => void;
  /**
   * Opens a link to another material (or to a section of this one). Without
   * it material links render as text that does nothing when pressed.
   */
  onOpenMaterialLink?: (target: MaterialLinkTarget) => void;
  /** Reports the y offset of each top-level block with an id, for anchors. */
  onBlockLayout?: (blockId: string, y: number) => void;
  renderers?: Readonly<Record<string, ContentBlockRenderer>>;
  resourceReferences?: ResourceReferenceData;
  resolveAssetUrl?: AssetUrlResolver;
  /** Reports whether a paged block (e.g. PDF pages) has been read to its end. */
  onReadingProgress?: (key: string, finished: boolean) => void;
};
