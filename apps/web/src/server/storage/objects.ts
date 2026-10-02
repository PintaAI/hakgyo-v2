import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { TRPCError } from "@trpc/server";

import { hasImageSignature } from "~/lib/image-signature";
import { r2, r2Bucket } from "~/server/r2";

export const SIGNED_URL_TTL_SECONDS = 5 * 60;

/** Signs a PUT for `key` and returns what the client needs to upload. */
export async function createUploadUrl(
  key: string,
  contentType: string,
  options: { immutable?: boolean } = {},
) {
  const uploadUrl = await getSignedUrl(
    r2,
    new PutObjectCommand({
      Bucket: r2Bucket,
      Key: key,
      ContentType: contentType,
      CacheControl: options.immutable
        ? "public, max-age=31536000, immutable"
        : undefined,
    }),
    { expiresIn: SIGNED_URL_TTL_SECONDS },
  );
  return {
    key,
    uploadUrl,
    expiresIn: SIGNED_URL_TTL_SECONDS,
    headers: { "Content-Type": contentType },
  };
}

export async function signDownloadUrl(
  key: string,
  disposition: "attachment" | "inline",
) {
  return getSignedUrl(
    r2,
    new GetObjectCommand({
      Bucket: r2Bucket,
      Key: key,
      ResponseContentDisposition: disposition,
    }),
    { expiresIn: SIGNED_URL_TTL_SECONDS },
  );
}

export async function deleteObject(key: string) {
  await r2.send(new DeleteObjectCommand({ Bucket: r2Bucket, Key: key }));
}

/** Deletes `key`, logging instead of throwing when R2 fails. */
export async function removeObject(key: string, reason: string) {
  try {
    await deleteObject(key);
  } catch (error) {
    console.error(`Failed to remove ${reason}`, error);
  }
}

/** HEADs an uploaded object, mapping a missing object to NOT_FOUND. */
export async function headUploadedObject(key: string, label: string) {
  try {
    return await r2.send(new HeadObjectCommand({ Bucket: r2Bucket, Key: key }));
  } catch (cause) {
    const status = (cause as { $metadata?: { httpStatusCode?: number } })
      .$metadata?.httpStatusCode;
    throw new TRPCError({
      code: status === 404 ? "NOT_FOUND" : "INTERNAL_SERVER_ERROR",
      message: status === 404 ? `Uploaded ${label} was not found` : undefined,
      cause,
    });
  }
}

/**
 * Checks that an uploaded image matches the size and content type it was
 * signed for and that its bytes really are that image type. Rejected uploads
 * are removed from R2 unless the caller manages cleanup of referenced objects.
 */
export async function validateImageObject(
  key: string,
  expected: { size: number; contentType: string },
  label: string,
  options: { removeOnFailure?: boolean } = {},
) {
  const object = await headUploadedObject(key, label);
  if (
    object.ContentLength !== expected.size ||
    object.ContentType !== expected.contentType
  ) {
    if (options.removeOnFailure !== false) {
      await removeObject(key, "rejected upload");
    }
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Uploaded ${label} does not match the signed request`,
    });
  }

  let headerBytes: Uint8Array;
  try {
    const headerObject = await r2.send(
      new GetObjectCommand({ Bucket: r2Bucket, Key: key, Range: "bytes=0-15" }),
    );
    if (!headerObject.Body) throw new Error(`Uploaded ${label} has no body`);
    headerBytes = await headerObject.Body.transformToByteArray();
  } catch (cause) {
    if (options.removeOnFailure !== false) {
      await removeObject(key, "rejected upload");
    }
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Uploaded ${label} could not be validated`,
      cause,
    });
  }

  if (!hasImageSignature(headerBytes, expected.contentType)) {
    if (options.removeOnFailure !== false) {
      await removeObject(key, "rejected upload");
    }
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Uploaded file is not a valid ${label}`,
    });
  }
}
