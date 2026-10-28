import { epsTypeByTag } from "@hakgyo/shared/eps-taxonomy";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { randomUUID } from "node:crypto";

import type {
  Prisma,
  PrismaClient,
  TtsProvider,
} from "../../../generated/prisma/client";
import { assetAudioBlockType } from "~/lib/blocknote/block-catalog";
import {
  getBlockNotePlainText,
  toBlockNoteDocument,
} from "~/lib/blocknote/document";
import {
  openAiVoices,
  optionIndexOfClip,
  pcmToWav,
  ttsClipsFor,
  ttsVoiceDesigns,
  type TtsClip,
  type TtsVoice,
} from "~/lib/tts-clips";
import { lockAssessment } from "~/server/assessment/lock";
import { HAKGYO_SYSTEM_ORGANIZATION_ID } from "~/server/foundation/constants";
import { toPrismaJsonValue } from "~/server/prisma-json";
import {
  createDocumentKey,
  getDocumentPrefix,
} from "~/server/storage/documents";
import {
  createUploadUrl,
  deleteObject,
  headUploadedObject,
  putObject,
} from "~/server/storage/objects";

/**
 * Audio for bank questions (docs/eps-question-generator.md section 6): a job per question, run by
 * the VPS poller with VoxCPM2 on the GPU worker (it claims jobs, uploads the files and completes
 * them through `/api/internal/tts/*`), or with OpenAI when a job waits too long or staff ask for it
 * now. The files become shared Hakgyo assets placed in the prompt and options. One provider per
 * question.
 */

/** Jobs waiting this long go to the OpenAI fallback (the PC may be off). */
export const FALLBACK_AFTER_MS = 2 * 60 * 60 * 1000;
/** A claimed job that has not finished by then is given back (the poller died). */
export const STALE_CLAIM_MS = 30 * 60 * 1000;
/** Attempts before a job fails for good. */
export const MAX_TTS_ATTEMPTS = 3;
/** Largest audio file the poller may upload (a long dialogue is about 1 MB as mp3). */
export const MAX_TTS_FILE_BYTES = 20 * 1024 * 1024;

const ttsContentTypes = ["audio/mpeg", "audio/wav"] as const;

const claimToken = z.string().min(1).max(100);

export const completeTtsInput = z.object({
  token: claimToken,
  provider: z.enum(["VOXCPM", "OPENAI"]),
  clips: z
    .array(
      z.object({
        key: z.string().regex(/^(prompt|option-[0-3])$/),
        objectKey: z.string().min(1).max(300),
        contentType: z.enum(ttsContentTypes),
        size: z.number().int().min(1).max(MAX_TTS_FILE_BYTES),
      }),
    )
    .min(1)
    .max(5),
  voices: z.record(z.string(), z.string().max(100)).default({}),
});

export const ttsUploadsInput = z.object({
  token: claimToken,
  clips: z
    .array(
      z.object({
        key: z.string().regex(/^(prompt|option-[0-3])$/),
        contentType: z.enum(ttsContentTypes),
        size: z.number().int().min(1).max(MAX_TTS_FILE_BYTES),
      }),
    )
    .min(1)
    .max(5),
});

export const failTtsInput = z.object({
  token: claimToken,
  error: z.string().max(2000),
});

type ScriptMeta = {
  script?: Array<{ speaker: string; text: string }>;
};

async function bankQuestion(db: PrismaClient, questionId: string) {
  const question = await db.assessmentQuestion.findFirst({
    where: {
      id: questionId,
      assessment: {
        kind: "BANK",
        organizationId: HAKGYO_SYSTEM_ORGANIZATION_ID,
      },
    },
    select: {
      id: true,
      assessmentId: true,
      tags: true,
      bankMeta: true,
      options: { orderBy: { position: "asc" }, select: { content: true } },
    },
  });
  if (!question) throw new TRPCError({ code: "NOT_FOUND" });
  return question;
}

