"use client";

import { useEffect, useRef, useState } from "react";
import {
  MAX_PDF_BOOK_BYTES,
  MAX_PDF_BOOK_PAGES,
  PDF_PAGE_UPLOAD_BATCH_SIZE,
} from "@hakgyo/shared";
import type { PDFDocumentProxy } from "pdfjs-dist";

import {
  openPdfFile,
  renderPdfPage,
  type RenderedPdfPage,
} from "~/lib/pdf-book/render";
import { api } from "~/trpc/react";

export type PdfBookUploadState =
  | { phase: "idle" }
  | { phase: "reading"; fileName: string }
  | {
      phase: "uploading" | "done";
      bookId: string;
      fileName: string;
      pageCount: number;
      uploadedPages: number;
    }
  | { phase: "error"; message: string; bookId?: string };

function errorMessage(error: unknown) {
  return error instanceof Error && error.message
    ? error.message
    : "Unggah buku gagal. Coba lagi.";
}

async function withRetry<T>(run: () => Promise<T>, attempts = 3) {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
    }
  }
  throw lastError;
}

/**
 * Renders PDF pages in the browser and uploads them in small batches. The
 * server records each confirmed page, so an interrupted upload resumes by
 * choosing the same file again.
 */
export function usePdfBookUpload(organizationId: string) {
  const utils = api.useUtils();
  const [state, setState] = useState<PdfBookUploadState>({ phase: "idle" });
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    return () => {
      cancelled.current = true;
    };
  }, []);

  async function uploadBatch(bookId: string, pages: RenderedPdfPage[]) {
    const prepared = await withRetry(() =>
      utils.client.pdfBook.prepareUploads.mutate({
        organizationId,
        bookId,
        pages: pages.map((page) => ({
          pageNumber: page.pageNumber,
          image: {
            contentType: page.image.type as "image/webp",
            size: page.image.size,
          },
          thumbnail: {
            contentType: page.thumbnail.type as "image/webp",
            size: page.thumbnail.size,
          },
        })),
      }),
    );
    await Promise.all(
      prepared.flatMap((target) => {
        const page = pages.find(
          (item) => item.pageNumber === target.pageNumber,
        );
        if (!page) return [];
        return [
          [target.image, page.image],
          [target.thumbnail, page.thumbnail],
        ].map(([upload, body]) =>
          withRetry(async () => {
            const { uploadUrl, headers } =
              upload as (typeof prepared)[number]["image"];
            const response = await fetch(uploadUrl, {
              method: "PUT",
              body: body as Blob,
              headers,
            });
            if (!response.ok) {
              throw new Error(`Unggah halaman gagal (${response.status}).`);
            }
          }),
        );
      }),
    );
    return withRetry(() =>
      utils.client.pdfBook.confirmUploads.mutate({
        organizationId,
        bookId,
        pages: prepared.map((target) => {
          const page = pages.find(
            (item) => item.pageNumber === target.pageNumber,
          )!;
          return {
            pageNumber: page.pageNumber,
            assetId: target.image.assetId,
            thumbnailAssetId: target.thumbnail.assetId,
            width: page.width,
            height: page.height,
            text: page.text,
          };
        }),
      }),
    );
  }

  async function start(
    file: File,
    options: {
      title: string;
      resume?: { bookId: string; pageCount: number };
      onBookReady?: (bookId: string) => void;
    },
  ) {
    let bookId = options.resume?.bookId;
    let pdf: PDFDocumentProxy | null = null;
    try {
      if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) {
        throw new Error("Pilih file PDF.");
      }
      if (file.size > MAX_PDF_BOOK_BYTES) {
        throw new Error("Ukuran PDF maksimal 100 MB.");
      }
      setState({ phase: "reading", fileName: file.name });
      pdf = await openPdfFile(file).catch(() => {
        throw new Error(
          "PDF tidak dapat dibuka. Pastikan file tidak rusak atau terkunci.",
        );
      });
      const pageCount = pdf.numPages;
      if (pageCount > MAX_PDF_BOOK_PAGES) {
        throw new Error(`PDF maksimal ${MAX_PDF_BOOK_PAGES} halaman.`);
      }
      if (options.resume && options.resume.pageCount !== pageCount) {
        throw new Error(
          "File ini berbeda dari buku yang sedang diunggah. Pilih file PDF yang sama.",
        );
      }

      const uploadedNumbers = new Set<number>();
      if (bookId) {
        const book = await utils.client.pdfBook.get.query({
          organizationId,
          bookId,
        });
        book.pages.forEach((page) => uploadedNumbers.add(page.pageNumber));
      } else {
        const created = await utils.client.pdfBook.create.mutate({
          organizationId,
          title: options.title,
          fileName: file.name,
          pageCount,
        });
        bookId = created.id;
      }
      const activeBookId = bookId;
      void utils.pdfBook.list.invalidate({ organizationId });
      options.onBookReady?.(activeBookId);

      let uploadedPages = uploadedNumbers.size;
      setState({
        phase: "uploading",
        bookId: activeBookId,
        fileName: file.name,
        pageCount,
        uploadedPages,
      });

      const remaining = Array.from(
        { length: pageCount },
        (_, i) => i + 1,
      ).filter((pageNumber) => !uploadedNumbers.has(pageNumber));
      // Render the next batch while the previous one uploads.
      let pendingUpload: Promise<void> | null = null;
      for (
        let offset = 0;
        offset < remaining.length;
        offset += PDF_PAGE_UPLOAD_BATCH_SIZE
      ) {
        if (cancelled.current) return;
        const rendered: RenderedPdfPage[] = [];
        for (const pageNumber of remaining.slice(
          offset,
          offset + PDF_PAGE_UPLOAD_BATCH_SIZE,
        )) {
          rendered.push(await renderPdfPage(pdf, pageNumber));
        }
        await pendingUpload;
        pendingUpload = uploadBatch(activeBookId, rendered).then((result) => {
          uploadedPages = result.uploadedPages;
          if (!cancelled.current) {
            setState({
              phase: "uploading",
              bookId: activeBookId,
              fileName: file.name,
              pageCount,
              uploadedPages,
            });
          }
        });
      }
      await pendingUpload;

      await Promise.all([
        utils.pdfBook.list.invalidate({ organizationId }),
        utils.pdfBook.get.invalidate({ organizationId, bookId: activeBookId }),
      ]);
      if (!cancelled.current) {
        setState({
          phase: "done",
          bookId: activeBookId,
          fileName: file.name,
          pageCount,
          uploadedPages: pageCount,
        });
      }
    } catch (error) {
      if (!cancelled.current) {
        setState({ phase: "error", message: errorMessage(error), bookId });
      }
    } finally {
      void pdf?.loadingTask.destroy();
    }
  }

  return { state, start, reset: () => setState({ phase: "idle" }) };
}
