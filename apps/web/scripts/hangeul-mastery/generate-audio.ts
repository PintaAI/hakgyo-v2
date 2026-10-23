// Speaks every Korean text of the Hangeul Mastery course with VoxCPM2 on the GPU PC, uploads the clips to R2 and
// registers them as Asset rows of the system organization, recording each clip in audio-manifest.json.
//
//   bun run --cwd apps/web hangeul:audio [--execute] [--limit N] [--only <text>]... [--force] [--stale]
//                                        [--source-env <file>] [--content <file>]
//
// Without --execute it only reports. Clips are cached by text: only texts without a clip are generated (--stale
// also redoes clips of an older voice, --force redoes the selected texts). Every run with --execute also makes sure
// each clip of the content has its Asset row in this database (and its object in this bucket), so the same
// manifest serves another environment: run the script there with --execute (and --source-env pointing at the .env
// of the environment that has the objects when the buckets differ).
//
// Single syllables are the hard case for TTS. Each text gets up to 7 takes in rounds; a take is kept when Whisper
// (Korean) hears the text and its length fits the syllable count. Texts where no take passes keep the best one and
// are flagged `review` in the manifest: listen to those.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";

import { parse as parseEnv } from "dotenv";

import type { PrismaClient } from "../../generated/prisma/client";
import { HAKGYO_SYSTEM_ORGANIZATION_ID } from "../../src/server/foundation/constants";
import {
  collectCourseAudioTexts,
  objectKeyFor,
  readManifest,
  voiceVersion,
  writeManifest,
  type AudioManifest,
  type ManifestClip,
  type VoiceSettings,
} from "./audio-manifest";
import {
  judgeTake,
  measureTake,
  PROCESSING,
  processTake,
} from "./audio-process";
import { loadContent } from "./load-content";
import {
  bucketFromEnv,
  connectDb,
  getObject,
  objectSize,
  putMp3,
  sameBucket,
  type Bucket,
} from "./services";
import { gpuAvailable, runTtsJob, type TtsLine } from "./voxcpm";

// ---------------------------------------------------------------- the voice

/**
 * The course voice: the course owner's own voice (used with their permission), the first 8.2 s of a reel of them
 * saying greetings, with 1 s of silence added so the model starts each clip fresh instead of finishing the
 * reference's last word. Every clip continues from that clip and its exact words (Hi-Fi mode), which keeps one
 * timbre. VOICE_DESCRIPTION only documents the voice; Hi-Fi mode does not read it.
 */
const VOICE_DESCRIPTION =
  "The course owner's own voice: a natural, calm Korean speaker with clear standard Seoul pronunciation";
const VOICE_REFERENCE = "voice/voice-ref.wav";
const VOICE_REFERENCE_TEXT =
  "안녕. 안녕하세요. 안녕하십니까. 평안하신가요. 강녕하십니까.";
const CFG = 2;
const STEPS = 20;
/** How the text is said; part of the voice version. */
const RECIPE = "hifi-continue+final-period";
/** Takes per round; a text leaves once a take passes. */
const ROUNDS = [[1], [2, 3], [4, 5, 6, 7]];
const BATCH = 120;

function voiceSettings(): VoiceSettings {
  const reference = join(import.meta.dir, VOICE_REFERENCE);
  return {
    reference: VOICE_REFERENCE,
    referenceSha256: createHash("sha256")
      .update(readFileSync(reference))
      .digest("hex"),
    referenceText: VOICE_REFERENCE_TEXT,
    description: VOICE_DESCRIPTION,
    cfg: CFG,
    steps: STEPS,
    processing: `${RECIPE}; ${PROCESSING}`,
  };
}

/** What the model is asked to say for a text: a final period gives short items a settled, sentence-like ending. */
export function spokenText(text: string) {
  return /[.!?。…]$/.test(text) ? text : `${text}.`;
}

const textHash = (text: string) =>
  createHash("sha1").update(text).digest("hex").slice(0, 12);

function linesFor(texts: string[], takes: number[]): TtsLine[] {
  return texts.flatMap((text) =>
    takes.map((take) => ({
      key: `${textHash(text)}-${take}`,
      text: spokenText(text),
      prompt_text: VOICE_REFERENCE_TEXT,
    })),
  );
}

