import { readFile } from "node:fs/promises";
import { join, normalize, sep } from "node:path";

// Serves the pdf.js worker, CMaps (needed for Korean/CJK fonts), standard
// fonts, and WASM decoders from the installed package so versions stay in sync.
// Resolved from the app root (bundlers rewrite require.resolve); production
// builds trace these files via outputFileTracingIncludes in next.config.js.
const pdfjsRoot = join(process.cwd(), "node_modules", "pdfjs-dist");
const allowedRoots = ["build", "cmaps", "standard_fonts", "wasm", "iccs"];
const contentTypes: Record<string, string> = {
  ".mjs": "text/javascript; charset=utf-8",
  ".bcmap": "application/octet-stream",
  ".pfb": "application/octet-stream",
  ".ttf": "font/ttf",
  ".wasm": "application/wasm",
  ".icc": "application/octet-stream",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const relative = normalize(path.join("/"));
  const extension = /\.[a-z0-9]+$/i.exec(relative)?.[0] ?? "";
  if (
    !allowedRoots.includes(path[0] ?? "") ||
    relative.includes("..") ||
    (path[0] === "build" && !relative.endsWith("pdf.worker.min.mjs")) ||
    !contentTypes[extension]
  ) {
    return new Response("Not found", { status: 404 });
  }
  try {
    const file = await readFile(join(pdfjsRoot, ...relative.split(sep)));
    return new Response(file, {
      headers: {
        "Content-Type": contentTypes[extension],
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
