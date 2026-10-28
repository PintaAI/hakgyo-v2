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
  | "AMBIGUOUS";

export type DraftFlag = { code: DraftFlagCode; message: string };

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

export function similarityFlag(
  match: { similarity: number; position: number } | null,
): DraftFlag | null {
  return match && match.similarity >= SIMILARITY_THRESHOLD
    ? {
        code: "SIMILAR",
        message: `Mirip soal bank no. ${match.position + 1} (${Math.round(match.similarity * 100)}%).`,
      }
    : null;
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
  similar: { similarity: number; position: number } | null;
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

function trigrams(text: string) {
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
  const a = trigrams(left);
  const b = trigrams(right);
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const gram of a) if (b.has(gram)) shared += 1;
  return shared / (a.size + b.size - shared);
}

/** The most similar existing question, for the SIMILAR check. */
export function mostSimilar(
  text: string,
  existing: ReadonlyArray<{ text: string; position: number }>,
) {
  let best: { similarity: number; position: number } | null = null;
  for (const entry of existing) {
    const similarity = trigramSimilarity(text, entry.text);
    if (!best || similarity > best.similarity) {
      best = { similarity, position: entry.position };
    }
  }
  return best;
}
