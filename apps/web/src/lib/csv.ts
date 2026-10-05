/**
 * Builds RFC 4180 CSV. Cells that a spreadsheet would run as a formula are prefixed with an
 * apostrophe, since exported values (names, contacts) are typed by the public.
 */
export type CsvCell = string | number | boolean | null | undefined;

export function toCsv(rows: ReadonlyArray<ReadonlyArray<CsvCell>>) {
  return rows
    .map((row) =>
      row
        .map((value) => {
          let cell = value === null || value === undefined ? "" : String(value);
          if (/^[=+\-@\t\r]/.test(cell)) cell = `'${cell}`;
          return /[",\r\n]/.test(cell)
            ? `"${cell.replaceAll('"', '""')}"`
            : cell;
        })
        .join(","),
    )
    .join("\r\n");
}

/** Saves CSV text as a file, with a BOM so Excel reads UTF-8 names correctly. */
export function downloadCsv(fileName: string, csv: string) {
  const url = URL.createObjectURL(
    new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
