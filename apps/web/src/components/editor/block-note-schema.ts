import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";

import { calloutBlockType } from "~/lib/blocknote/block-catalog";

import { calloutBlock } from "./blocks/callout-block";

export const hakgyoBlockNoteSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    [calloutBlockType]: calloutBlock,
  },
});

export type HakgyoBlockNoteEditor =
  typeof hakgyoBlockNoteSchema.BlockNoteEditor;
export type HakgyoBlock = typeof hakgyoBlockNoteSchema.Block;
export type HakgyoPartialBlock = typeof hakgyoBlockNoteSchema.PartialBlock;
