import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  detectPageOffset,
  MAX_PDF_BOOK_PAGES,
  MAX_PDF_PAGE_IMAGE_BYTES,
  MAX_PDF_PAGE_TEXT_LENGTH,
  PDF_PAGE_UPLOAD_BATCH_SIZE,
  PDF_PAGES_BLOCK_TYPE,
  pdfPageRangeError,
} from "@hakgyo/shared";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { Prisma } from "../../../../generated/prisma/client";
import { hasImageSignature } from "~/lib/image-signature";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  requireContentAuthor,
  requireCoursePermission,
  requireOrganizationPermission,
} from "~/server/authorization";
import { chunk, createId, settleWithConcurrency } from "~/server/batch";
import { db } from "~/server/db";
import { deleteR2Objects, r2, r2Bucket } from "~/server/r2";

const id = z.string().min(1);
const PAGE_URL_TTL_SECONDS = 60 * 60;
const UPLOAD_URL_TTL_SECONDS = 10 * 60;
const pageImageContentTypes = [
  "image/webp",
  "image/jpeg",
  "image/png",
] as const;
const extensions = {
  "image/webp": ".webp",
  "image/jpeg": ".jpg",
  "image/png": ".png",
} as const;

const imageFile = z.object({
  contentType: z.enum(pageImageContentTypes),
  size: z.number().int().positive().max(MAX_PDF_PAGE_IMAGE_BYTES),
});

const pageKeyPrefix = (
  organizationId: string,
  bookId: string,
  pageNumber: number,
) => `pdf-books/${organizationId}/${bookId}/${pageNumber}-`;

async function signedPageUrl(objectKey: string) {
  return getSignedUrl(
    r2,
    new GetObjectCommand({
      Bucket: r2Bucket,
      Key: objectKey,
      ResponseContentDisposition: "inline",
    }),
    { expiresIn: PAGE_URL_TTL_SECONDS },
  );
}

async function removeObjects(keys: string[]) {
  await deleteR2Objects(keys, "Failed to remove PDF book object");
}

// Parallel R2 round trips while confirming an upload batch.
const UPLOAD_CHECK_CONCURRENCY = 8;
// Rows per createMany statement when importing a whole book.
const IMPORT_INSERT_BATCH_SIZE = 1000;

async function assertUploadedImage(
  key: string,
  size: number,
  contentType: string,
) {
  let head;
  try {
    head = await r2.send(new HeadObjectCommand({ Bucket: r2Bucket, Key: key }));
  } catch (cause) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Gambar halaman belum terunggah.",
      cause,
    });
  }
  if (head.ContentLength !== size || head.ContentType !== contentType) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Gambar halaman tidak sesuai dengan permintaan unggah.",
    });
  }
  const header = await r2.send(
    new GetObjectCommand({ Bucket: r2Bucket, Key: key, Range: "bytes=0-15" }),
  );
  const bytes = await header.Body?.transformToByteArray();
  if (!bytes || !hasImageSignature(bytes, contentType)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "File halaman bukan gambar yang valid.",
    });
  }
  return head.ETag ?? null;
}

async function requireBook(
  organizationId: string,
  bookId: string,
  userId: string,
  action?: "edit" | "delete",
) {
  const book = await db.pdfBook.findFirst({
    where: { id: bookId, organizationId },
  });
  if (!book) throw new TRPCError({ code: "NOT_FOUND" });
  const member = await requireContentAuthor({
    organizationId,
    userId,
    ...(action
      ? { createdByMembershipId: book.createdByMembershipId, action }
      : {}),
  });
  return { book, member };
}

