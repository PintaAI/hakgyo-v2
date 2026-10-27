import { z } from "zod";

import { roundScore } from "./assessment-score";

/**
 * Question tags: free strings, optionally `prefix:value`. Presets ship a vocabulary with
 * Indonesian labels (`eps:R2` → "Rambu K3"); reports group tags by prefix. See
 * `docs/eps-topik-simulation.md` section 4.6 and `docs/research/eps-topik-question-patterns.md`
 * section 2 for the EPS-TOPIK types.
 */
export const MAX_QUESTION_TAGS = 12;
export const MAX_TAG_LENGTH = 40;

export type TagGroupKey = "eps" | "topik" | "level" | "bab" | "other";

export const tagGroupLabels: Record<TagGroupKey, string> = {
  eps: "Tipe soal",
  topik: "Topik",
  level: "Tingkat kesulitan",
  bab: "Bab buku",
  other: "Label lain",
};

const tagGroupOrder: TagGroupKey[] = ["eps", "topik", "level", "bab", "other"];

export type EpsSection = "reading" | "listening";

export type TagDefinition = {
  tag: string;
  label: string;
  group: TagGroupKey;
  /** EPS-TOPIK types only: the section the type belongs to. */
  section?: EpsSection;
};

const epsTypes: Array<[string, string]> = [
  ["R1", "Gambar ke kata atau kalimat"],
  ["R2", "Rambu K3"],
  ["R3", "Lengkapi suku kata"],
  ["R4", "Tata bahasa bergaris bawah"],
  ["R5", "Materi praktis"],
  ["R6", "Relasi kata"],
  ["R7", "Grafik atau diagram"],
  ["R8", "Kalimat rumpang"],
  ["R9", "Definisi ke kata"],
  ["R10", "Topik bacaan"],
  ["R11", "Isi yang sama"],
  ["R12", "Detail dari teks"],
  ["R13", "Teks ke gambar"],
  ["L1", "Bunyi ke tulisan"],
  ["L2", "Kalimat ke gambar"],
  ["L3", "Dialog pendek ke gambar situasi"],
  ["L4", "Jawaban yang tepat"],
  ["L5", "Kalimat lanjutan"],
  ["L6", "Angka ke gambar"],
  ["L7", "Gambar dan pertanyaan lisan"],
  ["L8", "Dialog panjang: tujuan atau alasan"],
  ["L9", "Dialog panjang: isi yang sama"],
  ["L10", "Topik percakapan"],
  ["L11", "Tindakan selanjutnya"],
  ["L12", "Monolog"],
];

const topics: Array<[string, string]> = [
  ["k3", "K3 (keselamatan kerja)"],
  ["alat-kerja", "Alat dan mesin kerja"],
  ["lembaga", "Lembaga dan prosedur"],
  ["kehidupan", "Kehidupan di Korea"],
  ["budaya", "Budaya Korea"],
  ["angka", "Angka"],
  ["benda", "Benda sehari-hari"],
  ["tindakan-kerja", "Tindakan kerja"],
];

const levels: Array<[string, string]> = [
  ["mudah", "Mudah"],
  ["sedang", "Sedang"],
  ["sulit", "Sulit"],
];

/** The EPS-TOPIK preset vocabulary, in report order. `bab:<n>` is open-ended and not listed. */
export const epsTagVocabulary: TagDefinition[] = [
  ...epsTypes.map(([code, label]) => ({
    tag: `eps:${code}`,
    label: `${code} · ${label}`,
    group: "eps" as const,
    section: code.startsWith("R")
      ? ("reading" as const)
      : ("listening" as const),
  })),
  ...topics.map(([slug, label]) => ({
    tag: `topik:${slug}`,
    label,
    group: "topik" as const,
  })),
  ...levels.map(([slug, label]) => ({
    tag: `level:${slug}`,
    label,
    group: "level" as const,
  })),
];

const vocabularyByTag = new Map(
  epsTagVocabulary.map((entry) => [entry.tag, entry]),
);
const vocabularyOrder = new Map(
  epsTagVocabulary.map((entry, index) => [entry.tag, index]),
);

/**
 * Canonical spelling: trimmed, inner spaces collapsed, known prefixes in lower case, EPS type codes
 * in upper case (`EPS:r2` → `eps:R2`), topic and level values in lower case.
 */