/** Queues audio for a listening question from its script; one open job per question. */
export async function requestTts(
  db: PrismaClient,
  questionId: string,
  userId: string,
) {
  const question = await bankQuestion(db, questionId);
  const type = question.tags.map(epsTypeByTag).find(Boolean);
  const clips = ttsClipsFor({
    audio: type?.audio ?? "none",
    script: ((question.bankMeta ?? {}) as ScriptMeta).script ?? [],
    optionTexts: question.options.map((option) =>
      getBlockNotePlainText(option.content),
    ),
  });
  if (!clips.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Soal ini belum punya naskah audio.",
    });
  }
  // The question row is the lock: two requests at once still make one job.
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "AssessmentQuestion" WHERE "id" = ${questionId} FOR UPDATE`;
    const open = await tx.ttsJob.findFirst({
      where: { questionId, status: { in: ["PENDING", "RUNNING"] } },
      select: { id: true, status: true },
    });
    if (open) return open;
    return tx.ttsJob.create({
      data: {
        questionId,
        requestedByUserId: userId,
        clips: toPrismaJsonValue(clips),
      },
      select: { id: true, status: true },
    });
  });
}

/**
 * Claims up to `limit` waiting jobs for the poller (and jobs whose claim went stale), oldest first,
 * each with a fresh token. A job that used up its attempts on stale claims fails instead.
 */
export async function claimTtsJobs(db: PrismaClient, limit: number) {
  const staleBefore = new Date(Date.now() - STALE_CLAIM_MS);
  await db.ttsJob.updateMany({
    where: {
      status: "RUNNING",
      claimedAt: { lt: staleBefore },
      attempts: { gte: MAX_TTS_ATTEMPTS },
    },
    data: {
      status: "FAILED",
      error: "The worker stopped answering too many times",
      finishedAt: new Date(),
      claimToken: null,
    },
  });
  const rows = await db.$queryRaw<
    Array<{ id: string; clips: Prisma.JsonValue; claimToken: string }>
  >`
    UPDATE "TtsJob" SET "status" = 'RUNNING', "claimedAt" = now(), "attempts" = "attempts" + 1,
      "claimToken" = gen_random_uuid()::text, "updatedAt" = now()
    WHERE "id" IN (
      SELECT "id" FROM "TtsJob"
      WHERE "status" = 'PENDING' OR ("status" = 'RUNNING' AND "claimedAt" < ${staleBefore})
      ORDER BY "createdAt" ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING "id", "clips", "claimToken"
  `;
  return rows.map((row) => ({
    id: row.id,
    token: row.claimToken,
    clips: row.clips as TtsClip[],
    voices: ttsVoiceDesigns,
  }));
}

/** The running job of this claim; anything else (finished, reclaimed) is refused. */
async function requireClaim(
  db: Prisma.TransactionClient | PrismaClient,
  jobId: string,
  token: string,
  lock = false,
) {
  if (lock) {
    await db.$queryRaw`SELECT "id" FROM "TtsJob" WHERE "id" = ${jobId} FOR UPDATE`;
  }
  const job = await db.ttsJob.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      status: true,
      questionId: true,
      requestedByUserId: true,
      clips: true,
      attempts: true,
      claimToken: true,
    },
  });
  if (!job) throw new TRPCError({ code: "NOT_FOUND" });
  if (job.status !== "RUNNING" || job.claimToken !== token) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "This run no longer owns the job",
    });
  }
  return job;
}

/** Signed uploads for a claimed job's audio files (kept under the requester's document prefix). */
export async function ttsUploadTargets(
  db: PrismaClient,
  jobId: string,
  input: z.infer<typeof ttsUploadsInput>,
) {
  const job = await requireClaim(db, jobId, input.token);
  return Promise.all(
    input.clips.map(async (clip) => {
      const extension = clip.contentType === "audio/mpeg" ? ".mp3" : ".wav";
      const upload = await createUploadUrl(
        createDocumentKey(job.requestedByUserId, clip.size, extension),
        clip.contentType,
        { immutable: true },
      );
      return {
        key: clip.key,
        objectKey: upload.key,
        uploadUrl: upload.uploadUrl,
        headers: upload.headers,
        expiresIn: upload.expiresIn,
      };
    }),
  );
}

const audioBlock = (asset: {
  id: string;
  fileName: string;
  contentType: string;
}) => ({
  type: assetAudioBlockType,
  props: {
    assetId: asset.id,
    fileName: asset.fileName,
    contentType: asset.contentType,
    caption: "",
  },
  children: [],
});

type Block = { type?: string; props?: { assetId?: unknown } };

const isAudio = (block: Block) =>
  block.type === assetAudioBlockType || block.type === "audio";

/** The content without its audio, and the audio assets it held. */
function splitAudio(content: unknown) {
  const blocks = toBlockNoteDocument(content) as Block[];
  return {
    rest: blocks.filter((block) => !isAudio(block)),
    assetIds: blocks.flatMap((block) =>
      isAudio(block) && typeof block.props?.assetId === "string"
        ? [block.props.assetId]
        : [],
    ),
  };
}

/**
 * Stores a job's uploaded files as shared Hakgyo assets and puts them in the question: the prompt
 * clip at the end of the prompt, option clips in their options. Every clip of the job is required
 * (one provider per question, no partial audio). Earlier audio is replaced; its files are removed
 * when nothing else (a package) still uses them.
 */
export async function completeTtsJob(
  db: PrismaClient,
  jobId: string,
  input: z.infer<typeof completeTtsInput>,
) {
  const job = await requireClaim(db, jobId, input.token);
  const expected = (job.clips as TtsClip[]).map((clip) => clip.key).sort();
  const given = input.clips.map((clip) => clip.key).sort();
  if (expected.join() !== given.join()) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Expected clips ${expected.join(", ")}`,
    });
  }
  const prefix = getDocumentPrefix(job.requestedByUserId);
  if (input.clips.some((clip) => !clip.objectKey.startsWith(prefix))) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Foreign object key" });
  }
  for (const clip of input.clips) {
    const head = await headUploadedObject(clip.objectKey, "audio");
    if (head.ContentLength !== clip.size) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Size mismatch" });
    }
  }
  const question = await bankQuestion(db, job.questionId);
  const now = new Date();
  const result = await db.$transaction(async (tx) => {
    // Checked again under the lock: another run (the poller, the fallback) may have finished first.
    await requireClaim(tx, jobId, input.token, true);
    await lockAssessment(tx, question.assessmentId);
    const current = await tx.assessmentQuestion.findUniqueOrThrow({
      where: { id: question.id },
      select: {
        prompt: true,
        bankMeta: true,
        options: {
          orderBy: { position: "asc" },
          select: { id: true, content: true },
        },
      },
    });
    const assetIds: Record<string, string> = {};
    const prompt = splitAudio(current.prompt);
    const replaced = [...prompt.assetIds];
    const nextOptions = current.options.map((option) => {
      const split = splitAudio(option.content);
      replaced.push(...split.assetIds);
      return { id: option.id, blocks: split.rest };
    });
    const promptBlocks: unknown[] = [...prompt.rest];
    for (const clip of input.clips) {
      const extension = clip.contentType === "audio/mpeg" ? "mp3" : "wav";
      const asset = await tx.asset.create({
        data: {
          organizationId: HAKGYO_SYSTEM_ORGANIZATION_ID,
          uploadedByUserId: job.requestedByUserId,
          objectKey: clip.objectKey,
          fileName: `bank-${question.id}-${clip.key}-${input.provider.toLowerCase()}.${extension}`,
          contentType: clip.contentType,
          size: clip.size,
          confirmedAt: now,
          sharedAt: now,
        },
        select: { id: true, fileName: true, contentType: true },
      });
      await tx.assessmentAsset.create({
        data: {
          assessmentId: question.assessmentId,
          assetId: asset.id,
          organizationId: HAKGYO_SYSTEM_ORGANIZATION_ID,
          assetOrganizationId: HAKGYO_SYSTEM_ORGANIZATION_ID,
        },
      });
      assetIds[clip.key] = asset.id;
      const optionIndex = optionIndexOfClip(clip.key);
      if (optionIndex === null) promptBlocks.push(audioBlock(asset));
      else nextOptions[optionIndex]?.blocks.push(audioBlock(asset));
    }
    for (const option of nextOptions) {
      await tx.assessmentOption.update({
        where: { id: option.id },
        data: { content: toPrismaJsonValue(option.blocks) },
      });
    }
    await tx.assessmentQuestion.update({
      where: { id: question.id },
      data: {
        prompt: toPrismaJsonValue(promptBlocks),
        bankMeta: toPrismaJsonValue({
          ...((current.bankMeta ?? {}) as Record<string, unknown>),
          audio: {
            provider: input.provider,
            voices: input.voices,
            jobId,
            createdAt: now.toISOString(),
          },
        }),
      },
    });
    await tx.ttsJob.update({
      where: { id: jobId },
      data: {
        status: "DONE",
        provider: input.provider,
        result: toPrismaJsonValue(assetIds),
        error: null,
        claimToken: null,
        finishedAt: now,
      },
    });
    // Replaced audio leaves the bank; files no other assessment links go entirely.
    if (replaced.length) {
      await tx.assessmentAsset.deleteMany({
        where: {
          assessmentId: question.assessmentId,
          assetId: { in: replaced },
        },
      });
    }
    const unused = replaced.length
      ? await tx.asset.findMany({
          where: {
            id: { in: replaced },
            organizationId: HAKGYO_SYSTEM_ORGANIZATION_ID,
            assessments: { none: {} },
            materials: { none: {} },
          },
          select: { id: true, objectKey: true },
        })
      : [];
    if (unused.length) {
      await tx.asset.deleteMany({
        where: { id: { in: unused.map(({ id }) => id) } },
      });
    }
    return { assetIds, unusedKeys: unused.map(({ objectKey }) => objectKey) };
  });
  await Promise.all(
    result.unusedKeys.map((key) => deleteObject(key).catch(() => undefined)),
  );
  return { assetIds: result.assetIds };
}

