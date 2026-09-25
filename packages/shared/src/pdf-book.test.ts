import { describe, expect, test } from "bun:test";

import {
  analyzeTableOfContents,
  clampPdfPageRange,
  detectPageOffset,
  collectPdfPageRanges,
  formatPdfPageRange,
  MAX_PDF_BLOCK_PAGES,
  parseTableOfContents,
  pdfPageRangeError,
} from "./pdf-book";

describe("collectPdfPageRanges", () => {
  test("finds nested pdfPages blocks and skips incomplete ones", () => {
    expect(
      collectPdfPageRanges([
        { type: "paragraph", children: [] },
        {
          type: "pdfPages",
          props: { bookId: "book-1", startPage: 3, endPage: 5 },
          children: [
            {
              type: "pdfPages",
              props: { bookId: "book-2", startPage: 1, endPage: 1 },
              children: [],
            },
          ],
        },
        { type: "pdfPages", props: { bookId: "", startPage: 1, endPage: 2 } },
        { type: "pdfPages", props: { bookId: "b", startPage: 4, endPage: 2 } },
      ]),
    ).toEqual([
      { bookId: "book-1", startPage: 3, endPage: 5 },
      { bookId: "book-2", startPage: 1, endPage: 1 },
    ]);
  });
});

describe("clampPdfPageRange", () => {
  test("keeps ranges inside the book and the block limit", () => {
    expect(clampPdfPageRange(0, 4, 10)).toEqual({ startPage: 1, endPage: 4 });
    expect(clampPdfPageRange(8, 3, 10)).toEqual({ startPage: 8, endPage: 8 });
    expect(clampPdfPageRange(1, 500, 400)).toEqual({
      startPage: 1,
      endPage: MAX_PDF_BLOCK_PAGES,
    });
  });
});

describe("page labels", () => {
  test("uses printed page numbers and falls back for front matter", () => {
    expect(formatPdfPageRange(10, 17, 8)).toBe("Hal. 2–9");
    expect(formatPdfPageRange(3, 3, 8)).toBe("Hal. iii");
    expect(formatPdfPageRange(1, 2, 2)).toBe("Hal. i–ii");
    expect(formatPdfPageRange(2, 4, 2)).toBe("Hal. ii–2");
  });

  test("validates ranges", () => {
    expect(pdfPageRangeError(1, 5, 10)).toBeNull();
    expect(pdfPageRangeError(5, 4, 10)).not.toBeNull();
    expect(pdfPageRangeError(1, 11, 10)).not.toBeNull();
    expect(pdfPageRangeError(1, MAX_PDF_BLOCK_PAGES + 1, 100)).not.toBeNull();
  });
});

describe("parseTableOfContents", () => {
  test("parses explicit ranges and applies the page offset", () => {
    const entries = parseTableOfContents(
      "Bab 1 Salam — 1-12\nBab 2 Keluarga: 13–20",
      { pageCount: 60, pageOffset: 4 },
    );
    expect(
      entries.map(({ title, startPage, endPage, error }) => ({
        title,
        startPage,
        endPage,
        error,
      })),
    ).toEqual([
      { title: "Bab 1 Salam", startPage: 5, endPage: 16, error: null },
      { title: "Bab 2 Keluarga", startPage: 17, endPage: 24, error: null },
    ]);
  });

  test("derives section ends from the next start page", () => {
    const entries = parseTableOfContents(
      "Pelajaran 1 ........ 1\nPelajaran 2 ........ 9\n\nPelajaran 3 ... 15",
      { pageCount: 20, pageOffset: 0 },
    );
    expect(
      entries.map(({ startPage, endPage }) => [startPage, endPage]),
    ).toEqual([
      [1, 8],
      [9, 14],
      [15, 20],
    ]);
  });

  test("flags ranges outside the book", () => {
    const [entry] = parseTableOfContents("Bab 9 50-60", {
      pageCount: 40,
      pageOffset: 0,
    });
    expect(entry?.error).not.toBeNull();
  });

  test("ignores lines without page numbers", () => {
    expect(
      parseTableOfContents("Daftar Isi\nBab 1 Halo 1-3", {
        pageCount: 10,
        pageOffset: 0,
      }),
    ).toHaveLength(1);
  });
});

describe("analyzeTableOfContents with imperfect input", () => {
  const read = (text: string, pageOffset = 0) =>
    analyzeTableOfContents(text, { pageCount: 40, pageOffset });

  test("treats an em dash as a separator, not a range", () => {
    const { entries } = read("Bab 1 — 5\nBab 2 — 12");
    expect(
      entries.map(({ title, startPage, endPage }) => [
        title,
        startPage,
        endPage,
      ]),
    ).toEqual([
      ["Bab 1", 5, 11],
      ["Bab 2", 12, 40],
    ]);
  });

  test("keeps the chapter number in the title for 'Bab 1 - 20'", () => {
    const { entries } = read("Bab 1 - 20");
    expect(entries[0]).toMatchObject({ title: "Bab 1", startPage: 20 });
  });

  test("strips page words from titles", () => {
    const { entries } = read("Bab 1 Salam hal. 1\nBab 2 Keluarga halaman 5");
    expect(entries.map(({ title }) => title)).toEqual([
      "Bab 1 Salam",
      "Bab 2 Keluarga",
    ]);
  });

  test("explains every skipped line", () => {
    const { entries, skipped } = read(
      "Daftar Isi\nKata pengantar ... iv\n12 Bab 1 Salam\nUnit 3\nBab 2 Keluarga 5",
    );
    expect(entries).toHaveLength(1);
    expect(skipped.map(({ line }) => line)).toEqual([1, 2, 3, 4]);
    expect(skipped.every(({ reason }) => reason.length > 0)).toBe(true);
  });

  test("folds sub-sections into their chapter", () => {
    const { entries, skipped } = read(
      "Bab 1 Salam 1\n1.1 Perkenalan 2\n1.2 Latihan 3\nBab 2 Keluarga 5",
    );
    expect(
      entries.map(({ startPage, endPage }) => [startPage, endPage]),
    ).toEqual([
      [1, 4],
      [5, 40],
    ]);
    expect(skipped).toHaveLength(2);
  });

  test("warns about overlapping and out-of-order chapters", () => {
    const overlap = read("Bab 1 — 1-8\nBab 2 — 5-10").entries;
    expect(overlap[1]?.warnings.length).toBeGreaterThan(0);
    const order = read("Bab 1 — 20\nBab 2 — 5").entries;
    expect(order[1]?.warnings.length).toBeGreaterThan(0);
  });

  test("allows long chapters but rejects pages outside the book", () => {
    const { entries } = read("Bab 1 — 1-35\nBab 2 — 50-60");
    expect(entries[0]?.error).toBeNull();
    expect(entries[1]?.error).not.toBeNull();
  });
});

describe("detectPageOffset", () => {
  test("finds printed page 1 from page-number footers", () => {
    const pages = Array.from({ length: 12 }, (_, index) => {
      const pageNumber = index + 1;
      const printed = pageNumber - 3;
      return {
        pageNumber,
        text: printed >= 1 ? `Judul\nIsi halaman\n${printed}` : "Sampul",
      };
    });
    expect(detectPageOffset(pages)).toBe(3);
  });

  test("returns null without printed numbers", () => {
    expect(
      detectPageOffset([
        { pageNumber: 1, text: "Sampul" },
        { pageNumber: 2, text: null },
      ]),
    ).toBeNull();
  });
});
