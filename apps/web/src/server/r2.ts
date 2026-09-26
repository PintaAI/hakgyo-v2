import "server-only";

import { DeleteObjectsCommand, S3Client } from "@aws-sdk/client-s3";

import { env } from "~/env";
import { chunk } from "~/server/batch";

export const r2 = new S3Client({
  region: "auto",
  endpoint: env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
});

export const r2Bucket = env.CLOUDFLARE_R2_BUCKET_NAME;

// DeleteObjects accepts at most 1,000 keys per request.
const DELETE_OBJECTS_MAX_KEYS = 1000;

/**
 * Best-effort bulk delete. Failures (per key or per request) are logged with
 * `failureMessage` and never thrown, so callers can clean up after the
 * database commit without failing the request.
 */
export async function deleteR2Objects(
  keys: readonly string[],
  failureMessage = "Failed to delete R2 object",
) {
  await Promise.all(
    chunk([...new Set(keys)], DELETE_OBJECTS_MAX_KEYS).map(async (batch) => {
      try {
        const result = await r2.send(
          new DeleteObjectsCommand({
            Bucket: r2Bucket,
            Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
          }),
        );
        for (const error of result.Errors ?? []) {
          console.error(`${failureMessage} ${error.Key}`, error);
        }
      } catch (error) {
        console.error(`${failureMessage} (${batch.length} keys)`, error);
      }
    }),
  );
}
