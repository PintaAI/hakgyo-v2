import { epsTypeByTag } from "@hakgyo/shared/eps-taxonomy";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  type Prisma,
  type PrismaClient,
  type TtsProvider,
} from "../../../generated/prisma/client";
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
import { createDocumentKey } from "~/server/storage/documents";
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

export const completeTtsInput = z.object({
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
  const open = await db.ttsJob.findFirst({
    where: { questionId, status: { in: ["PENDING", "RUNNING"] } },
    select: { id: true },
  });
  if (open) return open;
  return db.ttsJob.create({
    data: {
      questionId,
      requestedByUserId: userId,
      clips: toPrismaJsonValue(clips),
    },
    select: { id: true },
  });
}

/**
 * Claims up to `limit` waiting jobs for the poller (and jobs whose claim went stale), oldest first.
 * Each job is claimed once even when several pollers run.
 */
export async function claimTtsJobs(db: PrismaClient, limit: number) {
  const staleBefore = new Date(Date.now() - STALE_CLAIM_MS);
  const rows = await db.$queryRaw<
    Array<{ id: string; clips: Prisma.JsonValue }>
  >`
    UPDATE "TtsJob" SET "status" = 'RUNNING', "claimedAt" = now(), "attempts" = "attempts" + 1, "updatedAt" = now()
    WHERE "id" IN (
      SELECT "id" FROM "TtsJob"
      WHERE "status" = 'PENDING' OR ("status" = 'RUNNING' AND "claimedAt" < ${staleBefore})
      ORDER BY "createdAt" ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING "id", "clips"
  `;
  return rows.map((row) => ({
    id: row.id,
    clips: row.clips as TtsClip[],
    voices: ttsVoiceDesigns,
  }));
}

async function requireClaimedJob(db: PrismaClient, jobId: string) {
  const job = await db.ttsJob.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      status: true,
      questionId: true,
      requestedByUserId: true,
      clips: true,
    },
  });
  if (!job) throw new TRPCError({ code: "NOT_FOUND" });
  if (job.status === "DONE" || job.status === "FAILED") {
    throw new TRPCError({ code: "CONFLICT", message: "Job is finished" });
  }
  return job;
}

/** Signed uploads for a job's audio files (kept under the requester's document prefix). */
export async function ttsUploadTargets(
  db: PrismaClient,
  jobId: string,
  input: z.infer<typeof ttsUploadsInput>,
) {
  const job = await requireClaimedJob(db, jobId);
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
  type: "assetAudio",
  props: {
    assetId: asset.id,
    fileName: asset.fileName,
    contentType: asset.contentType,
    caption: "",
  },
  children: [],
});

const withoutAudio = (content: unknown) =>
  (toBlockNoteDocument(content) as Array<{ type?: string }>).filter(
    (block) => block.type !== "assetAudio" && block.type !== "audio",
  );

/**
 * Stores a job's uploaded files as shared Hakgyo assets and puts them in the question: the prompt
 * clip at the end of the prompt, option clips in their options (earlier audio is replaced, so a
 * question never mixes providers).
 */
export async function completeTtsJob(
  db: PrismaClient,
  jobId: string,
  input: z.infer<typeof completeTtsInput>,
) {
  const job = await requireClaimedJob(db, jobId);
  const expected = new Set((job.clips as TtsClip[]).map((clip) => clip.key));
  if (input.clips.some((clip) => !expected.has(clip.key))) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown clip" });
  }
  const prefix = createDocumentKey(job.requestedByUserId, 1, "").replace(
    /[^/]+$/,
    "",
  );
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
  return db.$transaction(async (tx) => {
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
    const result: Record<string, string> = {};
    let prompt = withoutAudio(current.prompt);
    for (const clip of input.clips) {
      const optionIndex = optionIndexOfClip(clip.key);
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
      result[clip.key] = asset.id;
      if (optionIndex === null) {
        prompt = [...prompt, audioBlock(asset)];
      } else {
        const option = current.options[optionIndex];
        if (option) {
          await tx.assessmentOption.update({
            where: { id: option.id },
            data: {
              content: toPrismaJsonValue([
                ...withoutAudio(option.content),
                audioBlock(asset),
              ]),
            },
          });
        }
      }
    }
    await tx.assessmentQuestion.update({
      where: { id: question.id },
      data: {
        prompt: toPrismaJsonValue(prompt),
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
        result: toPrismaJsonValue(result),
        error: null,
        finishedAt: now,
      },
    });
    return { assetIds: result };
  });
}

/** A run failed: the job waits for another try, or fails for good after the last attempt. */
export async function failTtsJob(
  db: PrismaClient,
  jobId: string,
  error: string,
) {
  const job = await requireClaimedJob(db, jobId);
  const attempts = await db.ttsJob.findUniqueOrThrow({
    where: { id: job.id },
    select: { attempts: true },
  });
  const final = attempts.attempts >= MAX_TTS_ATTEMPTS;
  await db.ttsJob.update({
    where: { id: job.id },
    data: {
      status: final ? "FAILED" : "PENDING",
      error: error.slice(0, 1000),
      claimedAt: null,
      finishedAt: final ? new Date() : null,
    },
  });
  return { final };
}

/** Speaks one line as raw 16-bit mono PCM at 24 kHz (OpenAI's `pcm` format). */
export type SpeakLine = (line: {
  voice: TtsVoice;
  text: string;
}) => Promise<Uint8Array>;

/**
 * Runs a job with OpenAI right away (the fallback, or "Buat dengan cloud sekarang"): each clip's
 * lines are spoken, joined with pauses into a WAV, stored and completed like a poller result.
 */
export async function runTtsWithOpenAi(
  db: PrismaClient,
  jobId: string,
  speak: SpeakLine,
) {
  const job = await requireClaimedJob(db, jobId);
  await db.ttsJob.update({
    where: { id: jobId },
    data: {
      status: "RUNNING",
      claimedAt: new Date(),
      attempts: { increment: 1 },
    },
  });
  const uploaded: Array<{ key: string; objectKey: string; size: number }> = [];
  try {
    for (const clip of job.clips as TtsClip[]) {
      const pieces: Uint8Array[] = [];
      for (const line of clip.lines) pieces.push(await speak(line));
      const wav = pcmToWav(pieces);
      const objectKey = createDocumentKey(
        job.requestedByUserId,
        wav.length,
        ".wav",
      );
      await putObject(objectKey, wav, "audio/wav");
      uploaded.push({ key: clip.key, objectKey, size: wav.length });
    }
    return await completeTtsJob(db, jobId, {
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
    await failTtsJob(
      db,
      jobId,
      error instanceof Error ? error.message : "OpenAI TTS failed",
    ).catch(() => undefined);
    throw error;
  }
}

/** Jobs that waited past the fallback time, for the hourly fallback run. */
export function overdueTtsJobs(db: PrismaClient, limit: number) {
  return db.ttsJob.findMany({
    where: {
      status: "PENDING",
      createdAt: { lt: new Date(Date.now() - FALLBACK_AFTER_MS) },
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
  if (!questionIds.length)
    return new Map<
      string,
      {
        status: string;
        error: string | null;
        createdAt: Date;
        provider: string | null;
      }
    >();
  const jobs = await db.ttsJob.findMany({
    where: { questionId: { in: [...questionIds] } },
    orderBy: { createdAt: "desc" },
    select: {
      questionId: true,
      status: true,
      error: true,
      createdAt: true,
      provider: true,
    },
  });
  const latest = new Map<string, (typeof jobs)[number]>();
  for (const job of jobs)
    if (!latest.has(job.questionId)) latest.set(job.questionId, job);
  return latest;
}
