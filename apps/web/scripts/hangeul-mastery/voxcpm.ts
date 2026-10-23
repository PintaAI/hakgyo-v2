// VoxCPM2 (OpenBMB, Apache-2.0) on the GPU PC through the `gpu-run` CLI. The job runs in the persistent
// "hakgyo-video" workspace, whose Python environments already have VoxCPM2 and faster-whisper, and reuses that
// repository's render/tts.py and render/whisper.py unchanged (they are staged from /root/projects/hakgyo-video,
// never edited). Only small files go up (the scripts, lines.json and the reference clip); WAVs and the Korean
// Whisper transcripts come back as one archive.
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const HAKGYO_VIDEO =
  process.env.HAKGYO_VIDEO_DIR ?? "/root/projects/hakgyo-video";
const WORKSPACE = "hakgyo-video";
const STAGE_ROOT = join(homedir(), ".cache/hakgyo-hangeul-mastery");
const HERE = import.meta.dir;

/**
 * One line for render/tts.py. `ref: ""` turns cloning off for the line (voice design from `style`); a `ref` naming
 * one of the job's `references` clones that clip instead of the main reference. With `prompt_text` (the exact words
 * of the clip) the line continues from the clip (Hi-Fi mode).
 */
export type TtsLine = {
  key: string;
  text: string;
  style?: string;
  ref?: string;
  prompt_text?: string;
};

export type TtsJobResult = {
  /** Folder holding `<key>.wav` for every line that was spoken. */
  dir: string;
  /** Korean Whisper transcript per key (empty when the check was off or failed). */
  transcripts: Map<string, string>;
  status: number;
};

export function gpuAvailable() {
  return (
    spawnSync("gpu-run", ["status"], { stdio: "ignore", timeout: 20_000 })
      .status === 0
  );
}

function link(stage: string, rel: string, abs: string) {
  if (!existsSync(abs)) throw new Error(`missing ${abs}`);
  mkdirSync(dirname(join(stage, rel)), { recursive: true });
  symlinkSync(abs, join(stage, rel));
}

// Progress bars, per-line timings and library chatter; errors and the job's own messages still show.
const NOISE =
  /it\/s\]|s\/it\]|^#|%$|^\[(tts|whisper)\] (?!VoxCPM2 loaded)|Warning|warnings\.warn|WeightNorm|^Loading|^Loaded|^Running on|voxcpm_model_path|^\[worker\] \d+ files/;

/** Passes the job log through without the noise above. */
async function printLog(
  stream: ReadableStream<Uint8Array>,
  out: NodeJS.WriteStream,
) {
  const decoder = new TextDecoder();
  let pending = "";
  const flush = (line: string) => {
    const text = line.split("\r").at(-1)!.trim();
    if (!text || NOISE.test(text)) return;
    out.write(`  ${text}\n`);
  };
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    pending += decoder.decode(value, { stream: true });
    const lines = pending.split("\n");
    pending = lines.pop()!;
    lines.forEach(flush);
  }
  flush(pending);
}

/**
 * Speaks `lines` with VoxCPM2 on the PC. With `referenceWav` every line without its own `ref` clones that clip
 * (one timbre for the whole course). Results land in `outDir` (emptied first).
 */
export async function runTtsJob(input: {
  lines: TtsLine[];
  referenceWav?: string;
  /** More clips lines can name in `ref` (name -> local wav). */
  references?: Record<string, string>;
  cfg: number;
  steps: number;
  whisper: boolean;
  outDir: string;
}): Promise<TtsJobResult> {
  const job = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  // One stage folder per job, so jobs can run side by side.
  const stage = join(STAGE_ROOT, `stage-${job}`);
  mkdirSync(stage, { recursive: true });
  try {
    link(stage, "render/tts.py", join(HAKGYO_VIDEO, "render/tts.py"));
    link(stage, "render/whisper.py", join(HAKGYO_VIDEO, "render/whisper.py"));
    link(stage, "hangeul-mastery/pc-job.sh", join(HERE, "pc-job.sh"));
    const jobDir = join(stage, "hangeul-mastery", job);
    mkdirSync(jobDir, { recursive: true });
    if (input.referenceWav) {
      copyFileSync(input.referenceWav, join(jobDir, "voice-ref.wav"));
    }
    const references = input.references ?? {};
    for (const [name, path] of Object.entries(references)) {
      copyFileSync(path, join(jobDir, `${name}.wav`));
    }
    const lines = input.lines.map((line) =>
      line.ref && line.ref in references
        ? { ...line, ref: `hangeul-mastery/${job}/${line.ref}.wav` }
        : line,
    );
    writeFileSync(join(jobDir, "lines.json"), JSON.stringify(lines));

    const result = `hangeul-mastery/result-${job}.tgz`;
    const command = [
      "bash",
      "hangeul-mastery/pc-job.sh",
      job,
      String(input.cfg),
      String(input.steps),
      input.whisper ? "1" : "0",
    ].join(" ");
    const run = Bun.spawn(
      [
        "gpu-run",
        "--dir",
        stage,
        "--workspace",
        WORKSPACE,
        "--out",
        result,
        "--",
        command,
      ],
      { stdout: "pipe", stderr: "pipe" },
    );
    await Promise.all([
      printLog(run.stdout, process.stdout),
      printLog(run.stderr, process.stderr),
    ]);
    await run.exited;
    const archive = join(stage, result);
    if (!existsSync(archive)) {
      throw new Error(
        `the VoxCPM2 job did not finish (gpu-run exit ${run.exitCode}); its log is above`,
      );
    }
    rmSync(input.outDir, { recursive: true, force: true });
    mkdirSync(input.outDir, { recursive: true });
    const untar = spawnSync("tar", ["-xzf", archive, "-C", input.outDir], {
      stdio: "inherit",
    });
    if (untar.status !== 0) throw new Error("could not unpack the job results");
  } finally {
    rmSync(stage, { recursive: true, force: true });
  }

  const status = Number(
    readFileSync(join(input.outDir, "status"), "utf8").trim() || "1",
  );
  const transcripts = new Map<string, string>();
  const whisperFile = join(input.outDir, "whisper.json");
  if (existsSync(whisperFile)) {
    const parsed = JSON.parse(readFileSync(whisperFile, "utf8")) as Record<
      string,
      { text?: string }
    >;
    for (const [file, value] of Object.entries(parsed)) {
      transcripts.set(file.replace(/\.wav$/, ""), value.text ?? "");
    }
  }
  return { dir: input.outDir, transcripts, status };
}
