// Stable database and block ids for the Pola Bahasa curricula, derived from the keys in ./manifest.ts. Learner
// progress hangs on the row ids and material links point at the block ids, so never change a derivation (or a
// key) once the curricula are in production.
import { optionId } from "../hangeul-mastery/ids";

export const ID_PREFIX = "pb-";

const KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidKey(key: string) {
  return KEY_PATTERN.test(key);
}

export const courseId = (courseKey: string) => `${ID_PREFIX}${courseKey}`;
export const moduleId = (moduleKey: string) => `${ID_PREFIX}${moduleKey}`;
export const materialId = (materialKey: string) =>
  `${ID_PREFIX}${materialKey}-material`;
export const itemId = (materialKey: string) =>
  `${ID_PREFIX}${materialKey}-item`;

/** A material's quiz (assessment) and the ASSESSMENT course item placed right after the material's item. */
export const quizId = (materialKey: string) =>
  `${ID_PREFIX}${materialKey}-quiz`;
export const quizItemId = (materialKey: string) =>
  `${ID_PREFIX}${materialKey}-quiz-item`;
/** Learner answers hang on question ids, so a question key never changes once imported. */
export const quizQuestionId = (materialKey: string, questionKey: string) =>
  `${quizId(materialKey)}-q-${questionKey}`;
/**
 * Options are keyed by a hash of their text (as in Hangeul Mastery): reordering keeps every row and learners'
 * past selections; editing an option's text makes a new option.
 */
export const quizOptionId = (questionId: string, text: string) =>
  optionId(questionId, text);

/** The level-2 heading that opens a section; `hakgyo-material:<materialId>#<this>` links open here. */
export const sectionBlockId = (materialKey: string, sectionKey: string) =>
  `${ID_PREFIX}${materialKey}--${sectionKey}`;

/** Parts of a material that are not sections: the blocks before the first and after the last section. */
export const INTRO_PART = "intro";
export const OUTRO_PART = "outro";

/**
 * Every other block, numbered in document order within its part (the intro, a section or the outro), so editing
 * one section never renumbers the blocks of another.
 */
export const blockId = (materialKey: string, part: string, index: number) =>
  `${ID_PREFIX}${materialKey}--${part}-b${index}`;

/** Section keys that would collide with the derivations above. */
export function isReservedSectionKey(sectionKey: string) {
  return (
    sectionKey === INTRO_PART ||
    sectionKey === OUTRO_PART ||
    /-b\d+$/.test(sectionKey)
  );
}
