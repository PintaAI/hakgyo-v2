import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";

import {
  assessmentReferenceBlockType,
  assetAudioBlockType,
  assetImageBlockType,
  calloutBlockType,
  conversationBlockType,
  cultureBlockType,
  grammarBlockType,
  lessonPageBlockType,
  vocabularyReferenceBlockType,
} from "~/lib/blocknote/block-catalog";

import { assetAudioBlock, assetImageBlock } from "./blocks/asset-media-block";
import { calloutBlock } from "./blocks/callout-block";
import { conversationBlock } from "./blocks/conversation-block";
import { cultureBlock } from "./blocks/culture-block";
import { grammarBlock } from "./blocks/grammar-block";
import { lessonPageBlock } from "./blocks/lesson-page-block";
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
  },
});

export type HakgyoBlockNoteEditor =
  typeof hakgyoBlockNoteSchema.BlockNoteEditor;
export type HakgyoBlock = typeof hakgyoBlockNoteSchema.Block;
export type HakgyoPartialBlock = typeof hakgyoBlockNoteSchema.PartialBlock;
