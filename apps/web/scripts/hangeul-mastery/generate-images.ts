// Makes the Hangeul Mastery pictures (content/images.ts) with OpenAI, uploads them to R2, registers
// their Asset rows in the system organization and records them in image-manifest.json:
//   bun run --cwd apps/web hangeul:images [--execute] [--only <key>] [--force]
// Without --execute it only reports. A picture whose prompt, style and model are unchanged is not
// made again; every --execute run still makes sure each picture has its object and a confirmed
// Asset row in this database (the manifest holds no ids, so it serves every environment).
import { parseArgs } from "node:util";

import { PutObjectCommand } from "@aws-sdk/client-s3";

import type { PrismaClient } from "../../generated/prisma/client";
import { HAKGYO_SYSTEM_ORGANIZATION_ID } from "../../src/server/foundation/constants";
import { hangeulImages, type HangeulImageSpec } from "./content/images";
import {
  IMAGE_MODEL,
  IMAGE_QUALITY,
  IMAGE_SIZE,
  imageObjectKeyFor,
  imagePrompt,
  imageSpecHash,
  readImageManifest,
  writeImageManifest,
  type ImageManifest,
} from "./image-manifest";
import { bucketFromEnv, connectDb, objectSize, type Bucket } from "./services";

async function generate(spec: HangeulImageSpec) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is required.");
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: IMAGE_MODEL,
      prompt: imagePrompt(spec),
      size: IMAGE_SIZE,
      quality: IMAGE_QUALITY,
      output_format: "webp",
    }),
    signal: AbortSignal.timeout(300_000),
  });
  if (!response.ok) {
    throw new Error(
      `OpenAI ${response.status}: ${(await response.text()).slice(0, 400)}`,
    );
  }
  const result = (await response.json()) as {
    data?: Array<{ b64_json?: string }>;
  };
  const base64 = result.data?.[0]?.b64_json;
  if (!base64) throw new Error("OpenAI returned no image.");
  return Uint8Array.from(Buffer.from(base64, "base64"));
}

async function putWebp(bucket: Bucket, key: string, body: Uint8Array) {
  await bucket.client.send(
    new PutObjectCommand({
      Bucket: bucket.name,
      Key: key,
      Body: body,
      ContentType: "image/webp",
      // Object keys are content addressed, so a key never changes its bytes.
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
}

async function systemUploader(db: PrismaClient) {
  const owner = await db.organizationMember.findFirst({
    where: { organizationId: HAKGYO_SYSTEM_ORGANIZATION_ID, role: "OWNER" },
    orderBy: { createdAt: "asc" },
    select: { userId: true },
  });
  return owner?.userId ?? null;
}

/** Makes sure the picture has a confirmed Asset row in the system organization. */
async function register(
  db: PrismaClient,
  key: string,
  image: ImageManifest["images"][string],
  uploader: string | null,
) {
  const row = await db.asset.findUnique({
    where: { objectKey: image.objectKey },
    select: {
      id: true,
      organizationId: true,
      deletedAt: true,
      confirmedAt: true,
    },
  });
  if (row && row.organizationId !== HAKGYO_SYSTEM_ORGANIZATION_ID) {
    throw new Error(
      `${image.objectKey} is registered to organization ${row.organizationId}`,
    );
  }
  if (row && !row.deletedAt && row.confirmedAt) return "kept";
  if (row) {
    await db.asset.update({
      where: { id: row.id },
      data: { deletedAt: null, confirmedAt: row.confirmedAt ?? new Date() },
    });
    return "restored";
  }
  await db.asset.create({
    data: {
      organizationId: HAKGYO_SYSTEM_ORGANIZATION_ID,
      uploadedByUserId: uploader,
      objectKey: image.objectKey,
      fileName: `hangeul-${key}.webp`,
      contentType: "image/webp",
      size: image.bytes,
      confirmedAt: new Date(),
    },
  });
  return "created";
}

async function main() {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    strict: true,
    options: {
      execute: { type: "boolean", default: false },
      only: { type: "string", multiple: true },
      force: { type: "boolean", default: false },
    },
  });
  const manifest: ImageManifest = readImageManifest() ?? {
    version: 1,
    images: {},
  };
  const unknown = (values.only ?? []).filter((key) => !hangeulImages[key]);
  if (unknown.length)
    throw new Error(`Unknown picture key(s): ${unknown.join(", ")}`);
  const keys = values.only ?? Object.keys(hangeulImages);
  const toMake = keys.filter((key) => {
    const current = manifest.images[key];
    return values.force || current?.spec !== imageSpecHash(hangeulImages[key]!);
  });
  const { db, host } = connectDb();
  const bucket = bucketFromEnv();
  console.log(
    `Database ${host}, bucket ${bucket.name}${values.execute ? "" : " (dry run)"}`,
  );
  console.log(
    `${keys.length} picture(s), ${toMake.length} to make: ${toMake.join(", ") || "none"}`,
  );
  if (!values.execute) {
    console.log("Dry run: nothing made or written. Add --execute.");
    await db.$disconnect();
    return;
  }

  const uploader = await systemUploader(db);
  for (const key of toMake) {
    const spec = hangeulImages[key]!;
    process.stdout.write(`  making ${key}… `);
    const webp = await generate(spec);
    const objectKey = imageObjectKeyFor(webp);
    await putWebp(bucket, objectKey, webp);
    manifest.images[key] = {
      objectKey,
      bytes: webp.byteLength,
      spec: imageSpecHash(spec),
      alt: spec.alt,
    };
    // Saved after every picture, so an interrupted run keeps what it paid for.
    writeImageManifest(manifest);
    console.log(`${Math.round(webp.byteLength / 1024)} KB`);
  }
  const counts = { kept: 0, restored: 0, created: 0 };
  for (const key of keys) {
    const image = manifest.images[key];
    if (!image) continue;
    if ((await objectSize(bucket, image.objectKey)) === null) {
      throw new Error(
        `${image.objectKey} (${key}) is missing from bucket ${bucket.name}; run with --only ${key} --force.`,
      );
    }
    counts[await register(db, key, image, uploader)] += 1;
  }
  console.log(
    `Assets: ${counts.created} created, ${counts.restored} restored, ${counts.kept} already registered.`,
  );
  await db.$disconnect();
}

await main();
