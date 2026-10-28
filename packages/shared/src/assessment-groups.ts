import { contentAudioSources } from "./assessment-audio";

/**
 * Question groups and picture options (docs/eps-topik-simulation.md sections 4.5 and 5.7), shared
 * by web, mobile and the server.
 */

export type QuestionGroupContent = {
  id: string;
  instructions: unknown;
  stimulus: unknown;
};

const imageBlockTypes = new Set(["image", "assetImage"]);

function isEmptyParagraph(block: { type?: unknown; content?: unknown }) {
  if (block.type !== "paragraph") return false;
  const content = block.content;
  if (content === undefined || content === null || content === "") return true;
  if (typeof content === "string") return !content.trim();
  return (
    Array.isArray(content) &&
    content.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        "text" in item &&
        typeof item.text === "string" &&
        !item.text.trim(),
    )
  );
}

/** Whether rich content is only pictures (empty paragraphs aside), like EPS picture options. */
export function isImageOnlyContent(content: unknown) {
  if (!Array.isArray(content)) return false;
  let images = 0;
  for (const block of content) {
    if (!block || typeof block !== "object") return false;
    const typed = block as {
      type?: unknown;
      content?: unknown;
      children?: unknown;
    };
    if (Array.isArray(typed.children) && typed.children.length) return false;
    if (typeof typed.type === "string" && imageBlockTypes.has(typed.type)) {
      images += 1;
    } else if (!isEmptyParagraph(typed)) {
      return false;
    }
  }
  return images > 0;
}

/** Whether a question's options show as a 2×2 picture grid: two to four, all pictures. */
export function usesPictureGrid(options: ReadonlyArray<{ content: unknown }>) {
  return (
    options.length >= 2 &&
    options.length <= 4 &&
    options.every((option) => isImageOnlyContent(option.content))
  );
}

/**
 * The key a question's audio plays are counted under: its group when the group's stimulus has
 * audio (one count for the whole group), otherwise the question itself.
 */
export function audioKeysFor(
  questions: ReadonlyArray<{ id: string; groupId?: string | null }>,
  groups: ReadonlyArray<{ id: string; stimulus: unknown }>,
) {
  const withAudio = new Set(
    groups
      .filter((group) => contentAudioSources(group.stimulus).length > 0)
      .map(({ id }) => id),
  );
  return Object.fromEntries(
    questions.map((question) => [
      question.id,
      question.groupId && withAudio.has(question.groupId)
        ? question.groupId
        : question.id,
    ]),
  );
}

/**
 * Where each group sits among the questions as shown: the indexes of its first and last
 * question, for labels like "Soal 1–4".
 */
export function groupRanges(
  questions: ReadonlyArray<{ groupId?: string | null }>,
) {
  const ranges = new Map<string, { first: number; last: number }>();
  questions.forEach((question, index) => {
    if (!question.groupId) return;
    const range = ranges.get(question.groupId);
    if (range) range.last = index;
    else ranges.set(question.groupId, { first: index, last: index });
  });
  return ranges;
}

/**
 * Splits questions (in their stored order) into units that move together: a group's questions,
 * or one ungrouped question. Shuffling and copying work on units.
 */
export function questionUnits<Q extends { groupId?: string | null }>(
  questions: readonly Q[],
) {
  const units: Q[][] = [];
  for (const question of questions) {
    const last = units.at(-1);
    if (question.groupId && last?.[0]?.groupId === question.groupId) {
      last.push(question);
    } else {
      units.push([question]);
    }
  }
  return units;
}