// ---------------------------------------------------------------- generation

type Kept = {
  text: string;
  wav: string;
  take: number;
  heard: string;
  review?: string;
};

async function generateBatch(
  texts: string[],
  workDir: string,
): Promise<Kept[]> {
  const reference = join(import.meta.dir, VOICE_REFERENCE);
  const best = new Map<
    string,
    {
      score: number;
      take: number;
      wav: string;
      heard: string;
      problems: string[];
    }
  >();
  let pending = texts;
  for (const [round, takes] of ROUNDS.entries()) {
    if (!pending.length) break;
    const outDir = join(workDir, `round-${round}`);
    console.log(
      `  round ${round + 1}: ${pending.length} texts x ${takes.length} takes`,
    );
    const result = await runTtsJob({
      lines: linesFor(pending, takes),
      referenceWav: reference,
      cfg: CFG,
      steps: STEPS,
      whisper: true,
      outDir,
    });
    if (result.status !== 0)
      console.warn(
        `  VoxCPM2 exited with ${result.status}; using the takes it made`,
      );
    const passed = new Set<string>();
    for (const text of pending) {
      for (const take of takes) {
        const key = `${textHash(text)}-${take}`;
        const wav = join(outDir, `${key}.wav`);
        if (!existsSync(wav)) continue;
        const heard = result.transcripts.get(key) ?? "";
        const verdict = judgeTake(text, measureTake(wav), heard);
        const current = best.get(text);
        // A passing take always beats a failing one; among equals the lower score wins.
        const rank = (verdict.ok ? 0 : 1000) + verdict.score;
        if (!current || rank < current.score) {
          best.set(text, {
            score: rank,
            take,
            wav,
            heard,
            problems: verdict.problems,
          });
        }
        if (verdict.ok) passed.add(text);
      }
    }
    pending = pending.filter((text) => !passed.has(text));
  }
  return texts.flatMap((text) => {
    const take = best.get(text);
    if (!take) {
      console.warn(`  no audio was made for "${text}"`);
      return [];
    }
    return [
      {
        text,
        wav: take.wav,
        take: take.take,
        heard: take.heard.trim(),
        ...(take.problems.length ? { review: take.problems.join("; ") } : {}),
      },
    ];
  });
}

// ---------------------------------------------------------------- assets

async function systemUploader(db: PrismaClient) {
  const owner = await db.organizationMember.findFirst({
    where: { organizationId: HAKGYO_SYSTEM_ORGANIZATION_ID, role: "OWNER" },
    orderBy: { createdAt: "asc" },
    select: { userId: true },
  });
  return owner?.userId ?? null;
}

const fileNameOf = (clip: ManifestClip) =>
  `hangeul-${clip.objectKey.split("/").at(-1)!}`;

/** Asset ids by objectKey for the clips that have a confirmed row in this database. */
async function existingAssets(db: PrismaClient, objectKeys: string[]) {
  const rows = await db.asset.findMany({
    where: { objectKey: { in: objectKeys } },
    select: {
      id: true,
      objectKey: true,
      organizationId: true,
      deletedAt: true,
      confirmedAt: true,
    },
  });
  for (const row of rows) {
    if (row.organizationId !== HAKGYO_SYSTEM_ORGANIZATION_ID) {
      throw new Error(
        `${row.objectKey} is registered to organization ${row.organizationId}`,
      );
    }
  }
  return new Map(rows.map((row) => [row.objectKey, row]));
}

/**
 * Makes sure every clip has its object in this bucket and a confirmed Asset row in this database. Objects missing
 * here are copied from `source` when given.
 */
