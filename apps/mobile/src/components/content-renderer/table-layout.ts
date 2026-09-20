export type TableCellLayout = { flex: 1 } | { width: number };

const DEFAULT_COLUMN_WIDTH = 160;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function tableCellColspan(cell: unknown): number {
  if (!isRecord(cell) || !isRecord(cell.props)) return 1;

  const colspan = cell.props.colspan;
  return typeof colspan === "number" && Number.isFinite(colspan)
    ? Math.max(1, colspan)
    : 1;
}

export function tableColumnCount(rows: unknown[]): number {
  return rows.reduce<number>((largest, rawRow) => {
    if (!isRecord(rawRow) || !Array.isArray(rawRow.cells)) return largest;

    const columns = rawRow.cells.reduce<number>(
      (total, cell) => total + tableCellColspan(cell),
      0,
    );
    return Math.max(largest, columns);
  }, 0);
}

export function tableCellLayout({
  columnCount,
  columnWidths,
  columnIndex,
  colspan,
}: {
  columnCount: number;
  columnWidths: unknown;
  columnIndex: number;
  colspan: number;
}): TableCellLayout {
  const widths = Array.isArray(columnWidths)
    ? columnWidths.slice(columnIndex, columnIndex + colspan)
    : [];
  const hasExplicitWidths =
    widths.length === colspan &&
    widths.every(
      (width) =>
        typeof width === "number" && Number.isFinite(width) && width > 0,
    );

  if (hasExplicitWidths) {
    return {
      width: widths.reduce((total, width) => total + (width as number), 0),
    };
  }

  if (columnCount === 1) return { flex: 1 };

  return { width: DEFAULT_COLUMN_WIDTH * colspan };
}