/** A run failed: the job waits for another try, or fails for good after the last attempt. */
export async function failTtsJob(
  db: PrismaClient,
  jobId: string,
  input: z.infer<typeof failTtsInput>,
) {
  const job = await requireClaim(db, jobId, input.token);
  const final = job.attempts >= MAX_TTS_ATTEMPTS;
  const updated = await db.ttsJob.updateMany({
    where: { id: job.id, claimToken: input.token, status: "RUNNING" },
    data: {
      status: final ? "FAILED" : "PENDING",
      error: input.error.slice(0, 1000),
      claimToken: null,
      claimedAt: null,
      finishedAt: final ? new Date() : null,
    },
  });
  return { final, released: updated.count === 1 };
}

/** Speaks one line as raw 16-bit mono PCM at 24 kHz (OpenAI's `pcm` format). */
export type SpeakLine = (line: {
  voice: TtsVoice;
  text: string;
}) => Promise<Uint8Array>;

/**
 * Runs a job with OpenAI right away (the fallback, or "Buat dengan cloud sekarang"). It only takes
 * a job that is waiting, or whose PC run went stale; every line is spoken in parallel (so the
 * request stays well inside the function limit), joined with pauses into a WAV per clip, stored
 * and completed like a poller result.
 */
export async function runTtsWithOpenAi(
  db: PrismaClient,
  jobId: string,
  speak: SpeakLine,
) {
  const token = randomUUID();
  const claimed = await db.ttsJob.updateMany({
    where: {
      id: jobId,
      OR: [
        { status: "PENDING" },
        {
          status: "RUNNING",
          claimedAt: { lt: new Date(Date.now() - STALE_CLAIM_MS) },
        },
      ],
    },
    data: {
      status: "RUNNING",
      claimedAt: new Date(),
      claimToken: token,
      attempts: { increment: 1 },
    },
  });
  if (claimed.count !== 1) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "Audio sedang dibuat di PC. Tunggu sebentar.",
    });
  }
  const job = await requireClaim(db, jobId, token);
  const uploaded: Array<{ key: string; objectKey: string; size: number }> = [];
  try {
    const clips = await Promise.all(
      (job.clips as TtsClip[]).map(async (clip) => ({
        key: clip.key,
        wav: pcmToWav(await Promise.all(clip.lines.map((line) => speak(line)))),
      })),
    );
    for (const clip of clips) {
      const objectKey = createDocumentKey(
        job.requestedByUserId,
        clip.wav.length,
        ".wav",
      );
      await putObject(objectKey, clip.wav, "audio/wav");
      uploaded.push({ key: clip.key, objectKey, size: clip.wav.length });
    }
    return await completeTtsJob(db, jobId, {
      token,
      provider: "OPENAI" satisfies TtsProvider,
      clips: uploaded.map((clip) => ({
        ...clip,
        contentType: "audio/wav" as const,
      })),
      voices: openAiVoices,
    });
  } catch (error) {
    await Promise.all(
      uploaded.map((clip) =>
        deleteObject(clip.objectKey).catch(() => undefined),
      ),
    );
    await failTtsJob(db, jobId, {
      token,
      error: error instanceof Error ? error.message : "OpenAI TTS failed",
    }).catch(() => undefined);
    throw error;
  }
}

/** Jobs that waited past the fallback time (or whose PC run went stale), for the hourly fallback. */
export function overdueTtsJobs(db: PrismaClient, limit: number) {
  const now = Date.now();
  return db.ttsJob.findMany({
    where: {
      OR: [
        {
          status: "PENDING",
          createdAt: { lt: new Date(now - FALLBACK_AFTER_MS) },
        },
        {
          status: "RUNNING",
          claimedAt: { lt: new Date(now - STALE_CLAIM_MS) },
        },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: { id: true },
  });
}

/** The latest job per question, for the bank page. */
export async function latestTtsJobs(
  db: PrismaClient,
  questionIds: readonly string[],
) {
  const jobs = questionIds.length
    ? await db.ttsJob.findMany({
        where: { questionId: { in: [...questionIds] } },
        orderBy: [{ questionId: "asc" }, { createdAt: "desc" }],
        distinct: ["questionId"],
        select: {
          questionId: true,
          status: true,
          error: true,
          createdAt: true,
          provider: true,
        },
      })
    : [];
  return new Map(jobs.map((job) => [job.questionId, job]));
}
