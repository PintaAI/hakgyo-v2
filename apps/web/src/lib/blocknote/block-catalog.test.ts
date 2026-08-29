import { describe, expect, test } from "bun:test";

import {
  assetAudioBlockType,
  assetImageBlockType,
  calloutBlockType,
  calloutTones,
  hakgyoBlockCatalog,
} from "./block-catalog";

describe("Hakgyo BlockNote catalog", () => {
  test("keeps custom block identifiers and examples aligned", () => {
    const customTypes = hakgyoBlockCatalog.customBlocks.map(
      (block) => block.type,
    );

    expect(customTypes).toEqual([
      assetAudioBlockType,
      assetImageBlockType,
      calloutBlockType,
    ]);
    const callout = hakgyoBlockCatalog.customBlocks.find(
      (block) => block.type === calloutBlockType,
    );
    expect(callout).toBeDefined();
    if (!callout || !("example" in callout)) return;
    expect(callout.example.type).toBe(calloutBlockType);
    expect(calloutTones).toContain(callout.example.props.tone);
  });
});