async function registerClips(input: {
  db: PrismaClient;
  bucket: Bucket;
  source: Bucket | null;
  clips: ManifestClip[];
  uploader: string | null;
}) {
  const existing = await existingAssets(
    input.db,
    input.clips.map((clip) => clip.objectKey),
  );
  let created = 0;
  let restored = 0;
  let copied = 0;
  const missing: string[] = [];
  // Every object is checked, also when its row exists: a row without its object would serve a broken clip.
  const sizes = new Map<string, number | null>();
  for (let start = 0; start < input.clips.length; start += 16) {
    await Promise.all(
      input.clips.slice(start, start + 16).map(async (clip) => {
        sizes.set(
          clip.objectKey,
          await objectSize(input.bucket, clip.objectKey),
        );
      }),
    );
  }
  for (const clip of input.clips) {
    if (sizes.get(clip.objectKey) === null) {
      if (
        !input.source ||
        (await objectSize(input.source, clip.objectKey)) === null
      ) {
        missing.push(clip.objectKey);
        continue;
      }
      await putMp3(
        input.bucket,
        clip.objectKey,
        await getObject(input.source, clip.objectKey),
      );
      copied += 1;
    }
    const row = existing.get(clip.objectKey);
    if (row && !row.deletedAt && row.confirmedAt) continue;
    if (row) {
      await input.db.asset.update({
        where: { id: row.id },
        data: { deletedAt: null, confirmedAt: row.confirmedAt ?? new Date() },
      });
      restored += 1;
    } else {
      await input.db.asset.create({
        data: {
          organizationId: HAKGYO_SYSTEM_ORGANIZATION_ID,
          uploadedByUserId: input.uploader,
          objectKey: clip.objectKey,
          fileName: fileNameOf(clip),
          contentType: "audio/mpeg",
          size: clip.bytes,
          confirmedAt: new Date(),
        },
      });
      created += 1;
    }
  }
  return { created, restored, copied, missing };
}

// ---------------------------------------------------------------- main

function usage() {
  console.log(`Generate the Hangeul Mastery audio with VoxCPM2 on the GPU PC.

Usage: bun run --cwd apps/web hangeul:audio [options]

  --execute            generate, upload and register (default: report only)
  --limit <n>          generate at most n new clips
  --only <text>        only this text (repeatable)
  --stale              also regenerate clips made with an older voice
  --force              regenerate the selected texts even when they have a clip
  --source-env <file>  .env of an environment whose bucket has the objects this bucket lacks
  --content <file>     content module (default: scripts/hangeul-mastery/content/index.ts)`);
}

