import { describe, expect, test } from "bun:test";

import {
  calloutBlockType,
  calloutTones,
  hakgyoBlockCatalog,
} from "./block-catalog";

describe("Hakgyo BlockNote catalog", () => {
  test("keeps custom block identifiers and examples aligned", () => {
    const customTypes = hakgyoBlockCatalog.customBlocks.map(
      (block) => block.type,
    );

    expect(customTypes).toEqual([calloutBlockType]);
    expect(hakgyoBlockCatalog.customBlocks[0].example.type).toBe(
      calloutBlockType,
    );
    expect(calloutTones).toContain(
      hakgyoBlockCatalog.customBlocks[0].example.props.tone,
    );
  });
});
