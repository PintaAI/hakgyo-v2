import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, extname, resolve } from "node:path";
import { parseArgs } from "node:util";
import type { Worker as TesseractWorker } from "tesseract.js";

import {
  parseHrdkPages,
  validateHrdkManifest,
  type ExtractedPdfPage,
} from "../../src/lib/hrdk-content/parser";
import { hrdkManifestSchema } from "../../src/lib/hrdk-content/schema";

type PdfTextItem = {
  str: string;
  width: number;
  height: number;
  transform: number[];
};

function usage() {
  console.log(`
Extract an HRDK textbook PDF into a reviewable Hakgyo manifest.

Usage:
  bun run content:extract-hrdk -- textbook.pdf [options]

Options:
  --output <path>             Manifest output (default: generated/<name>.json)
  --title <title>             Course title
  --slug <slug>               Course slug
  --description <text>        Course description
  --source-url <url>          Original official PDF URL for traceability
  --start-page <number>       First PDF page to extract (default: 1)
  --end-page <number>         Last PDF page to extract
  --pages-per-lesson <number> Fallback chapter size (default: 10)
  --ocr-languages <codes>     OCR languages (default: kor+eng+ind)
  --ocr-scale <number>        PDF render scale for OCR (default: 2)
  --skip-ocr                  Do not OCR image-only pages
  --publish                   Mark generated course as PUBLISHED
  --help                      Show this help
`);
}

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function nonEmpty(value: string | undefined) {
  const normalized = value?.trim();
  if (!normalized) return undefined;
  return normalized;
}

function positiveInteger(value: string | undefined, name: string) {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return parsed;
}

function positiveNumber(value: string | undefined, name: string) {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 4) {
    throw new Error(`${name} must be greater than 0 and at most 4.`);
  }
  return parsed;
}

function isTextItem(value: unknown): value is PdfTextItem {
  return Boolean(
    value &&
    typeof value === "object" &&
    "str" in value &&
    typeof value.str === "string" &&
    "transform" in value &&
    Array.isArray(value.transform),
  );
}

function itemsToLines(values: unknown[]) {
  const items = values.filter(isTextItem);
  const rows: Array<{ y: number; items: PdfTextItem[] }> = [];
  for (const item of items) {
    if (!item.str.trim()) continue;
    const y = item.transform[5] ?? 0;
    let row = rows.find((candidate) => Math.abs(candidate.y - y) <= 2);
    if (!row) {
      row = { y, items: [] };
      rows.push(row);
    }
    row.items.push(item);
  }

  return rows
    .sort((left, right) => right.y - left.y)
    .map((row) => {
      const sorted = row.items.sort(
        (left, right) => (left.transform[4] ?? 0) - (right.transform[4] ?? 0),
      );
      let line = "";
      let previousEnd: number | null = null;
      for (const item of sorted) {
        const x = item.transform[4] ?? 0;
        const gap = previousEnd === null ? 0 : x - previousEnd;
        const fontSize = Math.max(
          item.height || 0,
          Math.abs(item.transform[0] ?? 0),
          8,
        );
        if (line && gap > fontSize * 1.8) line += "\t";
        else if (line && gap > fontSize * 0.15) line += " ";
        line += item.str;
        previousEnd = x + (item.width || 0);
      }
      return line.normalize("NFC").trim();
    })
    .filter(Boolean);
}