async function main() {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    strict: true,
    options: {
      execute: { type: "boolean", default: false },
      limit: { type: "string" },
      only: { type: "string", multiple: true },
      stale: { type: "boolean", default: false },
      force: { type: "boolean", default: false },
      "source-env": { type: "string" },
      content: { type: "string" },
      help: { type: "boolean", short: "h", default: false },
    },
  });
  if (values.help) {
    usage();
    return 0;
  }
  const limit = values.limit === undefined ? Infinity : Number(values.limit);
  if (!(limit > 0)) throw new Error("--limit must be a positive number");

  const content = await loadContent(
    values.content ? resolve(values.content) : undefined,
  );
  const texts = collectCourseAudioTexts(content);
  const voice = voiceSettings();
  const version = voiceVersion(voice);
  const manifest: AudioManifest = readManifest() ?? {
    version: 1,
    voice,
    clips: {},
  };

  const only = values.only?.map((text) => text.normalize("NFC").trim());
  const unknown = only?.filter((text) => !texts.includes(text)) ?? [];
  if (unknown.length)
    console.warn(
      `Not in the content (generated anyway): ${unknown.join(", ")}`,
    );
  const selected = only ?? texts;
  const stale = selected.filter(
    (text) => manifest.clips[text] && manifest.clips[text].voice !== version,
  );
  const toGenerate = selected
    .filter(
      (text) =>
        !manifest.clips[text] ||
        values.force ||
        (values.stale && manifest.clips[text].voice !== version),
    )
    .slice(0, limit);
  const unused = Object.keys(manifest.clips).filter(
    (text) => !texts.includes(text),
  );
  const odd = texts.filter((text) => /[ㄱ-ㆎ]|[A-Za-z]/.test(text));

  const { db, host } = connectDb();
  const bucket = bucketFromEnv();
  const sourceEnv = values["source-env"]
    ? parseEnv(readFileSync(values["source-env"]))
    : null;
  const source =
    sourceEnv && !sameBucket(sourceEnv, process.env)
      ? bucketFromEnv(sourceEnv)
      : null;
  try {
    const usedClips = texts.flatMap((text) =>
      manifest.clips[text] ? [manifest.clips[text]] : [],
    );
    const assets = await existingAssets(
      db,
      usedClips.map((clip) => clip.objectKey),
    );
    const unregistered = usedClips.filter((clip) => {
      const row = assets.get(clip.objectKey);
      return row?.deletedAt !== null || row.confirmedAt === null;
    });

    console.log(
      `Database ${host}, bucket ${bucket.name}${values.execute ? "" : " (dry run)"}`,
    );
    console.log(
      `Voice ${version} (VoxCPM2, cfg ${CFG}, ${STEPS} steps, ${RECIPE})`,
    );
    console.log(
      `Texts in the content: ${texts.length}; clips in the manifest: ${Object.keys(manifest.clips).length}`,
    );
    console.log(
      `To generate: ${toGenerate.length}${toGenerate.length ? ` (${toGenerate.slice(0, 12).join(", ")}${toGenerate.length > 12 ? ", …" : ""})` : ""}`,
    );
    if (stale.length && !values.stale) {
      console.log(
        `Made with an older voice: ${stale.length} (--stale regenerates them)`,
      );
    }
    console.log(
      `Clips without an asset in this database: ${unregistered.length}`,
    );
    if (unused.length)
      console.log(
        `Clips no longer used by the content (kept): ${unused.length}`,
      );
    const review = texts.filter((text) => manifest.clips[text]?.review);
    if (review.length) {
      console.log(
        `Flagged for listening: ${review.map((text) => `${text} (${manifest.clips[text]!.review})`).join("; ")}`,
      );
    }
    if (odd.length) {
      console.warn(
        `Texts with bare jamo or Latin letters (say letters as syllables, 아 not ㅏ): ${odd.join(", ")}`,
      );
    }
    if (!values.execute) {
      console.log("\nDry run: nothing generated. Add --execute.");
      return 0;
    }

    const uploader = await systemUploader(db);
    let createdAssets = 0;
    if (toGenerate.length) {
      if (!gpuAvailable())
        throw new Error(
          "The GPU PC is not answering (gpu-run status). Is it on?",
        );
      const workDir = join(tmpdir(), `hangeul-audio-${process.pid}`);
      try {
        for (let start = 0; start < toGenerate.length; start += BATCH) {
          const batch = toGenerate.slice(start, start + BATCH);
          console.log(`\nBatch ${start / BATCH + 1}: ${batch.length} texts`);
          const kept = await generateBatch(batch, join(workDir, String(start)));
          for (const take of kept) {
            const { mp3, durationMs } = processTake(take.wav);
            const objectKey = objectKeyFor(mp3);
            await putMp3(bucket, objectKey, mp3);
            const clip: ManifestClip = {
              objectKey,
              bytes: mp3.byteLength,
              durationMs,
              voice: version,
              take: take.take,
              heard: take.heard,
              ...(take.review ? { review: take.review } : {}),
            };
            const made = await registerClips({
              db,
              bucket,
              source: null,
              clips: [clip],
              uploader,
            });
            createdAssets += made.created;
            manifest.clips[take.text] = clip;
            manifest.voice = voice;
            // After every clip, so an interrupted run keeps what it uploaded.
            writeManifest(manifest);
            console.log(
              `  ${take.review ? "?" : "✓"} ${take.text}  ${(durationMs / 1000).toFixed(2)} s, take ${take.take}, heard "${take.heard}"${take.review ? `  REVIEW: ${take.review}` : ""}`,
            );
          }
        }
      } finally {
        rmSync(workDir, { recursive: true, force: true });
      }
    }

    const clips = texts.flatMap((text) =>
      manifest.clips[text] ? [manifest.clips[text]] : [],
    );
    const registered = await registerClips({
      db,
      bucket,
      source,
      clips,
      uploader,
    });
    console.log(
      `\nAssets: ${createdAssets + registered.created} created, ${registered.restored} restored, ${registered.copied} objects copied from the source bucket.`,
    );
    const withoutClip = texts.filter((text) => !manifest.clips[text]);
    if (withoutClip.length)
      console.log(`Texts still without a clip: ${withoutClip.length}`);
    if (registered.missing.length) {
      console.error(
        `${registered.missing.length} objects are not in bucket ${bucket.name}${source ? " or the source bucket" : ""}; pass --source-env <.env of the environment that has them>.`,
      );
      return 1;
    }
    return 0;
  } finally {
    await db.$disconnect();
  }
}

if (import.meta.main) process.exit(await main());
