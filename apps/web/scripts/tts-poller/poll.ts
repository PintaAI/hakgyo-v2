#!/usr/bin/env bun
/**
 * Question bank TTS poller (docs/eps-question-generator.md section 6), run on the VPS about every
 * 5 minutes (systemd timer, see README.md). Vercel cannot reach the GPU PC, so this side pulls:
 *
 * 1. skip quietly when the worker is off (jobs wait; after two hours OpenAI speaks them);
 * 2. claim waiting jobs from Hakgyo (`POST /api/internal/tts/claim`);
 * 3. run VoxCPM2 on the worker through `gpu-run` (persistent workspace "hakgyo-tts");
 * 4. upload each mp3 to R2 with a signed URL and complete the job, or report the failure.
 *
 * Environment: HAKGYO_URL (https://hakgyo-v2.vercel.app), TTS_WORKER_SECRET (the same value as in
 * Vercel), optionally GPU_RUN (path of gpu-run), TTS_JOBS_PER_RUN (default 3).
 */
import {
  mkdtempSync,
  existsSync,
  readFileSync,
  rmSync,
  statSync,
  copyFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  jobResult,
  voxcpmVoices,
  workerInput,
  type ClaimedJob,
} from "./poll-lib";

const BASE = (process.env.HAKGYO_URL ?? "").replace(/\/$/, "");
const SECRET = process.env.TTS_WORKER_SECRET ?? "";
const GPU_RUN = process.env.GPU_RUN ?? "gpu-run";
const LIMIT = Number(process.env.TTS_JOBS_PER_RUN ?? 3) || 3;

if (!BASE || !SECRET) {
  console.error("[tts-poller] set HAKGYO_URL and TTS_WORKER_SECRET");
  process.exit(1);
}

async function api<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${BASE}/api/internal/tts${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${SECRET}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok)
    throw new Error(`${path}: ${response.status} ${await response.text()}`);
  return (await response.json()) as T;
}

const run = (args: string[], cwd?: string) =>
  Bun.spawnSync(args, { cwd, stdout: "inherit", stderr: "inherit" }).exitCode;

// 1. The worker must be up, or the jobs stay waiting.
if (
  Bun.spawnSync([GPU_RUN, "status"], { stdout: "ignore", stderr: "ignore" })
    .exitCode !== 0
) {
  console.log("[tts-poller] worker not reachable; jobs keep waiting");
  process.exit(0);
}

// 2. Claim.
const { jobs } = await api<{ jobs: ClaimedJob[] }>(`/claim?limit=${LIMIT}`, {});
if (!jobs.length) process.exit(0);
console.log(
  `[tts-poller] ${jobs.length} job(s): ${jobs.map((job) => job.id).join(", ")}`,
);

// 3. Speak on the worker.
const dir = mkdtempSync(join(tmpdir(), "hakgyo-tts-"));
try {
  writeFileSync(join(dir, "jobs.json"), JSON.stringify(workerInput(jobs)));
  for (const file of ["voxcpm_tts.py", "run.sh"]) {
    copyFileSync(join(import.meta.dir, file), join(dir, file));
  }
  const exit = run([
    GPU_RUN,
    "--workspace",
    "hakgyo-tts",
    "--dir",
    dir,
    "--out",
    "results.tgz",
    "--",
    "bash run.sh",
  ]);
  const archive = join(dir, "results.tgz");
  if (
    exit !== 0 ||
    !existsSync(archive) ||
    run(["tar", "-xzf", "results.tgz"], dir) !== 0
  ) {
    for (const job of jobs) {
      await api(`/${job.id}/fail`, {
        error: `Worker run failed (exit ${exit})`,
      }).catch(console.error);
    }
    process.exit(1);
  }

  // 4. Upload and complete each job.
  for (const job of jobs) {
    const statusPath = join(dir, "out", job.id, "status.json");
    const result = jobResult(job, {
      status: existsSync(statusPath)
        ? (JSON.parse(readFileSync(statusPath, "utf8")) as {
            ok: boolean;
            error?: string;
          })
        : null,
      has: (path) => existsSync(join(dir, path)),
    });
    try {
      if (!result.ok) throw new Error(result.error);
      const clips = result.files.map((file) => ({
        key: file.key,
        contentType: "audio/mpeg" as const,
        size: statSync(join(dir, file.path)).size,
        path: file.path,
      }));
      const { uploads } = await api<{
        uploads: Array<{
          key: string;
          objectKey: string;
          uploadUrl: string;
          headers: Record<string, string>;
        }>;
      }>(`/${job.id}/uploads`, {
        clips: clips.map(({ path: _path, ...clip }) => clip),
      });
      for (const upload of uploads) {
        const clip = clips.find((entry) => entry.key === upload.key)!;
        const response = await fetch(upload.uploadUrl, {
          method: "PUT",
          headers: upload.headers,
          body: Bun.file(join(dir, clip.path)),
        });
        if (!response.ok)
          throw new Error(`upload ${clip.key}: ${response.status}`);
      }
      await api(`/${job.id}/complete`, {
        provider: "VOXCPM",
        voices: voxcpmVoices,
        clips: uploads.map((upload) => {
          const clip = clips.find((entry) => entry.key === upload.key)!;
          return {
            key: clip.key,
            objectKey: upload.objectKey,
            contentType: clip.contentType,
            size: clip.size,
          };
        }),
      });
      console.log(`[tts-poller] ${job.id} done`);
    } catch (error) {
      console.error(`[tts-poller] ${job.id} failed`, error);
      await api(`/${job.id}/fail`, {
        error: error instanceof Error ? error.message : String(error),
      }).catch(console.error);
    }
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}
