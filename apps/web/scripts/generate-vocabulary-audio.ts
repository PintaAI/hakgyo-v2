import "dotenv/config";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { execFile } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { env } from "../src/env";
import { db } from "../src/server/db";

// NOTE: ../src/server/r2.ts is not imported here because it pulls in
// the "server-only" guard, which throws outside React Server Components.
// The client below mirrors it for script usage.
const r2 = new S3Client({
  region: "auto",
  endpoint: env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
});
const r2Bucket = env.CLOUDFLARE_R2_BUCKET_NAME;

// edge-tts is a free, keyless TTS with native Korean Neural voices.
// Install once on the machine running this script: pip install edge-tts
const DEFAULT_VOICE = "ko-KR-SunHiNeural";
const OWNER_EMAIL = "owner@hakgyo.test";
const AUDIO_CONTENT_TYPE = "audio/mpeg";
const RETRY_MAX = 5;
const RETRY_DELAY_MS = 10_000;
const BETWEEN_ITEMS_DELAY_MS = 500;

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  allowPositionals: false,
  strict: true,
  options: {
    execute: { type: "boolean", default: false },
    force: { type: "boolean", default: false },
    limit: { type: "string" },
    "set-id": { type: "string" },
    voice: { type: "string" },
    help: { type: "boolean", short: "h", default: false },
  },
});

if (values.help) {
  console.log(
    "Usage: bun scripts/generate-vocabulary-audio.ts [--execute] [options]\n\n" +
      "Generate Korean pronunciation audio for vocabulary entries with\n" +
      "edge-tts (free, keyless), upload the MP3s to R2, and attach them\n" +
      "as audioAssetId.\n\n" +
      "Requires: pip install edge-tts\n\n" +
      "Without --execute this is a dry run: it only prints what WOULD be done.\n\n" +
      "Options:\n" +
      "  --execute         actually generate, upload, and attach audio\n" +
      "  --force           regenerate entries that already have audio\n" +
      "  --limit <n>       only process the first n pending entries\n" +
      "  --set-id <id>     only process entries of one vocabulary set\n" +
      "  --voice <name>    edge-tts voice (default: ko-KR-SunHiNeural)",
  );
  process.exit(0);
}

const voice = values.voice ?? DEFAULT_VOICE;
const setId = values["set-id"];
const force = values.execute && values.force;

let limit: number | undefined;
if (values.limit !== undefined) {
  limit = Number.parseInt(values.limit, 10);
  if (!Number.isSafeInteger(limit) || limit <= 0) {
    console.error("--limit must be a positive integer.");
    process.exit(1);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runEdgeTts(text: string, outPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(
      "python3",
      ["-m", "edge_tts", "--voice", voice, "--text", text, "--write-media", outPath],
      { timeout: 60_000 },
      (error, _stdout, stderr) => {
        if (error) reject(new Error(stderr.trim() || error.message));
        else resolve();
      },
    );
  });
}

async function synthesize(term: string): Promise<Buffer> {
  const outPath = join(
    tmpdir(),
    `hakgyo-tts-${Date.now()}-${Math.random().toString(36).slice(2)}.mp3`,
  );
  let attempt = 0;
  for (;;) {
    try {
      await runEdgeTts(term, outPath);
      const audio = await readFile(outPath);
      await rm(outPath, { force: true });
      if (audio.byteLength === 0) throw new Error("empty audio output");
      return audio;
    } catch (error) {
      await rm(outPath, { force: true });
      attempt += 1;
      if (attempt > RETRY_MAX) throw error;
      console.log(
        `TTS retry ${attempt}/${RETRY_MAX} for "${term}" after error, waiting ${RETRY_DELAY_MS / 1000}s...`,
      );
      await sleep(RETRY_DELAY_MS);
    }
  }
}

function audioKey(organizationId: string, entryId: string) {
  return `vocabulary-audio/${organizationId}/${entryId}.mp3`;
}

const preflightPath = join(tmpdir(), `hakgyo-tts-preflight-${Date.now()}.mp3`);
try {
  await runEdgeTts("테스트", preflightPath);
} catch {
  console.error(
    "edge-tts preflight failed. Install it first: pip install edge-tts",
  );
  process.exit(1);
} finally {
  await rm(preflightPath, { force: true });
}

const entries = await db.vocabularyEntry.findMany({
  where: {
    ...(setId ? { vocabularySetId: setId } : {}),
    ...(force ? {} : { audioAssetId: null }),
  },
  select: {
    id: true,
    organizationId: true,
    term: true,
    audioAssetId: true,
  },
  orderBy: { createdAt: "asc" },
  ...(limit !== undefined ? { take: limit } : {}),
});

console.log(
  `Pending entries: ${entries.length} | voice=${voice}${force ? " | FORCE regenerate" : ""}`,
);

if (!values.execute) {
  console.log("Sample terms:");
  for (const entry of entries.slice(0, 5)) {
    console.log(`  - ${entry.term} (${entry.id})`);
  }
  console.log(
    `\nDry run — nothing generated. Re-run with --execute to process ${entries.length} entries.`,
  );
  process.exit(0);
}

if (entries.length === 0) {
  console.log("Nothing to do — every selected entry already has audio.");
  process.exit(0);
}

const owner = await db.user.findUnique({
  where: { email: OWNER_EMAIL },
  select: { id: true },
});

let done = 0;
let failed = 0;
const failures: string[] = [];

for (const entry of entries) {
  const term = entry.term.trim();
  if (!term) {
    console.log(`skip ${entry.id}: empty term`);
    continue;
  }
  try {
    const audio = await synthesize(term);
    const key = audioKey(entry.organizationId, entry.id);
    await r2.send(
      new PutObjectCommand({
        Bucket: r2Bucket,
        Key: key,
        Body: audio,
        ContentType: AUDIO_CONTENT_TYPE,
        CacheControl: "public, max-age=86400",
      }),
    );
    if (entry.audioAssetId) {
      await db.asset.update({
        where: { id: entry.audioAssetId },
        data: {
          objectKey: key,
          contentType: AUDIO_CONTENT_TYPE,
          size: audio.byteLength,
          confirmedAt: new Date(),
          deletedAt: null,
        },
      });
    } else {
      const asset = await db.asset.create({
        data: {
          organizationId: entry.organizationId,
          uploadedByUserId: owner?.id ?? null,
          objectKey: key,
          fileName: `${term.slice(0, 100).replaceAll("/", "-")}.mp3`,
          contentType: AUDIO_CONTENT_TYPE,
          size: audio.byteLength,
          confirmedAt: new Date(),
        },
        select: { id: true },
      });
      await db.vocabularyEntry.update({
        where: { id: entry.id },
        data: { audioAssetId: asset.id },
      });
    }
    done += 1;
    if (done % 25 === 0) console.log(`progress: ${done}/${entries.length}`);
  } catch (error) {
    failed += 1;
    const reason = error instanceof Error ? error.message : "unknown error";
    failures.push(`${entry.id} (${term}): ${reason}`);
    console.error(`failed ${entry.id} (${term}): ${reason}`);
  }
  await sleep(BETWEEN_ITEMS_DELAY_MS);
}

console.log(`\nDone: ${done} attached, ${failed} failed of ${entries.length}.`);
if (failures.length) {
  console.log("Failures:");
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exit(1);
}
