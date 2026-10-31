// Stable database and block ids for the Pola Bahasa curricula, derived from the keys in ./manifest.ts. Learner
// progress hangs on the row ids and material links point at the material ids, so never change a derivation (or a
// key) once the curricula are in production.
import { entryCreatedAt, optionId } from "../hangeul-mastery/ids";

export const ID_PREFIX = "pb-";

const KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidKey(key: string) {
  return KEY_PATTERN.test(key);
}

export const courseId = (courseKey: string) => `${ID_PREFIX}${courseKey}`;
/** One module per chapter (bab). */
export const moduleId = (babKey: string) => `${ID_PREFIX}${babKey}`;

export const materialId = (materialKey: string) =>
  `${ID_PREFIX}${materialKey}-material`;
export const materialItemId = (materialKey: string) =>
  `${ID_PREFIX}${materialKey}-item`;
/** Blocks of a material, numbered from 1 in document order (pre-order, children after their parent). */
export const blockId = (materialKey: string, index: number) =>
  `${ID_PREFIX}${materialKey}-b${index}`;

/** The chapter's vocabulary set and its VOCABULARY_SET course item. */
export const vocabularySetId = (babKey: string) =>
  `${ID_PREFIX}${babKey}-vocab`;
export const vocabularyItemId = (babKey: string) =>
  `${vocabularySetId(babKey)}-item`;
/** One entry per material of the chapter; keyed by the material, so editing its term keeps learners' progress. */
export const vocabularyEntryId = (babKey: string, materialKey: string) =>
  `${ID_PREFIX}${babKey}-v-${materialKey}`;
/** Entries are listed by createdAt, then id: entry n of a set gets a fixed base plus n milliseconds. */
export const vocabularyEntryCreatedAt = entryCreatedAt;

/** The chapter's quiz (assessment) and its ASSESSMENT course item, the last item of the chapter. */
export const quizId = (babKey: string) => `${ID_PREFIX}${babKey}-quiz`;
export const quizItemId = (babKey: string) => `${quizId(babKey)}-item`;
/** Learner answers hang on question ids, so a question key never changes once imported. */
export const quizQuestionId = (babKey: string, questionKey: string) =>
  `${quizId(babKey)}-q-${questionKey}`;
/**
 * Options are keyed by a hash of their text (as in Hangeul Mastery): reordering keeps every row and learners'
 * past selections; editing an option's text makes a new option.
 */
export const quizOptionId = (questionId: string, text: string) =>
  optionId(questionId, text);