export function normalizeTag(value: string) {
  const tag = value.trim().replace(/\s+/g, " ");
  const separator = tag.indexOf(":");
  if (separator <= 0) return tag;
  const prefix = tag.slice(0, separator).trim().toLowerCase();
  const rest = tag.slice(separator + 1).trim();
  if (prefix === "eps") return `eps:${rest.toUpperCase()}`;
  if (prefix === "topik" || prefix === "level")
    return `${prefix}:${rest.toLowerCase()}`;
  return `${prefix}:${rest}`;
}

const tagSchema = z
  .string()
  .transform(normalizeTag)
  .pipe(
    z
      .string()
      .min(1)
      .max(MAX_TAG_LENGTH)
      .refine((tag) => !/[,\n]/.test(tag), "Label tidak boleh berisi koma."),
  );

/** Zod schema for a question's tags: normalized, without duplicates, at most 12. */
export const questionTagsSchema = z
  .array(tagSchema)
  .transform((tags) => [...new Set(tags)])
  .pipe(z.array(z.string()).max(MAX_QUESTION_TAGS));

export function tagGroup(tag: string): TagGroupKey {
  const prefix = tag.slice(0, Math.max(0, tag.indexOf(":"))).toLowerCase();
  return prefix === "eps" ||
    prefix === "topik" ||
    prefix === "level" ||
    prefix === "bab"
    ? prefix
    : "other";
}

/** Indonesian label of a tag: the vocabulary label, "Bab 3" for `bab:3`, the tag itself otherwise. */
export function tagLabel(tag: string) {
  const known = vocabularyByTag.get(tag);
  if (known) return known.label;
  if (tagGroup(tag) === "bab") return `Bab ${tag.slice(4)}`;
  return tag;
}

/** Vocabulary order first (R1 before R10, Membaca before Mendengar), then alphabetical. */
export function compareTags(left: string, right: string) {
  const leftGroup = tagGroupOrder.indexOf(tagGroup(left));
  const rightGroup = tagGroupOrder.indexOf(tagGroup(right));
  if (leftGroup !== rightGroup) return leftGroup - rightGroup;
  const leftIndex = vocabularyOrder.get(left);
  const rightIndex = vocabularyOrder.get(right);
  if (leftIndex !== undefined && rightIndex !== undefined)
    return leftIndex - rightIndex;
  if (leftIndex !== undefined) return -1;
  if (rightIndex !== undefined) return 1;
  return left.localeCompare(right, "id", { numeric: true });
}

export function sortTags(tags: readonly string[]) {
  return [...tags].sort(compareTags);
}

export type TagResultRow = {
  tag: string;
  label: string;
  /** Questions that earned full points. */
  correct: number;
  total: number;
  earned: number;
  max: number;
};

export type TagResultGroup = {
  group: TagGroupKey;
  label: string;
  rows: TagResultRow[];
};

/**
 * Per-tag results of one graded attempt, grouped by prefix ("Rambu K3: 1 dari 2 benar"). Uses only
 * points and the scores of the answers, never the answer key, so it is safe for Tryouts. A question
 * counts as correct when it earned its full points.
 */
export function tagResults(
  questions: ReadonlyArray<{
    id: string;
    points: number;
    tags?: readonly string[] | null;
  }>,
  answers: ReadonlyArray<{
    questionId: string;
    autoScore?: number | null;
    manualScore?: number | null;
  }>,
): TagResultGroup[] {
  const earnedByQuestion = new Map(
    answers.map((answer) => [
      answer.questionId,
      answer.manualScore ?? answer.autoScore ?? 0,
    ]),
  );
  const rows = new Map<string, TagResultRow>();
  for (const question of questions) {
    const earned = earnedByQuestion.get(question.id) ?? 0;
    for (const tag of question.tags ?? []) {
      const row = rows.get(tag) ?? {
        tag,
        label: tagLabel(tag),
        correct: 0,
        total: 0,
        earned: 0,
        max: 0,
      };
      row.total += 1;
      if (question.points > 0 && earned + 1e-9 >= question.points)
        row.correct += 1;
      row.earned = roundScore(row.earned + earned);
      row.max = roundScore(row.max + question.points);
      rows.set(tag, row);
    }
  }
  return groupTagRows([...rows.values()]);
}

export function groupTagRows<Row extends { tag: string }>(rows: Row[]) {
  const groups = new Map<TagGroupKey, Row[]>();
  for (const row of [...rows].sort((left, right) =>
    compareTags(left.tag, right.tag),
  )) {
    const key = tagGroup(row.tag);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return tagGroupOrder.flatMap((group) => {
    const groupRows = groups.get(group);
    return groupRows
      ? [{ group, label: tagGroupLabels[group], rows: groupRows }]
      : [];
  });
}
