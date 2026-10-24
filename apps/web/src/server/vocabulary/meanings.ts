import {
  MAX_VOCABULARY_MEANING_LENGTH,
  MAX_VOCABULARY_MEANINGS,
  normalizeMeanings,
  vocabularyMeaningFields,
} from "@hakgyo/shared";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

/** Every meaning of a word, in order. Supersedes `definition`. */
export const vocabularyMeaningsInput = z
  .array(z.string().trim().max(MAX_VOCABULARY_MEANING_LENGTH))
  .max(MAX_VOCABULARY_MEANINGS);

/** Legacy single meaning, still accepted from older clients and agents. */
export const vocabularyDefinitionInput = z.string().trim().min(1).max(5000);

/**
 * Columns for the meanings sent by a caller: `meanings` wins, a lone
 * `definition` becomes the only meaning. Returns undefined when neither was
 * sent and throws when the meanings are all empty.
 */
export function resolveVocabularyMeanings(input: {
  meanings?: readonly string[];
  definition?: string;
}) {
  const meanings =
    input.meanings !== undefined
      ? normalizeMeanings(input.meanings)
      : input.definition !== undefined
        ? [input.definition]
        : undefined;
  if (meanings === undefined) return undefined;
  if (meanings.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Isi minimal satu arti.",
    });
  }
  return vocabularyMeaningFields(meanings);
}

export function requireVocabularyMeanings(input: {
  meanings?: readonly string[];
  definition?: string;
}) {
  const fields = resolveVocabularyMeanings(input);
  if (!fields) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Isi minimal satu arti.",
    });
  }
  return fields;
}
