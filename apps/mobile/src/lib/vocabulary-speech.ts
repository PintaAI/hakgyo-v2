import { matchesAnswer } from "@hakgyo/shared";

export type VocabularySpeechMode = "KR" | "ID";

const VOCABULARY_SPEECH_LANG: Record<VocabularySpeechMode, string> = {
  KR: "ko-KR",
  ID: "id-ID",
};

export function speechLangForMode(mode: VocabularySpeechMode): string {
  return VOCABULARY_SPEECH_LANG[mode];
}

/**
 * The first STT alternative that matches an expected answer, with the same
 * rules as typed answers (`matchesAnswer`: case, spacing, punctuation, notes
 * in brackets and either side of a slash do not matter). `expected` may list
 * several accepted answers, such as every meaning of a word. Returns the
 * matched transcript, or null when none match.
 */
export function matchSpeechAlternative(
  expected: string | readonly string[],
  transcripts: readonly string[],
): string | null {
  const written = typeof expected === "string" ? [expected] : expected;
  for (const candidate of transcripts) {
    if (matchesAnswer(candidate, written)) return candidate;
  }
  return null;
}
