// The audio manifest (audio-manifest.json, committed): every Korean text the course speaks -> the clip made for
// it. It holds no database ids: a clip is identified by its R2 object key, which is content addressed
// (hangeul-mastery/audio/<sha256 prefix>.mp3), and each environment finds or creates its own Asset row with
// that objectKey (Asset.objectKey is unique). So one manifest serves the development and production databases.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { CourseContent } from "./content-types";
import { normalizeTerm } from "./ids";
import { collectPlaceholders } from "./placeholders";

const HERE = import.meta.dir;
export const MANIFEST_PATH = join(HERE, "audio-manifest.json");
export const AUDIO_OBJECT_PREFIX = "hangeul-mastery/audio/";

export type ManifestClip = {
  /** R2 object key, the same in every environment. */
  objectKey: string;
  bytes: number;
  durationMs: number;
  /** `voiceVersion()` of the settings the clip was made with. */
  voice: string;
  /** Which take (seed) was kept. */
  take: number;
  /** What Whisper heard (Korean), for review. */
  heard: string;
  /** Set when no take passed the checks; listen to these. */
  review?: string;
};

export type AudioManifest = {
  version: 1;
  voice: VoiceSettings;
  clips: Record<string, ManifestClip>;
};

export type VoiceSettings = {
  /** Reference clip, relative to this folder; every clip clones its timbre. */
  reference: string;
  referenceSha256: string;
  /** Exact words of the reference clip. */
  referenceText: string;
  /** The description the reference voice was designed from (kept for the record). */
  description: string;
  cfg: number;
  steps: number;
  /** Post-processing recipe; changing it changes the voice version. */
  processing: string;
};

/** Short hash of everything that shapes a clip; clips of another version are stale. */
export function voiceVersion(voice: VoiceSettings) {
  return createHash("sha256")
    .update(
      JSON.stringify([
        voice.referenceSha256,
        voice.referenceText,
        voice.cfg,
        voice.steps,
        voice.processing,
      ]),
    )
    .digest("hex")
    .slice(0, 10);
}

export function objectKeyFor(mp3: Uint8Array) {
  const sha = createHash("sha256").update(mp3).digest("hex");
  return `${AUDIO_OBJECT_PREFIX}${sha.slice(0, 24)}.mp3`;
}

export function readManifest(path = MANIFEST_PATH): AudioManifest | null {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")) as AudioManifest;
}

/** Writes the manifest with clips sorted by text, so diffs stay small. */
export function writeManifest(manifest: AudioManifest, path = MANIFEST_PATH) {
  const clips = Object.fromEntries(
    Object.entries(manifest.clips).sort(([a], [b]) =>
      a < b ? -1 : a > b ? 1 : 0,
    ),
  );
  writeFileSync(path, `${JSON.stringify({ ...manifest, clips }, null, 1)}\n`);
}

/** Every text the course speaks: audio placeholders in any content, then vocabulary terms. Normalized, deduped. */
export function collectCourseAudioTexts(content: CourseContent) {
  const texts = new Set<string>();
  for (const courseModule of content.modules) {
    for (const item of courseModule.items) {
      const values =
        item.type === "material"
          ? [item.blocks]
          : item.type === "assessment"
            ? [
                item.instructions,
                ...item.questions.flatMap((question) => [
                  question.prompt,
                  question.explanation,
                  ...question.options.map((option) => option.content),
                ]),
              ]
            : [];
      for (const text of collectPlaceholders(...values).audio) {
        const normalized = normalizeTerm(text);
        if (normalized) texts.add(normalized);
      }
      if (item.type === "vocabulary") {
        for (const entry of item.entries) {
          const term = normalizeTerm(entry.term);
          if (term) texts.add(term);
        }
      }
    }
  }
  return [...texts];
}
