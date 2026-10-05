import { expect, test } from "bun:test";

import { toCsv } from "./csv";

test("toCsv quotes separators and neutralizes formulas", () => {
  expect(
    toCsv([
      ["Nama", "Kontak"],
      ['Ji "Woo", Kim', null],
      ["=HYPERLINK(1)", "+628123"],
    ]),
  ).toBe('Nama,Kontak\r\n"Ji ""Woo"", Kim",\r\n\'=HYPERLINK(1),\'+628123');
});
