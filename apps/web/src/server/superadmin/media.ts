import "server-only";

import { randomUUID } from "node:crypto";
import { GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { TRPCError } from "@trpc/server";

import { r2, r2Bucket } from "~/server/r2";
import {
  createUploadUrl,
  deleteObject,
  SIGNED_URL_TTL_SECONDS,
} from "~/server/storage/objects";

/**
 * Hakgyo's own media (promo videos, marketing assets, backups), kept in the
 * app bucket under one prefix and managed from the superadmin area. Keys carry
 * a random segment because the bucket is also served publicly.
 */
export const MEDIA_PREFIX = "hakgyo-media/";
export const MEDIA_FOLDERS = [
  "video",
  "gambar",
  "audio",
  "dokumen",
  "lainnya",
] as const;
export type MediaFolder = (typeof MEDIA_FOLDERS)[number];

/** R2 accepts single PUT uploads up to 5 GB. */
export const MAX_MEDIA_BYTES = 5 * 1024 ** 3;

export type MediaItem = {
  key: string;
  folder: string;
  name: string;
  size: number;
  updatedAt: Date | null;
};

function assertMediaKey(key: string) {
  if (!key.startsWith(MEDIA_PREFIX) || key.includes("..")) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Bukan file media Hakgyo.",
    });
  }
}

/** "Promo Video (final).mp4" → "promo-video-final.mp4" */
export function safeMediaName(filename: string) {
  const dot = filename.lastIndexOf(".");
  const base = dot > 0 ? filename.slice(0, dot) : filename;
  const ext =
    dot > 0
      ? filename
          .slice(dot + 1)
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "")
      : "";
  const slug =
    base
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "file";
  return ext ? `${slug}.${ext}` : slug;
}

/** `hakgyo-media/<folder>/<8 random chars>-<name>` */
export function mediaKey(folder: MediaFolder, filename: string) {
  return `${MEDIA_PREFIX}${folder}/${randomUUID().slice(0, 8)}-${safeMediaName(filename)}`;
}

function describe(
  key: string,
  size: number,
  updatedAt: Date | null,
): MediaItem {
  const rest = key.slice(MEDIA_PREFIX.length);
  const slash = rest.indexOf("/");
  const folder = slash > 0 ? rest.slice(0, slash) : "lainnya";
  const file = slash > 0 ? rest.slice(slash + 1) : rest;
  // drop the random segment for display
  const name = file.replace(/^[0-9a-f]{8}-/, "");
  return { key, folder, name, size, updatedAt };
}

export async function listMedia() {
  const items: MediaItem[] = [];
  let token: string | undefined;
  do {
    const page = await r2.send(
      new ListObjectsV2Command({
        Bucket: r2Bucket,
        Prefix: MEDIA_PREFIX,
        ContinuationToken: token,
      }),
    );
    for (const object of page.Contents ?? []) {
      if (!object.Key || object.Key.endsWith("/")) continue;
      items.push(
        describe(object.Key, object.Size ?? 0, object.LastModified ?? null),
      );
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  items.sort(
    (a, b) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0),
  );
  return {
    items,
    totalBytes: items.reduce((sum, item) => sum + item.size, 0),
  };
}

export async function createMediaUpload(input: {
  folder: MediaFolder;
  filename: string;
  contentType: string;
  size: number;
}) {
  if (input.size > MAX_MEDIA_BYTES) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Ukuran file maksimal 5 GB.",
    });
  }
  return createUploadUrl(
    mediaKey(input.folder, input.filename),
    input.contentType || "application/octet-stream",
  );
}

/** A short-lived link; downloads are saved under the readable name, without the random segment. */
export async function mediaDownloadUrl(
  key: string,
  disposition: "attachment" | "inline",
) {
  assertMediaKey(key);
  const { name } = describe(key, 0, null);
  return getSignedUrl(
    r2,
    new GetObjectCommand({
      Bucket: r2Bucket,
      Key: key,
      ResponseContentDisposition: `${disposition}; filename="${name}"`,
    }),
    { expiresIn: SIGNED_URL_TTL_SECONDS },
  );
}

export async function deleteMedia(key: string) {
  assertMediaKey(key);
  await deleteObject(key);
}