export const pdfBookRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ organizationId: id }))
    .query(async ({ ctx, input }) => {
      await requireContentAuthor({
        organizationId: input.organizationId,
        userId: ctx.actorUserId,
      });
      const books = await db.pdfBook.findMany({
        where: { organizationId: input.organizationId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          fileName: true,
          pageCount: true,
          pageOffset: true,
          status: true,
          createdAt: true,
          createdBy: { select: { userId: true } },
          _count: { select: { pages: true } },
          pages: {
            orderBy: { pageNumber: "asc" },
            take: 1,
            select: { thumbnailAsset: { select: { objectKey: true } } },
          },
        },
      });
      return Promise.all(
        books.map(async ({ _count, pages, createdBy, ...book }) => ({
          ...book,
          uploadedPages: _count.pages,
          isOwnUpload: createdBy.userId === ctx.actorUserId,
          coverUrl: pages[0]
            ? await signedPageUrl(pages[0].thumbnailAsset.objectKey)
            : null,
        })),
      );
    }),

  get: protectedProcedure
    .input(z.object({ organizationId: id, bookId: id }))
    .query(async ({ ctx, input }) => {
      const { book } = await requireBook(
        input.organizationId,
        input.bookId,
        ctx.actorUserId,
      );
      const pages = await db.pdfBookPage.findMany({
        where: { bookId: book.id },
        orderBy: { pageNumber: "asc" },
        select: {
          pageNumber: true,
          assetId: true,
          width: true,
          height: true,
          thumbnailAsset: { select: { objectKey: true } },
        },
      });
      // Printed page numbers in the text layer tell us where page 1 is.
      const sampleTexts = await db.pdfBookPage.findMany({
        where: { bookId: book.id, pageNumber: { lte: 80 } },
        select: { pageNumber: true, text: true },
      });
      return {
        ...book,
        suggestedPageOffset: detectPageOffset(sampleTexts),
        pages: await Promise.all(
          pages.map(async ({ thumbnailAsset, ...page }) => ({
            ...page,
            thumbnailUrl: await signedPageUrl(thumbnailAsset.objectKey),
          })),
        ),
      };
    }),

  /** Text of the book's own contents page(s), to prefill the paste box. */
  findTableOfContents: protectedProcedure
    .input(z.object({ organizationId: id, bookId: id }))
    .query(async ({ ctx, input }) => {
      const { book } = await requireBook(
        input.organizationId,
        input.bookId,
        ctx.actorUserId,
      );
      const pages = await db.pdfBookPage.findMany({
        where: {
          bookId: book.id,
          pageNumber: { lte: 30 },
          text: { not: null },
        },
        orderBy: { pageNumber: "asc" },
        select: { pageNumber: true, text: true },
      });
      const heading =
        /daftar\s+isi|table\s+of\s+contents|^\s*contents\b|목\s*차|차\s*례/im;
      const first = pages.findIndex((page) => heading.test(page.text ?? ""));
      if (first === -1) return { text: null, pageNumbers: [] };
      // Contents often continue on the next page without repeating the title.
      // Follow such pages only while they sit in the front matter (before
      // printed page 1) and read like contents lines ("Bab 2 ...... 13").
      const contentsLine = /(?:\.{2,}|…|\t|\s—\s|\s{3,})\s*\d{1,4}\s*$/;
      const picked = [pages[first]!];
      for (const page of pages.slice(first + 1, first + 4)) {
        if (page.pageNumber !== picked.at(-1)!.pageNumber + 1) break;
        if (book.pageOffset > 0 && page.pageNumber > book.pageOffset) break;
        const lines = (page.text ?? "")
          .split("\n")
          .filter((line) => line.trim());
        const listed = lines.filter((line) => contentsLine.test(line)).length;
        if (listed < 3 || listed / lines.length < 0.5) break;
        picked.push(page);
      }
      return {
        text: picked.map((page) => page.text).join("\n"),
        pageNumbers: picked.map((page) => page.pageNumber),
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        organizationId: id,
        title: z.string().trim().min(1).max(200),
        fileName: z.string().trim().min(1).max(255),
        pageCount: z.number().int().positive().max(MAX_PDF_BOOK_PAGES),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const member = await requireOrganizationPermission({
        organizationId: input.organizationId,
        permission: "asset.create",
        userId: ctx.actorUserId,
      });
      return db.pdfBook.create({
        data: { ...input, createdByMembershipId: member.id },
        select: { id: true, pageCount: true },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        organizationId: id,
        bookId: id,
        title: z.string().trim().min(1).max(200).optional(),
        pageOffset: z.number().int().min(0).max(MAX_PDF_BOOK_PAGES).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { book } = await requireBook(
        input.organizationId,
        input.bookId,
        ctx.actorUserId,
        "edit",
      );
      if (
        input.pageOffset !== undefined &&
        input.pageOffset >= book.pageCount
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Offset halaman harus lebih kecil dari jumlah halaman.",
        });
      }
      return db.pdfBook.update({
        where: { id: book.id },
        data: { title: input.title, pageOffset: input.pageOffset },
        select: { id: true, title: true, pageOffset: true },
      });
    }),

  prepareUploads: protectedProcedure
    .input(
      z.object({
        organizationId: id,
        bookId: id,
        pages: z
          .array(
            z.object({
              pageNumber: z.number().int().positive(),
              image: imageFile,
              thumbnail: imageFile,
            }),
          )
          .min(1)
          .max(PDF_PAGE_UPLOAD_BATCH_SIZE),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { book } = await requireBook(
        input.organizationId,
        input.bookId,
        ctx.actorUserId,
        "edit",
      );
      if (book.status !== "PROCESSING") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Buku ini sudah selesai diproses.",
        });
      }
      if (input.pages.some(({ pageNumber }) => pageNumber > book.pageCount)) {
        throw new TRPCError({ code: "BAD_REQUEST" });
      }

      const assets: Prisma.AssetCreateManyInput[] = [];
      const prepare = async (
        pageNumber: number,
        kind: "page" | "thumb",
        file: z.infer<typeof imageFile>,
      ) => {
        const objectKey = `${pageKeyPrefix(book.organizationId, book.id, pageNumber)}${kind}-${crypto.randomUUID()}${extensions[file.contentType]}`;
        const assetId = createId();
        assets.push({
          id: assetId,
          organizationId: book.organizationId,
          uploadedByUserId: ctx.actorUserId,
          objectKey,
          fileName: `${book.fileName} · ${pageNumber}${kind === "thumb" ? " (thumbnail)" : ""}${extensions[file.contentType]}`,
          contentType: file.contentType,
          size: file.size,
        });
        const uploadUrl = await getSignedUrl(
          r2,
          new PutObjectCommand({
            Bucket: r2Bucket,
            Key: objectKey,
            ContentType: file.contentType,
          }),
          { expiresIn: UPLOAD_URL_TTL_SECONDS },
        );
        return {
          assetId,
          uploadUrl,
          // Only Content-Type: the bucket CORS policy allows no other headers.
          headers: { "Content-Type": file.contentType },
        };
      };

      const prepared = await Promise.all(
        input.pages.map(async (page) => ({
          pageNumber: page.pageNumber,
          image: await prepare(page.pageNumber, "page", page.image),
          thumbnail: await prepare(page.pageNumber, "thumb", page.thumbnail),
        })),
      );
      await db.asset.createMany({ data: assets });
      return prepared;
    }),

  confirmUploads: protectedProcedure
    .input(
      z.object({
        organizationId: id,
        bookId: id,
        pages: z
          .array(
            z.object({
              pageNumber: z.number().int().positive(),
              assetId: id,
              thumbnailAssetId: id,
              width: z.number().int().positive().max(20_000),
              height: z.number().int().positive().max(20_000),
              text: z
                .string()
                .max(MAX_PDF_PAGE_TEXT_LENGTH * 2)
                .nullable(),
            }),
          )
          .min(1)
          .max(PDF_PAGE_UPLOAD_BATCH_SIZE),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { book } = await requireBook(
        input.organizationId,
        input.bookId,
        ctx.actorUserId,
        "edit",
      );
      if (book.status !== "PROCESSING") {
        throw new TRPCError({ code: "PRECONDITION_FAILED" });
      }
      const assetIds = input.pages.flatMap((page) => [
        page.assetId,
        page.thumbnailAssetId,
      ]);
      const assets = new Map(
        (
          await db.asset.findMany({
            where: {
              id: { in: assetIds },
              organizationId: book.organizationId,
              uploadedByUserId: ctx.actorUserId,
              deletedAt: null,
            },
            select: {
              id: true,
              objectKey: true,
              size: true,
              contentType: true,
            },
          })
        ).map((asset) => [asset.id, asset]),
      );

      // Checks run concurrently, but results are applied as if the pages were
      // confirmed one by one: everything before the first failing file is
      // saved (a page needs both of its files) and that failure is rethrown.
      const files = input.pages.flatMap((page) => {
        const prefix = pageKeyPrefix(
          book.organizationId,
          book.id,
          page.pageNumber,
        );
        return [page.assetId, page.thumbnailAssetId].map((assetId) => ({
          assetId,
          prefix,
        }));
      });
      const checks = await settleWithConcurrency(
        files,
        UPLOAD_CHECK_CONCURRENCY,
        async ({ assetId, prefix }) => {
          const asset = assets.get(assetId);
          if (!asset?.objectKey.startsWith(prefix)) {
            throw new TRPCError({ code: "BAD_REQUEST" });
          }
          return assertUploadedImage(
            asset.objectKey,
            asset.size,
            asset.contentType,
          );
        },
      );
      const failedIndex = checks.findIndex(
        (check) => check.status === "rejected",
      );
      const confirmedCount = failedIndex === -1 ? files.length : failedIndex;

      const confirmed = files
        .slice(0, confirmedCount)
        .map(({ assetId }, index) => ({
          assetId,
          etag: (checks[index] as PromiseFulfilledResult<string | null>).value,
        }));
      if (confirmed.length) {
        const confirmedAt = new Date().toISOString();
        await db.$executeRaw`
          UPDATE "Asset" AS asset
          SET
            "confirmedAt" = ${confirmedAt}::timestamp,
            "etag" = confirmed.etag,
            "updatedAt" = ${confirmedAt}::timestamp
          FROM (VALUES ${Prisma.join(
            confirmed.map(
              ({ assetId, etag }) => Prisma.sql`(${assetId}, ${etag}::text)`,
            ),
          )}) AS confirmed(id, etag)
          WHERE asset."id" = confirmed.id
        `;
      }

      const savedPages = input.pages.slice(0, Math.floor(confirmedCount / 2));
      if (savedPages.length) {
        // Existing pages are left untouched, like an upsert with no update.
        await db.pdfBookPage.createMany({
          data: savedPages.map((page) => ({
            bookId: book.id,
            organizationId: book.organizationId,
            pageNumber: page.pageNumber,
            assetId: page.assetId,
            thumbnailAssetId: page.thumbnailAssetId,
            width: page.width,
            height: page.height,
            text: page.text?.trim()
              ? page.text.slice(0, MAX_PDF_PAGE_TEXT_LENGTH)
              : null,
          })),
          skipDuplicates: true,
        });
      }
      if (failedIndex !== -1) {
        throw (checks[failedIndex] as PromiseRejectedResult).reason;
      }

      const uploadedPages = await db.pdfBookPage.count({
        where: { bookId: book.id },
      });
      const status = uploadedPages >= book.pageCount ? "READY" : "PROCESSING";
      if (status === "READY") {
        await db.pdfBook.update({
          where: { id: book.id },
          data: { status },
        });
      }
      return { uploadedPages, status };
    }),

  delete: protectedProcedure
    .input(z.object({ organizationId: id, bookId: id }))
    .mutation(async ({ ctx, input }) => {
      const { book } = await requireBook(
        input.organizationId,
        input.bookId,
        ctx.actorUserId,
        "delete",
      );
      const usedBy = await db.material.findMany({
        where: {
          organizationId: book.organizationId,
          assets: { some: { asset: { pdfBookPage: { bookId: book.id } } } },
        },
        select: { title: true },
        take: 5,
      });
      if (usedBy.length) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Buku masih dipakai oleh materi: ${usedBy
            .map(({ title }) => `“${title}”`)
            .join(
              ", ",
            )}. Hapus halaman PDF dari materi tersebut terlebih dahulu.`,
        });
      }

      const assets = await db.asset.findMany({
        where: {
          organizationId: book.organizationId,
          objectKey: {
            startsWith: `pdf-books/${book.organizationId}/${book.id}/`,
          },
        },
        select: { id: true, objectKey: true },
      });
      await db.$transaction([
        db.pdfBook.delete({ where: { id: book.id } }),
        db.asset.deleteMany({
          where: { id: { in: assets.map((asset) => asset.id) } },
        }),
      ]);
      await removeObjects(assets.map((asset) => asset.objectKey));
      return { deleted: true };
    }),

  importToCourse: protectedProcedure
    .input(
      z.object({
        courseId: id,
        bookId: id,
        modules: z
          .array(
            z.object({
              moduleId: id.optional(),
              title: z.string().trim().min(1).max(200),
              lessons: z
                .array(
                  z.object({
                    title: z.string().trim().min(1).max(200),
                    startPage: z.number().int().positive(),
                    endPage: z.number().int().positive(),
                  }),
                )
                .min(1)
                .max(100),
            }),
          )
          .min(1)
          .max(100),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const course = await requireCoursePermission({
        courseId: input.courseId,
        permission: "content.manage",
        userId: ctx.actorUserId,
      });
      const member = await requireContentAuthor({
        organizationId: course.organizationId,
        userId: ctx.actorUserId,
      });
      const book = await db.pdfBook.findFirst({
        where: {
          id: input.bookId,
          organizationId: course.organizationId,
          status: "READY",
        },
        select: { id: true, pageCount: true },
      });
      if (!book) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Buku PDF belum siap dipakai.",
        });
      }
      for (const lesson of input.modules.flatMap(({ lessons }) => lessons)) {
        const error = pdfPageRangeError(
          lesson.startPage,
          lesson.endPage,
          book.pageCount,
        );
        if (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `“${lesson.title}”: ${error}`,
          });
        }
      }
      const existingModuleIds = input.modules.flatMap(({ moduleId }) =>
        moduleId ? [moduleId] : [],
      );
      if (existingModuleIds.length) {
        const found = await db.courseModule.count({
          where: { id: { in: existingModuleIds }, courseId: course.id },
        });
        if (found !== new Set(existingModuleIds).size) {
          throw new TRPCError({ code: "BAD_REQUEST" });
        }
      }

      return db.$transaction(
        async (tx) => {
          const [lastModule, lastItems, bookPages] = await Promise.all([
            tx.courseModule.aggregate({
              where: { courseId: course.id },
              _max: { position: true },
            }),
            existingModuleIds.length
              ? tx.courseItem.groupBy({
                  by: ["moduleId"],
                  where: { moduleId: { in: existingModuleIds } },
                  _max: { position: true },
                })
              : [],
            // Every lesson links the page images it shows (see
            // syncMaterialPdfPageAssets), so load the book's pages once.
            tx.pdfBookPage.findMany({
              where: {
                bookId: book.id,
                organizationId: course.organizationId,
                book: { status: "READY" },
              },
              select: { pageNumber: true, assetId: true },
            }),
          ]);
          let nextModulePosition = (lastModule._max.position ?? -1) + 1;
          const nextItemPositions = new Map(
            lastItems.map((item) => [
              item.moduleId,
              (item._max.position ?? -1) + 1,
            ]),
          );

          const modules: Prisma.CourseModuleCreateManyInput[] = [];
          const materials: Prisma.MaterialCreateManyInput[] = [];
          const materialAssets: Prisma.MaterialAssetCreateManyInput[] = [];
          const items: Prisma.CourseItemCreateManyInput[] = [];

          for (const entry of input.modules) {
            let moduleId = entry.moduleId;
            if (!moduleId) {
              moduleId = createId();
              modules.push({
                id: moduleId,
                courseId: course.id,
                organizationId: course.organizationId,
                title: entry.title,
                position: nextModulePosition++,
              });
            }
            let nextItemPosition = nextItemPositions.get(moduleId) ?? 0;

            for (const lesson of entry.lessons) {
              const content = [
                {
                  type: PDF_PAGES_BLOCK_TYPE,
                  props: {
                    bookId: book.id,
                    startPage: lesson.startPage,
                    endPage: lesson.endPage,
                  },
                  children: [],
                },
                // A text line after the pages so authors can type "/" to add
                // vocabulary, quiz, or note blocks below the book pages.
                { type: "paragraph", content: [], children: [] },
              ];
              const materialId = createId();
              materials.push({
                id: materialId,
                organizationId: course.organizationId,
                createdByMembershipId: member.id,
                title: lesson.title,
                content,
              });
              for (const page of bookPages) {
                if (
                  page.pageNumber >= lesson.startPage &&
                  page.pageNumber <= lesson.endPage
                ) {
                  materialAssets.push({
                    materialId,
                    assetId: page.assetId,
                    organizationId: course.organizationId,
                  });
                }
              }
              items.push({
                moduleId,
                organizationId: course.organizationId,
                type: "MATERIAL",
                materialId,
                isPublished: false,
                position: nextItemPosition++,
              });
            }
            nextItemPositions.set(moduleId, nextItemPosition);
          }

          for (const data of chunk(modules, IMPORT_INSERT_BATCH_SIZE)) {
            await tx.courseModule.createMany({ data });
          }
          for (const data of chunk(materials, IMPORT_INSERT_BATCH_SIZE)) {
            await tx.material.createMany({ data });
          }
          for (const data of chunk(materialAssets, IMPORT_INSERT_BATCH_SIZE)) {
            await tx.materialAsset.createMany({ data, skipDuplicates: true });
          }
          for (const data of chunk(items, IMPORT_INSERT_BATCH_SIZE)) {
            await tx.courseItem.createMany({ data });
          }
          return { lessonCount: items.length, createdModules: modules.length };
        },
        { timeout: 60_000 },
      );
    }),
});
