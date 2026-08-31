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
  renderers?: Readonly<Record<string, ContentBlockRenderer>>;
  resolveAssetUrl?: AssetUrlResolver;
};
