import { TRPCError } from "@trpc/server";

import type { Prisma } from "../../../generated/prisma/client";
import { detectMediaContentType } from "~/lib/media-signature";
import { requireOrganizationPermission } from "~/server/authorization";

import { createDocumentKey } from "./documents";
import { putObject, removeObject } from "./objects";
import { fetchRemoteFile, RemoteFileError } from "./remote-file";

type DatabaseClient = Prisma.TransactionClient | Prisma.DefaultPrismaClient;

export const MAX_IMPORTED_FILE_SIZE = 25 * 1024 * 1024;

const extensions: Record<string, string> = {
  "image/gif": ".gif",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "audio/mpeg": ".mp3",
  "audio/mp4": ".m4a",
  "audio/ogg": ".ogg",
  "audio/wav": ".wav",
  "audio/webm": ".webm",
};

function importedFileName(
  requested: string | undefined,
  url: URL,
  contentType: string,
) {
  let fromUrl = url.pathname.split("/").at(-1) ?? "";
  try {
    fromUrl = decodeURIComponent(fromUrl);
  } catch {
    // Keep the raw segment when it is not valid percent-encoding.
  }
  const base = [requested?.trim(), fromUrl].find(Boolean) ?? "file";
  const cleaned = base.replace(/[\\/\u0000-\u001f]/g, "").slice(0, 200);
  const extension = extensions[contentType]!;
  const stem = cleaned.replace(/\.[a-z0-9]{1,10}$/i, "") || "file";
  return `${stem}${extension}`;
}

/**
 * Downloads an image or audio file from a public https URL into the
 * organization's file library, as if the actor had uploaded it.
 */
export async function importOrganizationFileFromUrl(
  db: DatabaseClient,
  input: {
    actorUserId: string;
    organizationId: string;
    url: string;
    fileName?: string;
    contentType?: string;
  },
) {
  await requireOrganizationPermission({
    organizationId: input.organizationId,
    permission: "asset.create",
    userId: input.actorUserId,
  });

  let file: Awaited<ReturnType<typeof fetchRemoteFile>>;
  try {
    file = await fetchRemoteFile(input.url, MAX_IMPORTED_FILE_SIZE);
  } catch (error) {
    if (!(error instanceof RemoteFileError)) throw error;
    throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
  }

  const contentType = detectMediaContentType(
    file.body,
    file.contentType ?? input.contentType?.toLowerCase() ?? null,
  );
  if (!contentType) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Only PNG, JPEG, GIF and WebP images and MP3, M4A, OGG, WAV and WebM audio can be imported",
    });
  }
  if (!file.body.length) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "The file is empty" });
  }

  const size = file.body.length;
  const key = createDocumentKey(
    input.actorUserId,
    size,
    extensions[contentType]!,
  );
  const etag = await putObject(key, file.body, contentType);
  try {
    return await db.asset.create({
      data: {
        organizationId: input.organizationId,
        uploadedByUserId: input.actorUserId,
        objectKey: key,
        fileName: importedFileName(input.fileName, file.url, contentType),
        contentType,
        size,
        etag,
        confirmedAt: new Date(),
      },
      select: { id: true, fileName: true, contentType: true, size: true },
    });
  } catch (error) {
    await removeObject(key, "imported file without an asset record");
    throw error;
  }
}
