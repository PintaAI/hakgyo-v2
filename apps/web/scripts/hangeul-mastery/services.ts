// Database and R2 connections for the Hangeul Mastery scripts, from apps/web/.env (Bun loads it when the scripts
// run from apps/web). ../../src/server/r2.ts and src/env.js are not used: they pull in "server-only" and validate
// every variable of the web app.
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { PrismaNeon } from "@prisma/adapter-neon";

import { PrismaClient } from "../../generated/prisma/client";

export function connectDb() {
  const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!connectionString)
    throw new Error("DIRECT_URL or DATABASE_URL is required.");
  return {
    db: new PrismaClient({ adapter: new PrismaNeon({ connectionString }) }),
    host: new URL(connectionString).hostname,
  };
}

export type Bucket = { client: S3Client; name: string };

/** The R2 bucket named by CLOUDFLARE_R2_* in `env` (process.env, or another parsed .env file). */
export function bucketFromEnv(
  env: Record<string, string | undefined> = process.env,
): Bucket {
  const endpoint = env.CLOUDFLARE_R2_ENDPOINT;
  const accessKeyId = env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const name = env.CLOUDFLARE_R2_BUCKET_NAME;
  if (!endpoint || !accessKeyId || !secretAccessKey || !name) {
    throw new Error(
      "CLOUDFLARE_R2_ENDPOINT, CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY and CLOUDFLARE_R2_BUCKET_NAME are required.",
    );
  }
  return {
    client: new S3Client({
      region: "auto",
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    }),
    name,
  };
}

export const sameBucket = (
  a: Record<string, string | undefined>,
  b: Record<string, string | undefined>,
) =>
  a.CLOUDFLARE_R2_ENDPOINT === b.CLOUDFLARE_R2_ENDPOINT &&
  a.CLOUDFLARE_R2_BUCKET_NAME === b.CLOUDFLARE_R2_BUCKET_NAME;

export async function objectSize(
  bucket: Bucket,
  key: string,
): Promise<number | null> {
  try {
    const head = await bucket.client.send(
      new HeadObjectCommand({ Bucket: bucket.name, Key: key }),
    );
    return head.ContentLength ?? 0;
  } catch (error) {
    const status = (error as { $metadata?: { httpStatusCode?: number } })
      .$metadata?.httpStatusCode;
    if (status === 404) return null;
    throw error;
  }
}

export async function putMp3(bucket: Bucket, key: string, body: Uint8Array) {
  await bucket.client.send(
    new PutObjectCommand({
      Bucket: bucket.name,
      Key: key,
      Body: body,
      ContentType: "audio/mpeg",
      // Object keys are content addressed, so a key never changes its bytes.
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
}

export async function getObject(bucket: Bucket, key: string) {
  const result = await bucket.client.send(
    new GetObjectCommand({ Bucket: bucket.name, Key: key }),
  );
  if (!result.Body) throw new Error(`${key} has no body`);
  return result.Body.transformToByteArray();
}
