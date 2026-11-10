// The picture manifest (image-manifest.json, committed): every picture key of content/images.ts ->
// the image made for it. Like the audio manifest it holds no database ids: a picture is found by its
// content-addressed R2 object key (hangeul-mastery/images/<sha256 prefix>.webp), and each
// environment finds or creates its own Asset row with that objectKey.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { HANGEUL_IMAGE_STYLE, type HangeulImageSpec } from "./content/images";

const HERE = import.meta.dir;
export const IMAGE_MANIFEST_PATH = join(HERE, "image-manifest.json");
export const IMAGE_OBJECT_PREFIX = "hangeul-mastery/images/";
export const IMAGE_MODEL = "gpt-image-2.5-flare";
export const IMAGE_SIZE = "1536x1024";
export const IMAGE_QUALITY = "high";

export type ManifestImage = {
  /** R2 object key, the same in every environment. */
  objectKey: string;
  bytes: number;
  /** `imageSpecHash()` of what the picture was made from; a different hash makes a new picture. */
  spec: string;
  alt: string;
};

export type ImageManifest = {
  version: 1;
  images: Record<string, ManifestImage>;
};

/** The full prompt sent to the model: the course style, then what this picture shows. */
export const imagePrompt = (spec: HangeulImageSpec) =>
  `${spec.prompt} Style: ${HANGEUL_IMAGE_STYLE}`;

export function imageSpecHash(spec: HangeulImageSpec) {
  return createHash("sha256")
    .update(
      JSON.stringify([
        IMAGE_MODEL,
        IMAGE_SIZE,
        IMAGE_QUALITY,
        imagePrompt(spec),
      ]),
    )
    .digest("hex")
    .slice(0, 12);
}

export function imageObjectKeyFor(webp: Uint8Array) {
  const sha = createHash("sha256").update(webp).digest("hex");
  return `${IMAGE_OBJECT_PREFIX}${sha.slice(0, 24)}.webp`;
}

export function readImageManifest(
  path = IMAGE_MANIFEST_PATH,
): ImageManifest | null {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")) as ImageManifest;
}

/** Writes the manifest with pictures sorted by key, so diffs stay small. */
export function writeImageManifest(
  manifest: ImageManifest,
  path = IMAGE_MANIFEST_PATH,
) {
  const images = Object.fromEntries(
    Object.entries(manifest.images).sort(([a], [b]) =>
      a < b ? -1 : a > b ? 1 : 0,
    ),
  );
  writeFileSync(path, `${JSON.stringify({ ...manifest, images }, null, 1)}\n`);
}
