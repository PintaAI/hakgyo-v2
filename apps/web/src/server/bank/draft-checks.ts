/**
 * Automated checks on drafted bank questions before review (docs/eps-question-generator.md section
 * 6). Pure functions; the draft service supplies the bank similarity and the blind answers. A flag
 * never blocks a draft, it tells the reviewer where to look.
 */

export type DraftFlagCode =
  | "LENGTH"
  | "DUPLICATE_OPTION"
  | "KEY_PATTERN"
  | "KEYWORDS"
  | "SIMILAR"
  | "BLIND_MISMATCH"
  | "BLIND_MISSING"
  | "AMBIGUOUS";

export type DraftFlag = { code: DraftFlagCode; message: string };

/** An existing bank question, as plain text (prompt and options). */
export type ExistingQuestion = { id: string; text: string };

/** The closest existing question and how close it is. */
export type SimilarMatch = ExistingQuestion & { similarity: number };

export type CheckableDraft = {
  prompt: string;
  options: readonly string[];
  key: number;
};

/** The longest option at most this many times the shortest (and a few characters apart). */
const MAX_LENGTH_RATIO = 2.5;
const MIN_LENGTH_GAP = 8;
/** Trigram similarity from which a draft counts as a near copy of a bank question. */
export const SIMILARITY_THRESHOLD = 0.6;

const visibleLength = (text: string) => text.replace(/\s+/g, "").length;

/** Options of clearly different lengths give the answer away. */
export function optionLengthFlag(options: readonly string[]): DraftFlag | null {
  const lengths = options.map(visibleLength);
  const shortest = Math.min(...lengths);
  const longest = Math.max(...lengths);
  if (
    shortest > 0 &&
    longest / shortest > MAX_LENGTH_RATIO &&
    longest - shortest >= MIN_LENGTH_GAP
  ) {
    return {
      code: "LENGTH",
      message: "Panjang pilihan jawaban terlalu berbeda.",
    };
  }
  return null;
}

export function duplicateOptionFlag(
  options: readonly string[],
): DraftFlag | null {
  const normalized = options.map((option) =>
    option.replace(/\s+/g, " ").trim(),
  );
  return new Set(normalized).size < normalized.length
    ? { code: "DUPLICATE_OPTION", message: "Ada pilihan jawaban yang sama." }
    : null;
}

/** A batch of three or more with every key in the same position. */
export function keyPatternFlag(
  drafts: readonly CheckableDraft[],
): DraftFlag | null {
  if (drafts.length < 3) return null;
  return new Set(drafts.map(({ key }) => key)).size === 1
    ? {
        code: "KEY_PATTERN",
        message: "Semua kunci di nomor pilihan yang sama.",
      }
    : null;
}

/** The writer was given keywords but used none of them. */
export function keywordFlag(
  keywords: readonly string[],
  draft: CheckableDraft,
): DraftFlag | null {
  const wanted = keywords.map((keyword) => keyword.trim()).filter(Boolean);
  if (!wanted.length) return null;
  const text = [draft.prompt, ...draft.options].join(" ");
  return wanted.some((keyword) => text.includes(keyword))
    ? null
    : { code: "KEYWORDS", message: "Tidak memakai kata kunci yang diminta." };
}

/** How much of the similar question's text the flag quotes. */
const SIMILAR_QUOTE_LENGTH = 40;

export function similarityFlag(match: SimilarMatch | null): DraftFlag | null {
  if (!match || match.similarity < SIMILARITY_THRESHOLD) return null;
  const text = match.text.replace(/\s+/g, " ").trim();
  const quote =
    text.length > SIMILAR_QUOTE_LENGTH
      ? `${text.slice(0, SIMILAR_QUOTE_LENGTH)}…`
      : text;
  return {
    code: "SIMILAR",
    message: `Mirip soal bank "${quote}" (${Math.round(match.similarity * 100)}%).`,
  };
}

/** A second model answered without the key: a different answer or several plausible ones. */
export function blindFlags(
  key: number,
  blind: { answer: number; plausible: readonly number[] } | null,
): DraftFlag[] {
  if (!blind) return [];
  const flags: DraftFlag[] = [];
  if (blind.answer !== key) {
    flags.push({
      code: "BLIND_MISMATCH",
      message: `Model pemeriksa memilih ${"①②③④"[blind.answer] ?? blind.answer + 1}, bukan kuncinya.`,
    });
  }
  if (new Set(blind.plausible).size > 1) {
    flags.push({
      code: "AMBIGUOUS",
      message: "Model pemeriksa menilai lebih dari satu pilihan masuk akal.",
    });
  }
  return flags;
}

/** Every check for one draft of a batch. */
export function checkDraft(input: {
  draft: CheckableDraft;
  batch: readonly CheckableDraft[];
  keywords: readonly string[];
  similar: SimilarMatch | null;
  blind: { answer: number; plausible: readonly number[] } | null;
}): DraftFlag[] {
  return [
    optionLengthFlag(input.draft.options),
    duplicateOptionFlag(input.draft.options),
    keyPatternFlag(input.batch),
    keywordFlag(input.keywords, input.draft),
    similarityFlag(input.similar),
    ...blindFlags(input.draft.key, input.blind),
  ].filter((flag): flag is DraftFlag => flag !== null);
}

export function trigrams(text: string) {
  const result = new Set<string>();
  for (const word of text.toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
    if (!word) continue;
    const padded = `  ${word} `;
    for (let index = 0; index + 3 <= padded.length; index += 1) {
      result.add(padded.slice(index, index + 3));
    }
  }
  return result;
}

/**
 * Trigram similarity as `pg_trgm` computes it (shared trigrams over all trigrams), on plain text,
 * since prompts are stored as BlockNote JSON.
 */
export function trigramSimilarity(left: string, right: string) {
  return trigramSetSimilarity(trigrams(left), trigrams(right));
}

/** {@link trigramSimilarity} on trigram sets built once with {@link trigrams}. */
export function trigramSetSimilarity(
  a: ReadonlySet<string>,
  b: ReadonlySet<string>,
) {
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const gram of a) if (b.has(gram)) shared += 1;
  return shared / (a.size + b.size - shared);
}

/** The most similar existing question, for the SIMILAR check. */
export function mostSimilar(
  text: string,
  existing: readonly ExistingQuestion[],
) {
  const grams = trigrams(text);
  let best: SimilarMatch | null = null;
  for (const entry of existing) {
    const similarity = trigramSetSimilarity(grams, trigrams(entry.text));
    if (!best || similarity > best.similarity) {
      best = { id: entry.id, text: entry.text, similarity };
    }
  }
  return best;
}
