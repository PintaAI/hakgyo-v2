import { describe, expect, test } from "bun:test";

import { hakgyoBlockCatalog } from "~/lib/blocknote/block-catalog";

import { hakgyoBlockNoteSchema } from "./block-note-schema";

type SpecProp = { default?: unknown; values?: readonly unknown[] };
type CatalogProp = {
  type: string;
  default?: unknown;
  enum?: readonly unknown[];
};

describe("Hakgyo BlockNote schema and MCP block catalog", () => {
  const specs = hakgyoBlockNoteSchema.blockSpecs;

  test("lists every editor block type in the catalog", () => {
    const catalogTypes = [
      ...hakgyoBlockCatalog.builtInBlocks,
      ...hakgyoBlockCatalog.customBlocks,
    ].map((block): string => block.type);

    expect(catalogTypes.toSorted()).toEqual(Object.keys(specs).toSorted());
  });

  test("describes each custom block's props and content exactly", () => {
    for (const block of hakgyoBlockCatalog.customBlocks) {
      const config = specs[block.type].config;
      const specProps = config.propSchema as Record<string, SpecProp>;
      const catalogProps = block.props as Record<string, CatalogProp>;

      expect({ type: block.type, content: config.content }).toEqual({
        type: block.type,
        content: block.content,
      });
      expect(Object.keys(catalogProps).toSorted()).toEqual(
        Object.keys(specProps).toSorted(),
      );
      for (const [name, prop] of Object.entries(specProps)) {
        const described = catalogProps[name]!;
        expect({ prop: `${block.type}.${name}`, ...described }).toMatchObject({
          prop: `${block.type}.${name}`,
          type: typeof prop.default,
          default: prop.default,
          ...(prop.values ? { enum: prop.values } : {}),
        });
      }
    }
  });
});
