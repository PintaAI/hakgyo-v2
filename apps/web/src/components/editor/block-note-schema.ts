import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";

import {
  assessmentReferenceBlockType,
  assetAudioBlockType,
  assetImageBlockType,
  calloutBlockType,
  conversationBlockType,
  cultureBlockType,
  grammarBlockType,
  type hakgyoBlockCatalog,
  lessonPageBlockType,
  pdfPagesBlockType,
  vocabularyReferenceBlockType,
} from "~/lib/blocknote/block-catalog";

import { assetAudioBlock, assetImageBlock } from "./blocks/asset-media-block";
import { calloutBlock } from "./blocks/callout-block";
import { conversationBlock } from "./blocks/conversation-block";
import { cultureBlock } from "./blocks/culture-block";
import { grammarBlock } from "./blocks/grammar-block";
import { lessonPageBlock } from "./blocks/lesson-page-block";
import { pdfPagesBlock } from "./blocks/pdf-pages-block";
import {
  assessmentReferenceBlock,
  vocabularyReferenceBlock,
} from "./blocks/resource-reference-blocks";

export const hakgyoBlockNoteSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    [calloutBlockType]: calloutBlock,
    [conversationBlockType]: conversationBlock,
    [cultureBlockType]: cultureBlock,
    [assetAudioBlockType]: assetAudioBlock,
    [assetImageBlockType]: assetImageBlock,
    [lessonPageBlockType]: lessonPageBlock,
    [grammarBlockType]: grammarBlock,
    [vocabularyReferenceBlockType]: vocabularyReferenceBlock,
    [assessmentReferenceBlockType]: assessmentReferenceBlock,
    [pdfPagesBlockType]: pdfPagesBlock,
  },
});

export type HakgyoBlockNoteEditor =
  typeof hakgyoBlockNoteSchema.BlockNoteEditor;
export type HakgyoBlock = typeof hakgyoBlockNoteSchema.Block;
export type HakgyoPartialBlock = typeof hakgyoBlockNoteSchema.PartialBlock;

type CatalogBlockType =
  | (typeof hakgyoBlockCatalog.builtInBlocks)[number]["type"]
  | (typeof hakgyoBlockCatalog.customBlocks)[number]["type"];
type BlockTypeMissingFromCatalog = Exclude<
  keyof typeof hakgyoBlockNoteSchema.blockSpecs,
  CatalogBlockType
>;

// MCP agents only learn about blocks from hakgyoBlockCatalog, and saved
// content is validated against it. Adding a block here without describing it
// there fails typecheck with the missing type name.
export const catalogDescribesEveryBlock: [BlockTypeMissingFromCatalog] extends [
  never,
]
  ? true
  : BlockTypeMissingFromCatalog = true;
