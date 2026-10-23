// Turning VoxCPM2 takes into course clips: measuring a take (speech length, silences), scoring it against the
// text (length for its syllables, what Whisper heard), and the ffmpeg chain that trims, levels and encodes the
// kept take as MP3. The scoring is pure and unit tested; the ffmpeg parts need ffmpeg on the PATH.
import { spawnSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Bump when the chain below changes: it is part of the voice version, so clips made before become stale. */
export const PROCESSING =
  "trim-45dB+loudness-16LUFS-tp-1.5+pad-60/150ms+mp3-48k-mono-80k";
const SILENCE_DB = -45;
const TARGET_LUFS = -16;
const MAX_TRUE_PEAK = -1.5;

export type TakeMeasure = {
  /** Whole file, seconds. */
  duration: number;
  /** Speech between the first and last sound, seconds. */
  speech: number;
  /** Silences of 120 ms or more inside the speech. */
  gaps: number;
};

export type TakeVerdict = {
  ok: boolean;
  /** Lower is better; used to pick among takes. */
  score: number;
  problems: string[];
};

const SINO_DIGITS: Record<string, string> = {
  "0": "영",
  "1": "일",
  "2": "이",
  "3": "삼",
  "4": "사",
  "5": "오",
  "6": "육",
  "7": "칠",
  "8": "팔",
  "9": "구",
};

/** Hangul syllables only; Whisper writes Sino-Korean homophones as digits (사 -> "4"), so those count too. */
export function hangulOnly(text: string) {
  return text
    .normalize("NFC")
    .replace(/[0-9]/g, (digit) => SINO_DIGITS[digit] ?? digit)
    .replace(/[^\uac00-\ud7a3]/g, "");
}

export const syllableCount = (text: string) => hangulOnly(text).length;

// Vowels that sound the same in modern Seoul speech (the course teaches them as spelling): ㅐ = ㅔ, ㅒ = ㅖ,
// ㅙ = ㅚ = ㅞ. Indices into the 21 medial vowels of a precomposed syllable.
const SAME_VOWEL: Record<number, number> = { 1: 5, 3: 7, 10: 15, 11: 15 };

/** What a text sounds like for the check: Hangul only, with the merged vowels folded together. */
export function soundKey(text: string) {
  return [...hangulOnly(text)]
    .map((syllable) => {
      const code = syllable.charCodeAt(0) - 0xac00;
      const initial = Math.floor(code / 588);
      const vowel = Math.floor((code % 588) / 28);
      const final = code % 28;
      return String.fromCharCode(
        0xac00 + initial * 588 + (SAME_VOWEL[vowel] ?? vowel) * 28 + final,
      );
    })
    .join("");
}

/** Plausible speech length for a text at the course's careful pace, seconds. */
export function expectedSpeech(text: string) {
  const n = Math.max(1, syllableCount(text));
  return { min: 0.15 + 0.1 * n, max: 0.55 + 0.35 * n, ideal: 0.2 + 0.25 * n };
}

/**
 * Judges one take. A take is ok when Whisper heard exactly the text, the speech length fits the syllable count
 * and short texts have no pause inside (a pause in a word is usually a stutter or an extra sound).
 */
export function judgeTake(
  text: string,
  measure: TakeMeasure,
  heard: string,
): TakeVerdict {
  const problems: string[] = [];
  const range = expectedSpeech(text);
  const n = syllableCount(text);
  const matched = soundKey(heard) === soundKey(text);
  if (!matched) problems.push(`heard "${heard.trim()}"`);
  if (measure.speech < range.min)
    problems.push(`short (${measure.speech.toFixed(2)} s)`);
  if (measure.speech > range.max)
    problems.push(`long (${measure.speech.toFixed(2)} s)`);
  const allowedGaps = n <= 3 ? 0 : Math.floor(n / 4);
  if (measure.gaps > allowedGaps)
    problems.push(`${measure.gaps} pause(s) inside`);
  const outside =
    measure.speech < range.min
      ? range.min - measure.speech
      : measure.speech > range.max
        ? measure.speech - range.max
        : 0;
  const score =
    (matched ? 0 : 10) +
    outside * 5 +
    Math.max(0, measure.gaps - allowedGaps) * 2 +
    Math.abs(measure.speech - range.ideal);
  return { ok: problems.length === 0, score, problems };
}

function run(args: string[]) {
  const result = spawnSync("ffmpeg", ["-hide_banner", "-nostats", ...args], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(
      `ffmpeg failed: ${result.stderr.split("\n").slice(-4).join(" ")}`,
    );
  }
  return result.stderr;
}

export function probeDuration(file: string) {
  const result = spawnSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file],
    { encoding: "utf8" },
  );
  return Number(result.stdout.trim());
}

