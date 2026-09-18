import { describe, expect, test } from "bun:test";

import { toPrismaJsonValue } from "./prisma-json";

describe("toPrismaJsonValue", () => {
  test("removes undefined values produced by BlockNote tables", () => {
    const value = [
      {
        type: "table",
        content: {
          type: "tableContent",
          columnWidths: [undefined, 180],
          headerRows: undefined,
          headerCols: undefined,
          rows: [],
        },
      },
    ];

    expect(toPrismaJsonValue(value)).toEqual([
      {
        type: "table",
        content: {
          type: "tableContent",
          columnWidths: [null, 180],
          rows: [],
        },
      },
    ]);
  });

  test("rejects a top-level undefined value", () => {
    expect(() => toPrismaJsonValue(undefined)).toThrow(
      "Value is not JSON-serializable",
    );
  });
});
