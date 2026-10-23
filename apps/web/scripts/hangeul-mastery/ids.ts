// Stable database ids for the Hangeul Mastery course, derived from the content keys. Learner progress hangs on
// these ids, so never change a derivation once the course is in production.
import { createHash } from "node:crypto";

export const ID_PREFIX = "hm-";

const KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidKey(key: string) {
  return KEY_PATTERN.test(key);
}

export const moduleId = (moduleKey: string) => `${ID_PREFIX}${moduleKey}`;
export const itemId = (itemKey: string) => `${ID_PREFIX}${itemKey}-item`;
export const materialId = (itemKey: string) =>
  `${ID_PREFIX}${itemKey}-material`;
export const assessmentId = (itemKey: string) =>
  `${ID_PREFIX}${itemKey}-assessment`;
export const vocabularySetId = (itemKey: string) =>
  `${ID_PREFIX}${itemKey}-vocab`;
export const questionId = (itemKey: string, questionKey: string) =>
  `${ID_PREFIX}${itemKey}-q-${questionKey}`;

/** JSON with sorted object keys (Postgres jsonb does not keep key order either). */
export function canonicalJson(value: unknown): string {
  return (
    JSON.stringify(value, (_key, node: unknown) => {
      if (node && typeof node === "object" && !Array.isArray(node)) {
        return Object.fromEntries(
          Object.entries(node as Record<string, unknown>).sort(([a], [b]) =>
            a < b ? -1 : a > b ? 1 : 0,
          ),
        );
      }
      return node;
    }) ?? "null"
  );
}

/**
 * Options are keyed by a hash of their authored content (before placeholders are resolved, so the id is the same
 * in every environment). Reordering options keeps every row, and learners' past selections keep pointing at the
 * option they chose; editing an option's content makes a new option.
 */
export function optionId(question: string, content: unknown) {
  const normalized =
    typeof content === "string"
      ? normalizeTerm(content)
      : canonicalJson(content);
  const hash = createHash("sha256")
    .update(normalized)
    .digest("hex")
    .slice(0, 12);
  return `${question}-o-${hash}`;
}

/** Requirements are keyed by what they require, so reordering them keeps their rows. */
export const requirementId = (
  itemKey: string,
  type: "assessment" | "vocabulary",
  requiredKey: string,
) => `${ID_PREFIX}${itemKey}-req-${type}-${requiredKey}`;

/** The form a term is compared and hashed in: NFC, trimmed, inner whitespace collapsed. */
export function normalizeTerm(term: string) {
  return term.normalize("NFC").trim().replace(/\s+/g, " ");
}

/**
 * Entries are keyed by a hash of their term, so reordering a set keeps every entry (and its learners' progress);
 * a changed term is a new entry.
 */
export function entryId(itemKey: string, term: string) {
  const hash = createHash("sha256")
    .update(normalizeTerm(term))
    .digest("hex")
    .slice(0, 12);
  return `${ID_PREFIX}${itemKey}-e-${hash}`;
}

/**
 * Vocabulary entries are listed by createdAt, then id. Entry n of a set gets this base plus n milliseconds, so the
 * order matches the content.
 */
export const ENTRY_CREATED_AT_BASE = Date.UTC(2026, 0, 1);
export const entryCreatedAt = (index: number) =>
  new Date(ENTRY_CREATED_AT_BASE + index);
