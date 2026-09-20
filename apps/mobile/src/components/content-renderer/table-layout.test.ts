import { describe, expect, test } from "bun:test";

import { tableCellLayout } from "./table-layout";

describe("tableCellLayout", () => {
  test("stretches a widthless single-column BlockNote table", () => {
    expect(
      tableCellLayout({
        columnCount: 1,
        columnWidths: [null],
        columnIndex: 0,
        colspan: 1,
      }),
    ).toEqual({ flex: 1 });
  });

  test("keeps a widthless multi-column table horizontally scrollable", () => {
    expect(
      tableCellLayout({
        columnCount: 2,
        columnWidths: [null, null],
        columnIndex: 0,
        colspan: 1,
      }),
    ).toEqual({ width: 160 });
  });

  test("uses explicit BlockNote column widths when present", () => {
    expect(
      tableCellLayout({
        columnCount: 2,
        columnWidths: [120, 180],
        columnIndex: 0,
        colspan: 2,
      }),
    ).toEqual({ width: 300 });
  });
});
