import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";

import {
  assetAudioBlockType,
  assetImageBlockType,
  calloutBlockType,
} from "~/lib/blocknote/block-catalog";

import { assetAudioBlock, assetImageBlock } from "./blocks/asset-media-block";
import { calloutBlock } from "./blocks/callout-block";

export const hakgyoBlockNoteSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    [calloutBlockType]: calloutBlock,
    [assetAudioBlockType]: assetAudioBlock,
    [assetImageBlockType]: assetImageBlock,
  },
});

export type HakgyoBlockNoteEditor =
  typeof hakgyoBlockNoteSchema.BlockNoteEditor;
export type HakgyoBlock = typeof hakgyoBlockNoteSchema.Block;
export type HakgyoPartialBlock = typeof hakgyoBlockNoteSchema.PartialBlock;
