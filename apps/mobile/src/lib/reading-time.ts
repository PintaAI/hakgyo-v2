import { extractTextSegments } from "../search/text";

/**
 * How long a material takes to read, and how long a learner stays on it
 * before "next" unlocks (the reading guard), so lessons are not skipped
 * through without reading.
 *
 * Indonesian (and other Latin-script) text counts at 180 words a minute;
 * Korean at 120 syllables a minute, since the learners are still learning
 * to read it. Pictures, audio or video and tables add a few seconds each.
 */
const LATIN_WORDS_PER_MINUTE = 180;
const HANGUL_SYLLABLES_PER_MINUTE = 120;
const IMAGE_SECONDS = 5;
const AUDIO_SECONDS = 15;
const TABLE_SECONDS = 8;

/** The guard asks for half the estimate, within these bounds. */
const GUARD_SHARE = 0.5;
export const GUARD_MIN_SECONDS = 10;
export const GUARD_MAX_SECONDS = 180;

const HANGUL = /[가-힣]/g;

type MediaCount = { images: number; audio: number; tables: number };

function countMedia(value: unknown, count: MediaCount, depth: number) {
  if (depth > 24 || value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) countMedia(item, count, depth + 1);
    return;
  }
  const record = value as Record<string, unknown>;
  const type = typeof record.type === "string" ? record.type.toLowerCase() : "";
  if (type.includes("image")) count.images += 1;
  else if (/audio|video|youtube/.test(type)) count.audio += 1;
  else if (type === "table") count.tables += 1;
  for (const child of Object.values(record)) {
    countMedia(child, count, depth + 1);
  }
}

/** The estimated reading time of a material's content, in seconds. */
export function estimateReadingSeconds(content: unknown) {
  let latinWords = 0;
  let hangulSyllables = 0;
  for (const segment of extractTextSegments(content)) {
    hangulSyllables += segment.match(HANGUL)?.length ?? 0;
    latinWords += segment
      .replace(HANGUL, " ")
      .split(/\s+/)
      .filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
  }
  const media: MediaCount = { images: 0, audio: 0, tables: 0 };
  countMedia(content, media, 0);
  return (
    (latinWords / LATIN_WORDS_PER_MINUTE) * 60 +
    (hangulSyllables / HANGUL_SYLLABLES_PER_MINUTE) * 60 +
    media.images * IMAGE_SECONDS +
    media.audio * AUDIO_SECONDS +
    media.tables * TABLE_SECONDS
  );
}

/** Seconds a learner stays on a material before "next" unlocks. */
export function readingGuardSeconds(content: unknown) {
  const seconds = Math.round(estimateReadingSeconds(content) * GUARD_SHARE);
  return Math.min(GUARD_MAX_SECONDS, Math.max(GUARD_MIN_SECONDS, seconds));
}

/** "0:42" */
export function formatCountdown(seconds: number) {
  const whole = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}
