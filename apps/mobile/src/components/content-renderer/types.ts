import type { PdfBookResource } from "@hakgyo/shared";
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
  emptyState?: ReactNode;
  onOpenUrl?: (url: string) => void | Promise<void>;
  onOpenResource?: (
    type: ResourceReferenceType,
    resourceId: string,
    courseItemId: string | null,
  ) => void;
  renderers?: Readonly<Record<string, ContentBlockRenderer>>;
  resourceReferences?: ResourceReferenceData;
  resolveAssetUrl?: AssetUrlResolver;
  /** Reports whether a paged block (e.g. PDF pages) has been read to its end. */
  onReadingProgress?: (key: string, finished: boolean) => void;
};
