import { MAX_PDF_PAGE_TEXT_LENGTH } from "@hakgyo/shared";
import type { PDFDocumentProxy } from "pdfjs-dist";

const PAGE_LONG_SIDE = 1600;
const THUMBNAIL_LONG_SIDE = 320;
const PDFJS_BASE = "/pdfjs";

export type RenderedPdfPage = {
  pageNumber: number;
  width: number;
  height: number;
  image: Blob;
  thumbnail: Blob;
  text: string | null;
};

async function loadPdfjs() {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = `${PDFJS_BASE}/build/pdf.worker.min.mjs`;
  return pdfjs;
}

export async function openPdfFile(file: File): Promise<PDFDocumentProxy> {
  const pdfjs = await loadPdfjs();
  const data = new Uint8Array(await file.arrayBuffer());
  return pdfjs.getDocument({
    data,
    cMapUrl: `${PDFJS_BASE}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${PDFJS_BASE}/standard_fonts/`,
    wasmUrl: `${PDFJS_BASE}/wasm/`,
    iccUrl: `${PDFJS_BASE}/iccs/`,
  }).promise;
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (webp) => {
        // Safari cannot encode WebP and silently returns PNG; use JPEG there.
        if (webp?.type === "image/webp") return resolve(webp);
        canvas.toBlob(
          (jpeg) =>
            jpeg ? resolve(jpeg) : reject(new Error("Gagal membuat gambar.")),
          "image/jpeg",
          quality,
        );
      },
      "image/webp",
      quality,
    );
  });
}

function scaleCanvas(source: HTMLCanvasElement, longSide: number) {
  const ratio = longSide / Math.max(source.width, source.height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(source.width * ratio));
  canvas.height = Math.max(1, Math.round(source.height * ratio));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Browser tidak mendukung canvas.");
  context.imageSmoothingQuality = "high";
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export async function renderPdfPage(
  pdf: PDFDocumentProxy,
  pageNumber: number,
): Promise<RenderedPdfPage> {
  const page = await pdf.getPage(pageNumber);
  try {
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(
      PAGE_LONG_SIDE / Math.max(base.width, base.height),
      4,
    );
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    await page.render({ canvas, viewport, background: "#ffffff" }).promise;

    const [image, thumbnail, textContent] = await Promise.all([
      canvasToBlob(canvas, 0.82),
      canvasToBlob(scaleCanvas(canvas, THUMBNAIL_LONG_SIDE), 0.7),
      page.getTextContent().catch(() => null),
    ]);
    const text = textContent?.items
      .map((item) =>
        "str" in item ? item.str + (item.hasEOL ? "\n" : "") : "",
      )
      .join("")
      .replace(/[ \t]+/g, " ")
      .trim()
      .slice(0, MAX_PDF_PAGE_TEXT_LENGTH);

    canvas.width = 0;
    canvas.height = 0;
    return {
      pageNumber,
      width: Math.round(viewport.width),
      height: Math.round(viewport.height),
      image,
      thumbnail,
      text: text?.length ? text : null,
    };
  } finally {
    page.cleanup();
  }
}
