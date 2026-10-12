// Copies the pdf.js worker, CMaps (needed for Korean/CJK fonts), standard
// fonts, WASM decoders and ICC profiles from the installed package into
// public/pdfjs, so the CDN serves them as static files in the installed version
// instead of a function reading node_modules. Runs before `next dev` and
// `next build`; public/pdfjs is gitignored.
import { cpSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const source = dirname(require.resolve("pdfjs-dist/package.json"));
const target = join(dirname(fileURLToPath(import.meta.url)), "../public/pdfjs");

rmSync(target, { recursive: true, force: true });
for (const path of [
  "build/pdf.worker.min.mjs",
  "cmaps",
  "standard_fonts",
  "wasm",
  "iccs",
]) {
  cpSync(join(source, path), join(target, path), { recursive: true });
}
