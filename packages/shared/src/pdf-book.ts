export const PDF_PAGES_BLOCK_TYPE = "pdfPages";
export const MAX_PDF_BOOK_BYTES = 100 * 1024 * 1024;
export const MAX_PDF_BOOK_PAGES = 1000;
export const MAX_PDF_BLOCK_PAGES = 30;
export const MAX_PDF_PAGE_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_PDF_PAGE_TEXT_LENGTH = 20_000;
export const PDF_PAGE_UPLOAD_BATCH_SIZE = 6;

export type PdfPageRange = {
  bookId: string;
  startPage: number;
  endPage: number;
};

/** A page as delivered to learners and editors. Page numbers are PDF page indexes (1-based). */
export type PdfBookPageResource = {
  pageNumber: number;
  assetId: string;
  width: number;
  height: number;
};

export type PdfBookResource = {
  id: string;
  title: string;
  pageOffset: number;
  pages: PdfBookPageResource[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function positiveInteger(value: unknown) {
  const number = typeof value === "string" ? Number(value) : value;
  return typeof number === "number" && Number.isInteger(number) && number > 0
    ? number
    : null;
}

/** Reads a pdfPages block's props. Returns null when the block has no usable range yet. */
export function readPdfPageRange(block: unknown): PdfPageRange | null {
  if (!isRecord(block) || block.type !== PDF_PAGES_BLOCK_TYPE) return null;
  if (!isRecord(block.props)) return null;
  const bookId =
    typeof block.props.bookId === "string" ? block.props.bookId.trim() : "";
  const startPage = positiveInteger(block.props.startPage);
  const endPage = positiveInteger(block.props.endPage);
  if (!bookId || !startPage || !endPage || endPage < startPage) return null;
  return { bookId, startPage, endPage };
}

export function collectPdfPageRanges(document: unknown): PdfPageRange[] {
  const ranges: PdfPageRange[] = [];
  const visit = (value: unknown) => {
    if (!isRecord(value)) return;
    const range = readPdfPageRange(value);
    if (range) ranges.push(range);
    if (Array.isArray(value.children)) value.children.forEach(visit);
  };
  if (Array.isArray(document)) document.forEach(visit);
  return ranges;
}

/** Clamps a range to the book and to the per-block page limit. */
export function clampPdfPageRange(
  startPage: number,
  endPage: number,
  pageCount: number,
) {
  const start = Math.min(Math.max(1, Math.trunc(startPage)), pageCount);
  const end = Math.min(
    Math.max(start, Math.trunc(endPage)),
    pageCount,
    start + MAX_PDF_BLOCK_PAGES - 1,
  );
  return { startPage: start, endPage: end };
}

/**
 * Printed page numbers rarely match PDF indexes because of covers and front
 * matter. `pageOffset` is the number of PDF pages before printed page 1.
 */
export function bookPageToPdfPage(bookPage: number, pageOffset: number) {
  return bookPage + pageOffset;
}

export function pdfPageToBookPage(pdfPage: number, pageOffset: number) {
  return pdfPage - pageOffset;
}

function toRoman(value: number) {
  const numerals: Array<[number, string]> = [
    [1000, "m"],
    [900, "cm"],
    [500, "d"],
    [400, "cd"],
    [100, "c"],
    [90, "xc"],
    [50, "l"],
    [40, "xl"],
    [10, "x"],
    [9, "ix"],
    [5, "v"],
    [4, "iv"],
    [1, "i"],
  ];
  let rest = value;
  let result = "";
  for (const [amount, numeral] of numerals) {
    while (rest >= amount) {
      result += numeral;
      rest -= amount;
    }
  }
  return result;
}

/**
 * Human label for a PDF page: the printed number, or a Roman numeral for
 * front matter (cover, table of contents) the way printed books number it.
 */
export function formatPdfPageLabel(pdfPage: number, pageOffset: number) {
  const bookPage = pdfPageToBookPage(pdfPage, pageOffset);
  return bookPage >= 1 ? String(bookPage) : toRoman(pdfPage);
}

export function formatPdfPageRange(
  startPage: number,
  endPage: number,
  pageOffset: number,
) {
  const start = formatPdfPageLabel(startPage, pageOffset);
  if (startPage === endPage) return `Hal. ${start}`;
  return `Hal. ${start}–${formatPdfPageLabel(endPage, pageOffset)}`;
}

export function pdfPageRangeError(
  startPage: number,
  endPage: number,
  pageCount: number,
) {
  if (
    !Number.isInteger(startPage) ||
    !Number.isInteger(endPage) ||
    startPage < 1 ||
    endPage < startPage ||
    endPage > pageCount
  ) {
    return "Rentang halaman tidak valid untuk buku ini.";
  }
  if (endPage - startPage + 1 > MAX_PDF_BLOCK_PAGES) {
    return `Maksimal ${MAX_PDF_BLOCK_PAGES} halaman per blok. Bagi menjadi beberapa materi.`;
  }
  return null;
}

export type TableOfContentsEntry = {
  title: string;
  /** PDF page indexes, already shifted by the page offset. */
  startPage: number;
  endPage: number;
  line: number;
  error: string | null;
  /** Non-blocking hints, e.g. overlapping or out-of-order chapters. */
  warnings: string[];
};

export type SkippedTableOfContentsLine = {
  line: number;
  text: string;
  reason: string;
};

// Only a hyphen, en dash, or words form a range. An em dash ("Bab 1 — 20")
// separates the title from the page, as most printed contents pages do.
const trailingRange = /(\d{1,4})\s*(?:-|–|\bto\b|s\/d|sampai)\s*(\d{1,4})\s*$/i;
const trailingNumber = /(\d{1,4})\s*$/;
const trailingSeparators = /[\s.·•:|—–\-_…]+$/;
const trailingPageWord = /(?:^|\s)(?:hal(?:aman)?|hlm|pages?|pp?)\.?$/i;
// A title that is only a chapter word ("Bab", "Unit") means the number we
// found is the chapter number, not a page.
const chapterWordOnly =
  /^(?:bab|unit|pelajaran|chapter|lesson|part|bagian|modul|module|lampiran|topik|tema)$/i;
const subsectionTitle = /^\d+\.\d+/;
const romanPage = /(?:^|[\s.·•:|—–\-_…])[ivxlc]{1,6}\s*$/i;

function cleanTitle(value: string) {
  return value
    .replace(trailingSeparators, "")
    .replace(trailingPageWord, "")
    .replace(trailingSeparators, "")
    .trim();
}

type ParsedLine =
  | { kind: "entry"; title: string; start: number; end: number | null }
  | { kind: "skip"; reason: string };

function parseTocLine(raw: string): ParsedLine {
  const line = raw.replace(trailingSeparators, "").trim();
  const range = trailingRange.exec(line);
  if (range) {
    const title = cleanTitle(line.slice(0, range.index));
    if (chapterWordOnly.test(title)) {
      // "Bab 1 - 20": the first number is the chapter, the second the page.
      return {
        kind: "entry",
        title: `${title} ${range[1]}`,
        start: Number(range[2]),
        end: null,
      };
    }
    return {
      kind: "entry",
      title,
      start: Number(range[1]),
      end: Number(range[2]),
    };
  }
  const single = trailingNumber.exec(line);
  if (single) {
    const title = cleanTitle(line.slice(0, single.index));
    if (/\d\s*,$/.test(line.slice(0, single.index).trim())) {
      return { kind: "skip", reason: "Tulis satu rentang, misalnya 1-3" };
    }
    if (!title || chapterWordOnly.test(title)) {
      return { kind: "skip", reason: "Tidak ada nomor halaman di akhir baris" };
    }
    return { kind: "entry", title, start: Number(single[1]), end: null };
  }
  if (romanPage.test(line)) {
    return { kind: "skip", reason: "Halaman romawi (bagian pembuka) dilewati" };
  }
  if (/^\d/.test(line)) {
    return { kind: "skip", reason: "Nomor halaman harus di akhir baris" };
  }
  return { kind: "skip", reason: "Tidak ada nomor halaman" };
}

/**
 * Reads pasted table-of-contents text such as "Bab 1 Salam — 1-12".
 * Numbers are printed page numbers; a single number starts a section that
 * ends right before the next section begins (or at the end of the book).
 * Lines it cannot use are returned with a reason instead of being dropped.
 */
export function analyzeTableOfContents(
  text: string,
  options: { pageCount: number; pageOffset: number; skipSubsections?: boolean },
): { entries: TableOfContentsEntry[]; skipped: SkippedTableOfContentsLine[] } {
  const skipSubsections = options.skipSubsections ?? true;
  const rows: Array<{
    title: string;
    start: number;
    end: number | null;
    line: number;
  }> = [];
  const skipped: SkippedTableOfContentsLine[] = [];

  text.split(/\r?\n/).forEach((raw, index) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const parsed = parseTocLine(trimmed);
    if (parsed.kind === "skip") {
      skipped.push({ line: index + 1, text: trimmed, reason: parsed.reason });
    } else if (skipSubsections && subsectionTitle.test(parsed.title)) {
      skipped.push({
        line: index + 1,
        text: trimmed,
        reason: "Sub-bab digabung ke bab di atasnya",
      });
    } else {
      rows.push({
        ...parsed,
        title: parsed.title.slice(0, 200),
        line: index + 1,
      });
    }
  });

  const lastBookPage = options.pageCount - options.pageOffset;
  const titleCounts = new Map<string, number>();
  rows.forEach(({ title }) =>
    titleCounts.set(
      title.toLowerCase(),
      (titleCounts.get(title.toLowerCase()) ?? 0) + 1,
    ),
  );

  const entries = rows.map((row, index) => {
    const next = rows[index + 1];
    const previous = rows[index - 1];
    const bookEnd =
      row.end ?? (next ? Math.max(row.start, next.start - 1) : lastBookPage);
    const startPage = bookPageToPdfPage(row.start, options.pageOffset);
    const endPage = bookPageToPdfPage(bookEnd, options.pageOffset);
    const warnings: string[] = [];
    if (previous && row.start < previous.start) {
      warnings.push("Halamannya lebih kecil dari bab sebelumnya");
    } else if (previous && row.start <= (previous.end ?? row.start - 1)) {
      warnings.push("Bertumpuk dengan halaman bab sebelumnya");
    }
    if (bookEnd === row.start && rows.length > 2 && row.end === null) {
      warnings.push("Hanya 1 halaman — pastikan ini memang satu bab");
    }
    if ((titleCounts.get(row.title.toLowerCase()) ?? 0) > 1) {
      warnings.push("Judul sama dengan bab lain");
    }
    return {
      title: row.title,
      startPage,
      endPage,
      line: row.line,
      // Long chapters are split into several lessons, so only ranges that
      // fall outside the book are errors.
      error:
        startPage < 1 || endPage > options.pageCount || endPage < startPage
          ? "Di luar jumlah halaman buku"
          : null,
      warnings,
    };
  });
  return { entries, skipped };
}

export function parseTableOfContents(
  text: string,
  options: { pageCount: number; pageOffset: number },
): TableOfContentsEntry[] {
  return analyzeTableOfContents(text, options).entries;
}

/**
 * Guesses how many PDF pages come before printed page 1 by matching the page
 * numbers printed in each page's text layer. Returns null when unsure.
 */
export function detectPageOffset(
  pages: Array<{ pageNumber: number; text: string | null }>,
) {
  const printed = new Map<number, Set<number>>();
  for (const page of pages) {
    const lines = (page.text ?? "")
      .split(/\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const edges = [...lines.slice(0, 2), ...lines.slice(-2)];
    const numbers = new Set<number>();
    for (const line of edges) {
      const match = /^[-–—\s]*(\d{1,4})[-–—\s]*$/.exec(line);
      if (match) numbers.add(Number(match[1]));
    }
    if (numbers.size) printed.set(page.pageNumber, numbers);
  }
  if (printed.size < 3) return null;

  let best = { offset: 0, score: 0 };
  const maxOffset = Math.min(
    60,
    Math.max(...pages.map((p) => p.pageNumber)) - 1,
  );
  for (let offset = 0; offset <= maxOffset; offset += 1) {
    let score = 0;
    for (const [pageNumber, numbers] of printed) {
      if (numbers.has(pageNumber - offset)) score += 1;
    }
    if (score > best.score) best = { offset, score };
  }
  return best.score >= 3 && best.score >= printed.size * 0.4
    ? best.offset
    : null;
}
