import { describe, expect, test } from "bun:test";

import { blockNoteDocument, serializedJson } from "./document-input";

// What the editor sends for a table whose columns were never resized,
// including tables BlockNote loads from content without `columnWidths`.
const tableBlock = {
  id: "table-1",
  type: "table",
  props: { textColor: "default" },
  content: {
    type: "tableContent",
    columnWidths: [undefined, undefined, 180],
    headerRows: 1,
    headerCols: undefined,
    rows: [
      {
        cells: [
          { type: "tableCell", content: [], props: { colspan: 1 } },
          { type: "tableCell", content: [], props: { colspan: 1 } },
          { type: "tableCell", content: [], props: { colspan: 1 } },
        ],
      },
    ],
  },
  children: [],
};

describe("blockNoteDocument", () => {
  test("turns undefined table column widths into null", () => {
    const parsed = blockNoteDocument.parse([tableBlock]) as unknown as [
      { content: { columnWidths: unknown[]; headerCols?: unknown } },
    ];

    expect(parsed[0].content.columnWidths).toEqual([null, null, 180]);
    expect("headerCols" in parsed[0].content).toBe(false);
    expect(JSON.stringify(parsed)).not.toContain("undefined");
  });

  test("still rejects unknown block types", () => {
    expect(
      blockNoteDocument.safeParse([{ type: "notABlock", props: {} }]).success,
    ).toBe(false);
  });
});

describe("serializedJson", () => {
  test("turns undefined array entries into null", () => {
    const parsed = serializedJson.parse([tableBlock]) as unknown as [
      { content: { columnWidths: unknown[] } },
    ];

    expect(parsed[0].content.columnWidths).toEqual([null, null, 180]);
  });
});
