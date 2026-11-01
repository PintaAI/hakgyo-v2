/**
 * A vocabulary entry can have several meanings ("배" → perut, kapal, pir).
 * `meanings` is the source of truth. `definition` stays as a mirror holding
 * the meanings joined with `MEANING_SEPARATOR`, so search, progress content
 * hashes and clients that predate `meanings` keep working.
 */

export const MEANING_SEPARATOR = "; ";
export const MAX_VOCABULARY_MEANINGS = 20;
export const MAX_VOCABULARY_MEANING_LENGTH = 1000;

/** Trims, drops empty and repeated meanings while keeping their order. */
export function normalizeMeanings(meanings: readonly string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of meanings) {
    const meaning = raw.trim();
    const key = meaning.normalize("NFKC").toLowerCase();
    if (!meaning || seen.has(key)) continue;
    seen.add(key);
    result.push(meaning);
  }
  return result;
}

/** The single-string form, for compact UI and the legacy `definition`. */
export function joinMeanings(meanings: readonly string[]) {
  return normalizeMeanings(meanings).join(MEANING_SEPARATOR);
}

/**
 * Meanings as learners read them: separated by a middle dot rather than the
 * stored "; ", which looks like data. Display only; keep `joinMeanings` for
 * `definition`, search and progress hashes.
 */
export function displayMeanings(meanings: readonly string[]) {
  return normalizeMeanings(meanings).join(" · ");
}

/** Reads meanings typed into one field, separated by semicolons. */
export function splitMeanings(text: string) {
  return normalizeMeanings(text.split(";"));
}

/**
 * Meanings of an entry, falling back to the legacy `definition` for rows,
 * cached bundles and payloads written before `meanings` existed.
 */
export function entryMeanings(entry: {
  meanings?: readonly string[] | null;
  definition?: string | null;
}) {
  const meanings = normalizeMeanings(entry.meanings ?? []);
  if (meanings.length > 0) return meanings;
  const definition = entry.definition?.trim();
  return definition ? [definition] : [];
}

/** Columns to write for a set of meanings: the list and its mirror. */
export function vocabularyMeaningFields(meanings: readonly string[]) {
  const normalized = normalizeMeanings(meanings);
  return {
    meanings: normalized,
    definition: normalized.join(MEANING_SEPARATOR),
  };
}

/**
 * The answers one meaning accepts: the meaning as written, without notes in
 * brackets ("Itu (benda yang jauh)" → "itu"), and each side of a slash
 * ("Sdr / Sdr.i" → "sdr", "sdr.i"). Commas are kept: in a gloss such as
 * "begitu …, langsung" they belong to the one meaning.
 */
function acceptedAnswers(meaning: string) {
  const full = normalizeMeaningAnswer(meaning);
  const withoutNotes = normalizeMeaningAnswer(
    meaning.replace(/\([^()]*\)/gu, " "),
  );
  const accepted = new Set([full, withoutNotes]);
  for (const base of [full, withoutNotes]) {
    if (!base.includes("/")) continue;
    for (const side of base.split("/")) {
      const alternative = normalizeMeaningAnswer(side);
      if (alternative) accepted.add(alternative);
    }
  }
  accepted.delete("");
  return accepted;
}

/**
 * Whether an answer matches one of the meanings, ignoring case, spacing,
 * notes in brackets and the other side of a slash.
 */
export function matchesMeaning(answer: string, meanings: readonly string[]) {
  const normalized = normalizeMeaningAnswer(answer);
  if (!normalized) return false;
  return (
    meanings.some((meaning) => acceptedAnswers(meaning).has(normalized)) ||
    normalizeMeaningAnswer(joinMeanings(meanings)) === normalized
  );
}

function normalizeMeaningAnswer(answer: string) {
  return answer.normalize("NFKC").trim().replace(/\s+/gu, " ").toLowerCase();
}