/** Parses ffmpeg silencedetect output into a measure of the take. */
export function measureFromSilences(
  log: string,
  duration: number,
): TakeMeasure {
  const starts = [...log.matchAll(/silence_start: (-?[0-9.]+)/g)].map((m) =>
    Math.max(0, Number(m[1])),
  );
  const ends = [...log.matchAll(/silence_end: ([0-9.]+)/g)].map((m) =>
    Number(m[1]),
  );
  const silences = starts.map((start, index) => ({
    start,
    end: ends[index] ?? duration,
  }));
  if (!silences.length) return { duration, speech: duration, gaps: 0 };
  const edge = 0.02;
  const lead = silences[0]!.start <= edge ? silences[0]!.end : 0;
  const last = silences.at(-1)!;
  const tail = last.end >= duration - edge ? duration - last.start : 0;
  if (lead >= duration) return { duration, speech: 0, gaps: 0 };
  const inner = silences.filter(
    (silence) => silence.start > edge && silence.end < duration - edge,
  );
  return {
    duration,
    speech: Math.max(0, duration - lead - tail),
    gaps: inner.filter((silence) => silence.end - silence.start >= 0.12).length,
  };
}

export function measureTake(wav: string): TakeMeasure {
  const log = run([
    "-i",
    wav,
    "-af",
    `silencedetect=n=${SILENCE_DB}dB:d=0.08`,
    "-f",
    "null",
    "-",
  ]);
  return measureFromSilences(log, probeDuration(wav));
}

const TRIM = [
  `silenceremove=start_periods=1:start_threshold=${SILENCE_DB}dB:start_silence=0.03:detection=peak`,
  "areverse",
  `silenceremove=start_periods=1:start_threshold=${SILENCE_DB}dB:start_silence=0.06:detection=peak`,
  "areverse",
].join(",");

/** Trims, levels (-16 LUFS, true peak at most -1.5 dB), pads and encodes a take; returns the MP3 bytes. */
export function processTake(wav: string): { mp3: Buffer; durationMs: number } {
  const trimmed = join(
    tmpdir(),
    `hm-trim-${process.pid}-${Math.random().toString(36).slice(2)}.wav`,
  );
  const out = trimmed.replace(/\.wav$/, ".mp3");
  try {
    run(["-y", "-i", wav, "-af", TRIM, "-ac", "1", "-ar", "48000", trimmed]);
    // Integrated loudness gates below 400 ms, so short syllables fall back to their RMS level.
    const stats = run([
      "-i",
      trimmed,
      "-af",
      "ebur128=peak=true,astats=metadata=0",
      "-f",
      "null",
      "-",
    ]);
    const integrated = Number(
      /^\s+I:\s+(-?[0-9.]+) LUFS/m.exec(stats)?.[1] ?? NaN,
    );
    const truePeak = Number(
      /^\s+Peak:\s+(-?[0-9.]+) dBFS/m.exec(stats)?.[1] ?? NaN,
    );
    const rms = Number(/RMS level dB: (-?[0-9.]+)/.exec(stats)?.[1] ?? NaN);
    const level =
      Number.isFinite(integrated) && integrated > -60 ? integrated : rms;
    let gain = Number.isFinite(level) ? TARGET_LUFS - level : 0;
    if (Number.isFinite(truePeak))
      gain = Math.min(gain, MAX_TRUE_PEAK - truePeak);
    run([
      "-y",
      "-i",
      trimmed,
      "-af",
      [
        `volume=${gain.toFixed(2)}dB`,
        "afade=t=in:d=0.008",
        "areverse,afade=t=in:d=0.02,areverse",
        "adelay=60:all=1",
        "apad=pad_dur=0.15",
      ].join(","),
      "-ac",
      "1",
      "-ar",
      "48000",
      "-c:a",
      "libmp3lame",
      "-b:a",
      "80k",
      "-map_metadata",
      "-1",
      out,
    ]);
    return {
      mp3: readFileSync(out),
      durationMs: Math.round(probeDuration(out) * 1000),
    };
  } finally {
    rmSync(trimmed, { force: true });
    rmSync(out, { force: true });
  }
}
