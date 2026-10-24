export type VocabularySpeechMode = "KR" | "ID";

export const VOCABULARY_SPEECH_LANG: Record<VocabularySpeechMode, string> = {
  KR: "ko-KR",
  ID: "id-ID",
};

export function speechLangForMode(mode: VocabularySpeechMode): string {
  return VOCABULARY_SPEECH_LANG[mode];
}

function normalizeTranscript(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/gu, " ").toLowerCase();
}

/**
 * Exact match against any STT alternative (already agreed: exact + alternatives).
 * `expected` may list several accepted answers, such as every meaning of a
 * word. Returns the matched transcript, or null when none match.
 */
export function matchSpeechAlternative(
  expected: string | readonly string[],
  transcripts: readonly string[],
): string | null {
  const targets = new Set(
    (typeof expected === "string" ? [expected] : expected)
      .map(normalizeTranscript)
      .filter(Boolean),
  );
  if (targets.size === 0) return null;
  for (const candidate of transcripts) {
    if (targets.has(normalizeTranscript(candidate))) return candidate;
  }
  return null;
}

export function isSpeechAnswerCorrect(
  expected: string | readonly string[],
  transcripts: readonly string[],
): boolean {
  return matchSpeechAlternative(expected, transcripts) !== null;
}
