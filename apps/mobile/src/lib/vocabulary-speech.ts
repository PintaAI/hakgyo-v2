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
 * Returns the matched transcript, or null when none match.
 */
export function matchSpeechAlternative(
  expected: string,
  transcripts: readonly string[],
): string | null {
  const target = normalizeTranscript(expected);
  if (!target) return null;
  for (const candidate of transcripts) {
    if (normalizeTranscript(candidate) === target) return candidate;
  }
  return null;
}

export function isSpeechAnswerCorrect(
  expected: string,
  transcripts: readonly string[],
): boolean {
  return matchSpeechAlternative(expected, transcripts) !== null;
}
