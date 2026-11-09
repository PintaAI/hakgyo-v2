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
 * The keys one written answer (a meaning or a Korean term) accepts: the text
 * as written, without notes in brackets ("Panas (Cuaca)" → "panas",
 * "(건물) 앞" → "앞"), and each side of a slash, an equals sign or a middle
 * dot ("Sdr / Sdr.i" → "sdr", "sdri"; "30분=반" → "반"; "이야 · 응" → "응").
 * A comma does not split: in a gloss such as "begitu …, langsung" it belongs
 * to the one answer, and only the punctuation itself is ignored.
 */
function acceptedAnswers(written: string) {
  const accepted = new Set<string>();
  for (const base of [written, written.replace(/\([^()]*\)/gu, " ")]) {
    for (const key of answerKeys(base)) accepted.add(key);
    if (!/[/=·]/u.test(base)) continue;
    for (const side of base.split(/[/=·]/u)) {
      for (const key of answerKeys(side)) accepted.add(key);
    }
  }
  return accepted;
}

/**
 * Whether an answer matches one of the written answers, ignoring case,
 * spacing, punctuation, notes in brackets and the other side of a slash.
 */
export function matchesAnswer(answer: string, written: readonly string[]) {
  const keys = answerKeys(answer);
  if (keys.size === 0) return false;
  return written.some((item) => {
    const accepted = acceptedAnswers(item);
    for (const key of keys) if (accepted.has(key)) return true;
    return false;
  });
}

/**
 * Whether an answer matches one of the meanings (see `matchesAnswer`), or all
 * of them typed together.
 */
export function matchesMeaning(answer: string, meanings: readonly string[]) {
  return (
    matchesAnswer(answer, meanings) ||
    matchesAnswer(answer, [joinMeanings(meanings)])
  );
}

/**
 * Whether an answer matches a Korean term: "앞" or "건물 앞" for "(건물) 앞",
 * "여보세요" for "여보세요?". Spacing inside the term still counts.
 */
export function matchesTerm(answer: string, term: string) {
  return matchesAnswer(answer, [term]);
}

/**
 * Comparison keys of one answer. Punctuation a learner would not type
 * ("oh!", "1.000", "Sdr.i", "여보세요?") is dropped, brackets read as spaces,
 * "&" also reads as "dan", and a hyphen reads both as a space and as nothing
 * ("kupu-kupu", "K-팝").
 */
function answerKeys(text: string) {
  const base = text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[()[\]{}<>]/gu, " ")
    .replace(/[.,!?;:"'“”‘’…«»¡¿~]/gu, "");
  const keys = new Set<string>();
  for (const variant of [base, base.replace(/&/gu, " dan ")]) {
    const spaced = collapse(variant.replace(/[&\-‐‑–—]/gu, " "));
    const joined = collapse(
      variant.replace(/&/gu, " ").replace(/[-‐‑–—]/gu, ""),
    );
    if (spaced) keys.add(spaced);
    if (joined) keys.add(joined);
  }
  return keys;
}

function collapse(text: string) {
  return text.trim().replace(/\s+/gu, " ");
}

/** Punctuation to leave out of a typed answer; apostrophes and hyphens stay. */
const UNTYPED = /[^\p{L}\p{N}\p{M}\s'-]/gu;

/**
 * What a learner types for a written answer where the answer is checked
 * letter by letter (Hujan Kata), in the order to offer them: without notes
 * in brackets ("Panas (Cuaca)" → "Panas", "(건물) 앞" → "앞"), each side of a
 * slash, an equals sign or a middle dot ("Sdr / Sdr.i" → "Sdr", "Sdri"),
 * without punctuation ("여보세요?" → "여보세요"); then, so a note can still
 * be typed, the same with the note's words kept ("Panas Cuaca").
 */
export function typeableAnswers(written: string) {
  const answers: string[] = [];
  const add = (text: string) => {
    const typed = text.replace(UNTYPED, "").replace(/\s+/gu, " ").trim();
    if (
      typed &&
      !answers.some((answer) => answer.toLowerCase() === typed.toLowerCase())
    )
      answers.push(typed);
  };
  const sides = (text: string) =>
    /[/=·]/u.test(text) ? text.split(/[/=·]/u) : [text];
  for (const side of sides(written.replace(/\([^()]*\)/gu, " "))) add(side);
  for (const side of sides(written)) add(side);
  return answers;
}
