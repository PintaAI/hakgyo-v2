import {
  clampPdfPageRange,
  collectPdfPageRanges,
  PDF_PAGES_BLOCK_TYPE,
  readPdfPageRange,
  type PdfBookResource,
} from "@hakgyo/shared";

import type { Prisma } from "../../../generated/prisma/client";

type DatabaseClient = Prisma.TransactionClient | Prisma.DefaultPrismaClient;
type JsonBlock = Record<string, unknown>;

function isRecord(value: unknown): value is JsonBlock {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function findReadyBooks(
  db: DatabaseClient,
  organizationId: string,
  bookIds: string[],
) {
  if (!bookIds.length) return new Map<string, number>();
  const books = await db.pdfBook.findMany({
    where: { id: { in: bookIds }, organizationId, status: "READY" },
    select: { id: true, pageCount: true },
  });
  return new Map(books.map((book) => [book.id, book.pageCount]));
}

/**
 * Drops pdfPages blocks that point at books outside the organization and
 * clamps ranges to the book, so stored content always resolves to real pages.
 * Blocks without a book yet are kept so authors can finish choosing pages.
 */
export async function sanitizePdfPageBlocks(
  db: DatabaseClient,
  organizationId: string,
  document: JsonBlock[],
): Promise<JsonBlock[]> {
  const ranges = collectPdfPageRanges(document);
  if (!ranges.length) return document;
  const books = await findReadyBooks(db, organizationId, [
    ...new Set(ranges.map(({ bookId }) => bookId)),
  ]);

  const clean = (block: JsonBlock): JsonBlock | null => {
    let next = block;
    if (block.type === PDF_PAGES_BLOCK_TYPE) {
      const range = readPdfPageRange(block);
      if (range) {
        const pageCount = books.get(range.bookId);
        if (!pageCount) return null;
        next = {
          ...block,
          props: {
            ...(block.props as JsonBlock),
            ...clampPdfPageRange(range.startPage, range.endPage, pageCount),
          },
        };
      }
    }
    if (!Array.isArray(next.children)) return next;
    return {
      ...next,
      children: next.children
        .filter(isRecord)
        .map(clean)
        .filter((child): child is JsonBlock => child !== null),
    };
  };

  return document
    .map(clean)
    .filter((block): block is JsonBlock => block !== null);
}

function pageFilter(content: unknown) {
  const ranges = collectPdfPageRanges(content);
  if (!ranges.length) return null;
  return ranges.map(({ bookId, startPage, endPage }) => ({
    bookId,
    pageNumber: { gte: startPage, lte: endPage },
  }));
}

/**
 * Learner access to stored files flows through MaterialAsset, so every page
 * image a lesson shows is linked to the material (and synced for offline use).
 */
export async function syncMaterialPdfPageAssets(
  db: DatabaseClient,
  input: { materialId: string; organizationId: string; content: unknown },
) {
  const filter = pageFilter(input.content);
  const pages = filter
    ? await db.pdfBookPage.findMany({
        where: {
          organizationId: input.organizationId,
          book: { status: "READY" },
          OR: filter,
        },
        select: { assetId: true },
      })
    : [];
  const wanted = pages.map(({ assetId }) => assetId);

  await db.materialAsset.deleteMany({
    where: {
      materialId: input.materialId,
      asset: { pdfBookPage: { isNot: null } },
      ...(wanted.length ? { assetId: { notIn: wanted } } : {}),
    },
  });
  if (wanted.length) {
    await db.materialAsset.createMany({
      data: wanted.map((assetId) => ({
        materialId: input.materialId,
        assetId,
        organizationId: input.organizationId,
      })),
      skipDuplicates: true,
    });
  }
}

export async function getLearnerPdfBooks(
  db: DatabaseClient,
  input: { organizationId: string; content: unknown },
): Promise<PdfBookResource[]> {
  const [books] = await getLearnerPdfBooksForSources(db, [input]);
  return books!;
}

/**
 * `getLearnerPdfBooks` for several materials in one query (none when no material embeds pages).
 * Results are in `sources` order.
 */
export async function getLearnerPdfBooksForSources(
  db: DatabaseClient,
  sources: readonly { organizationId: string; content: unknown }[],
): Promise<PdfBookResource[][]> {
  const rangesBySource = sources.map((source) =>
    collectPdfPageRanges(source.content),
  );
  const filter = sources.flatMap((source, index) =>
    rangesBySource[index]!.map(({ bookId, startPage, endPage }) => ({
      organizationId: source.organizationId,
      bookId,
      pageNumber: { gte: startPage, lte: endPage },
    })),
  );
  if (!filter.length) return sources.map(() => []);
  const pages = await db.pdfBookPage.findMany({
    where: {
      book: { status: "READY" },
      asset: { confirmedAt: { not: null }, deletedAt: null },
      OR: filter,
    },
    orderBy: [{ bookId: "asc" }, { pageNumber: "asc" }],
    select: {
      organizationId: true,
      pageNumber: true,
      assetId: true,
      width: true,
      height: true,
      book: { select: { id: true, title: true, pageOffset: true } },
    },
  });

  return sources.map((source, index) => {
    const ranges = rangesBySource[index]!;
    const books = new Map<string, PdfBookResource>();
    for (const { book, organizationId, ...page } of pages) {
      if (
        organizationId !== source.organizationId ||
        !ranges.some(
          (range) =>
            range.bookId === book.id &&
            page.pageNumber >= range.startPage &&
            page.pageNumber <= range.endPage,
        )
      ) {
        continue;
      }
      const resource = books.get(book.id) ?? { ...book, pages: [] };
      resource.pages.push(page);
      books.set(book.id, resource);
    }
    return [...books.values()];
  });
}