async function main() {
  const { values, positionals } = parseArgs({
    args: Bun.argv.slice(2),
    allowPositionals: true,
    strict: true,
    options: {
      output: { type: "string" },
      title: { type: "string" },
      slug: { type: "string" },
      description: { type: "string" },
      "source-url": { type: "string" },
      "start-page": { type: "string" },
      "end-page": { type: "string" },
      "pages-per-lesson": { type: "string" },
      "ocr-languages": { type: "string" },
      "ocr-scale": { type: "string" },
      "skip-ocr": { type: "boolean", default: false },
      publish: { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  });

  if (values.help) {
    usage();
    return;
  }
  const input = positionals[0];
  if (!input) {
    usage();
    throw new Error("PDF path is required.");
  }
  const inputPath = resolve(input);
  if (extname(inputPath).toLowerCase() !== ".pdf") {
    throw new Error("Input must be a PDF file.");
  }

  const bytes = await readFile(inputPath);
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = getDocument({
    data: new Uint8Array(bytes),
    useSystemFonts: true,
  });
  const pdf = await loadingTask.promise;
  const totalPages = pdf.numPages;
  const startPage = positiveInteger(values["start-page"], "start-page") ?? 1;
  const endPage = positiveInteger(values["end-page"], "end-page") ?? totalPages;
  const pagesPerLesson =
    positiveInteger(values["pages-per-lesson"], "pages-per-lesson") ?? 10;
  const ocrScale = positiveNumber(values["ocr-scale"], "ocr-scale") ?? 2;
  const ocrLanguages = (values["ocr-languages"] ?? "kor+eng+ind")
    .split("+")
    .map((language) => language.trim())
    .filter(Boolean);
  if (startPage > endPage || endPage > totalPages) {
    throw new Error(`Page range must be within 1-${totalPages}.`);
  }

  const pages: ExtractedPdfPage[] = [];
  let ocrWorker: TesseractWorker | null = null;
  try {
    for (let pageNumber = startPage; pageNumber <= endPage; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      let lines = itemsToLines(textContent.items);
      let method = "text";
      if (
        !values["skip-ocr"] &&
        lines.join("").replace(/\s/g, "").length < 20
      ) {
        if (!ocrWorker) {
          const { createWorker } = await import("tesseract.js");
          console.log(`Loading OCR languages: ${ocrLanguages.join("+")}`);
          ocrWorker = await createWorker(ocrLanguages, undefined, {
            logger: ({ status, progress }) => {
              if (status === "recognizing text") {
                process.stdout.write(`\rOCR ${Math.round(progress * 100)}%`);
              }
            },
          });
          process.stdout.write("\n");
        }
        const { createCanvas } = await import("@napi-rs/canvas");
        const viewport = page.getViewport({ scale: ocrScale });
        const canvas = createCanvas(
          Math.ceil(viewport.width),
          Math.ceil(viewport.height),
        );
        await page.render({
          canvas: canvas as unknown as HTMLCanvasElement,
          viewport,
          background: "rgb(255,255,255)",
        }).promise;
        const recognized = await ocrWorker.recognize(
          canvas.toDataURL("image/png"),
        );
        process.stdout.write("\n");
        lines = recognized.data.text
          .normalize("NFC")
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean);
        method = "ocr";
      }
      pages.push({ pageNumber, lines });
      console.log(`Extracted page ${pageNumber}/${endPage} (${method})`);
    }
  } finally {
    await ocrWorker?.terminate();
    await loadingTask.destroy();
  }

  const baseName = basename(inputPath, extname(inputPath));
  const courseTitle = nonEmpty(values.title) ?? baseName.replace(/[-_]+/g, " ");
  const courseSlug = nonEmpty(values.slug) ?? slugify(courseTitle);
  const parsed = parseHrdkPages(pages, { pagesPerLesson });
  const manifest = hrdkManifestSchema.parse({
    schemaVersion: 1,
    source: {
      fileName: basename(inputPath),
      sha256: createHash("sha256").update(bytes).digest("hex"),
      pageCount: totalPages,
      extractedAt: new Date().toISOString(),
      ...(values["source-url"] ? { sourceUrl: values["source-url"] } : {}),
    },
    course: {
      slug: courseSlug,
      title: courseTitle,
      description:
        nonEmpty(values.description) ??
        "Materi bahasa Korea hasil ekstraksi terstruktur dari textbook HRDK.",
      status: values.publish ? "PUBLISHED" : "DRAFT",
    },
    lessons: parsed.lessons,
  });
  const report = validateHrdkManifest(manifest, parsed.issues);

  const outputPath = resolve(
    values.output ?? `generated/${slugify(baseName)}.json`,
  );
  const reportPath = outputPath.replace(/\.json$/i, ".report.json");
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);

  console.log(`Manifest: ${outputPath}`);
  console.log(`Report:   ${reportPath}`);
  console.log(
    `Found ${report.summary.lessons} lessons, ${report.summary.vocabularyEntries} vocabulary entries, and ${report.summary.assessmentQuestions} generated questions.`,
  );
  if (report.issues.length) {
    console.log(
      `Review ${report.issues.length} extraction issue(s) before import.`,
    );
  }
}

await main();
