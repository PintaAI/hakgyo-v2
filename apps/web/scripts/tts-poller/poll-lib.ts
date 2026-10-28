/**
 * Pure parts of the TTS poller (poll.ts), kept apart so they can be tested without the worker.
 */
import type { TtsClip } from "../../src/lib/tts-clips";

export type ClaimedJob = {
  id: string;
  clips: TtsClip[];
  voices: Record<string, string>;
};

/** The worker's jobs.json: only what voxcpm_tts.py reads. */
export function workerInput(jobs: readonly ClaimedJob[]) {
  return jobs.map((job) => ({
    id: job.id,
    clips: job.clips.map((clip) => ({ key: clip.key, lines: clip.lines })),
    voices: job.voices,
  }));
}

export type JobResult =
  | { ok: true; files: Array<{ key: string; path: string }> }
  | { ok: false; error: string };

/**
 * What came back for one job: its status.json and an mp3 per clip. A clip without its file fails
 * the job (one provider per question: no partial audio).
 */
export function jobResult(
  job: ClaimedJob,
  read: {
    status: { ok: boolean; error?: string } | null;
    has: (relativePath: string) => boolean;
  },
): JobResult {
  if (!read.status) return { ok: false, error: "No result from the worker" };
  if (!read.status.ok) {
    return { ok: false, error: read.status.error ?? "The worker failed" };
  }
  const files = job.clips.map((clip) => ({
    key: clip.key,
    path: `out/${job.id}/${clip.key}.mp3`,
  }));
  const missing = files.filter((file) => !read.has(file.path));
  if (missing.length) {
    return {
      ok: false,
      error: `Missing audio for ${missing.map((file) => file.key).join(", ")}`,
    };
  }
  return { ok: true, files };
}

/** The voices the worker used, recorded with the question's audio. */
export const voxcpmVoices = {
  M: "voxcpm2-designed-man",
  F: "voxcpm2-designed-woman",
};
